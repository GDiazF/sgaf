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

class SolicitanteViewSet(viewsets.ModelViewSet):
    queryset = Solicitante.objects.all()
    serializer_class = SolicitanteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['rut', 'nombre', 'apellido']

class LlaveViewSet(viewsets.ModelViewSet):
    queryset = Llave.objects.all()
    serializer_class = LlaveSerializer
    filterset_fields = ['establecimiento']
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['nombre', 'establecimiento__nombre']

class PrestamoViewSet(viewsets.ModelViewSet):
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer
    filterset_fields = ['llave', 'solicitante']

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
        observacion = request.data.get('observacion', '')
        
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
