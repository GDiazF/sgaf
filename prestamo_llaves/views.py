from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import Establecimiento, Solicitante, Llave, Prestamo
from .serializers import (
    EstablecimientoSerializer, 
    SolicitanteSerializer, 
    LlaveSerializer, 
    PrestamoSerializer
)

from establecimientos.views import EstablecimientoViewSet
from establecimientos.pagination import LargeResultsSetPagination

class SolicitanteViewSet(viewsets.ModelViewSet):
    queryset = Solicitante.objects.all()
    serializer_class = SolicitanteSerializer
    pagination_class = LargeResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering_fields = ['rut', 'nombre', 'apellido']
    search_fields = ['rut', 'nombre', 'apellido']

class LlaveViewSet(viewsets.ModelViewSet):
    queryset = Llave.objects.all()
    serializer_class = LlaveSerializer
    pagination_class = LargeResultsSetPagination
    filterset_fields = {
        'establecimiento': ['exact', 'in'],
    }
    ordering_fields = ['nombre', 'establecimiento__nombre']
    search_fields = ['nombre', 'establecimiento__nombre']

    def get_queryset(self):
        queryset = super().get_queryset()
        disponible = self.request.query_params.get('disponible')
        if disponible is not None:
            # Keys with no active loans (return date is null) are considered available
            active_loans = Prestamo.objects.filter(fecha_devolucion__isnull=True).values_list('llave_id', flat=True)
            if disponible.lower() == 'true':
                queryset = queryset.exclude(id__in=active_loans)
            elif disponible.lower() == 'false':
                queryset = queryset.filter(id__in=active_loans)
        return queryset

class PrestamoViewSet(viewsets.ModelViewSet):
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'llave': ['exact'],
        'solicitante': ['exact'],
        'fecha_prestamo': ['date', 'gte', 'lte'],
        'fecha_devolucion': ['isnull']
    }
    ordering_fields = ['fecha_prestamo', 'fecha_devolucion', 'llave__nombre', 'solicitante__nombre']
    search_fields = [
        'llave__nombre', 
        'llave__establecimiento__nombre', 
        'solicitante__nombre', 
        'solicitante__apellido', 
        'solicitante__rut'
    ]

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get('active')
        if active == 'true':
            return qs.filter(fecha_devolucion__isnull=True)
        return qs

    def create(self, request, *args, **kwargs):
        llaves_ids = request.data.get('llaves', [])
        
        # If single key (legacy support or direct usage), use standard behavior but wrap in list
        if not llaves_ids and 'llave' in request.data:
            llaves_ids = [request.data['llave']]
            
        if not llaves_ids:
             return Response({'error': 'Debe seleccionar al menos una llave'}, status=status.HTTP_400_BAD_REQUEST)

        solicitante_id = request.data.get('solicitante')
        funcionario_id = request.data.get('funcionario') # New: if linked to a staff
        observacion = request.data.get('observacion', '')
        
        # Logic to handle Funcionario automatic linking
        if funcionario_id and not solicitante_id:
            from funcionarios.models import Funcionario
            try:
                # Find or create Solicitante for this funcionario
                funcionario = Funcionario.objects.get(id=funcionario_id)
                solicitante, created = Solicitante.objects.get_or_create(
                    funcionario=funcionario,
                    defaults={
                        'rut': funcionario.rut,
                        'nombre': funcionario.nombre_funcionario.split(' ')[0], # Basic split
                        'apellido': ' '.join(funcionario.nombre_funcionario.split(' ')[1:]),
                    }
                )
                solicitante_id = solicitante.id
            except Funcionario.DoesNotExist:
                return Response({'error': 'Funcionario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        created_prestamos = []
        
        # Validate all keys are available first (Optional, but good practice)
        # For this MVP, we will try to create them and fail if one is already borrowed? 
        # Or better: Create loop.
        
        try:
            for llave_id in llaves_ids:
                data = {
                    'llave': llave_id,
                    'solicitante': solicitante_id,
                    'observacion': observacion,
                    # 'usuario_entrega': request.user.id # Uncomment if auth is active
                }
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                self.perform_create(serializer)
                created_prestamos.append(serializer.data)
                
            return Response(created_prestamos, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def _get_or_create_director_solicitante(self, establecimiento_id):
        from establecimientos.models import Establecimiento
        try:
            est = Establecimiento.objects.get(id=establecimiento_id)
            virtual_rut = f"DIR-{est.id}" # Simplified identification
            solicitante, created = Solicitante.objects.get_or_create(
                rut=virtual_rut,
                defaults={
                    'nombre': 'Director',
                    'apellido': est.nombre,
                    'email': est.email or ''
                }
            )
            return solicitante
        except Establecimiento.DoesNotExist:
            return None

    @action(detail=False, methods=['post'])
    def traspasar(self, request):
        llaves_ids = request.data.get('llaves', [])
        nuevo_solicitante_id = request.data.get('solicitante')
        nuevo_funcionario_id = request.data.get('funcionario')
        director_est_id = request.data.get('director_establecimiento_id')
        observacion = request.data.get('observacion', 'Traspaso de llaves')

        if not llaves_ids:
            return Response({'error': 'Debe seleccionar llaves para traspasar'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine destination solicitante
        dest_solicitante_id = nuevo_solicitante_id
        
        if director_est_id:
            solicitante = self._get_or_create_director_solicitante(director_est_id)
            if not solicitante:
                return Response({'error': 'Establecimiento no encontrado'}, status=status.HTTP_404_NOT_FOUND)
            dest_solicitante_id = solicitante.id
        elif nuevo_funcionario_id:
            from funcionarios.models import Funcionario
            try:
                func = Funcionario.objects.get(id=nuevo_funcionario_id)
                solicitante, _ = Solicitante.objects.get_or_create(
                    funcionario=func,
                    defaults={
                        'rut': func.rut,
                        'nombre': func.nombre_funcionario.split(' ')[0],
                        'apellido': ' '.join(func.nombre_funcionario.split(' ')[1:]),
                    }
                )
                dest_solicitante_id = solicitante.id
            except Funcionario.DoesNotExist:
                return Response({'error': 'Funcionario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not dest_solicitante_id:
            return Response({'error': 'Debe seleccionar un destino para el traspaso'}, status=status.HTTP_400_BAD_REQUEST)

        dest_solicitante = Solicitante.objects.get(id=dest_solicitante_id)
        now = timezone.now()
        results = []

        try:
            for lid in llaves_ids:
                # 1. Close current active loan
                active_loan = Prestamo.objects.filter(llave_id=lid, fecha_devolucion__isnull=True).first()
                if active_loan:
                    active_loan.fecha_devolucion = now
                    active_loan.observacion += f" | Traspasado a {dest_solicitante.nombre} {dest_solicitante.apellido}"
                    active_loan.save()

                # 2. Create new loan
                new_loan = Prestamo.objects.create(
                    llave_id=lid,
                    solicitante_id=dest_solicitante_id,
                    observacion=f"Recibida por traspaso. {observacion}",
                    # usuario_entrega=request.user # Uncomment if auth
                )
                results.append(self.get_serializer(new_loan).data)

            return Response(results, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def devolver(self, request, pk=None):
        prestamo = self.get_object()
        if prestamo.fecha_devolucion:
            return Response({'error': 'Llave ya devuelta'}, status=status.HTTP_400_BAD_REQUEST)
        
        prestamo.fecha_devolucion = timezone.now()
        # prestamo.usuario_recepcion = request.user # If using auth
        prestamo.save()
        serializer = self.get_serializer(prestamo)
        return Response(serializer.data)
