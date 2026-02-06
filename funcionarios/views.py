from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Subdireccion, Departamento, Unidad, Funcionario
from .serializers import (
    SubdireccionSerializer,
    DepartamentoSerializer,
    UnidadSerializer,
    FuncionarioSerializer,
    FuncionarioListSerializer
)


class SubdireccionViewSet(viewsets.ModelViewSet):
    """ViewSet para Subdirecciones"""
    queryset = Subdireccion.objects.all()
    serializer_class = SubdireccionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'piso']
    ordering = ['nombre']


class DepartamentoViewSet(viewsets.ModelViewSet):
    """ViewSet para Departamentos con filtro por subdirección"""
    queryset = Departamento.objects.select_related('subdireccion').all()
    serializer_class = DepartamentoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subdireccion', 'activo']
    search_fields = ['nombre', 'subdireccion__nombre']
    ordering_fields = ['nombre', 'subdireccion__nombre']
    ordering = ['subdireccion__nombre', 'nombre']


class UnidadViewSet(viewsets.ModelViewSet):
    """ViewSet para Unidades con filtro por departamento"""
    queryset = Unidad.objects.select_related('departamento', 'departamento__subdireccion').all()
    serializer_class = UnidadSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['departamento', 'departamento__subdireccion', 'activo']
    search_fields = ['nombre', 'departamento__nombre', 'departamento__subdireccion__nombre']
    ordering_fields = ['nombre', 'departamento__nombre']
    ordering = ['departamento__subdireccion__nombre', 'departamento__nombre', 'nombre']


class FuncionarioViewSet(viewsets.ModelViewSet):
    """ViewSet para Funcionarios con búsqueda y filtros avanzados"""
    queryset = Funcionario.objects.select_related(
        'subdireccion', 'departamento', 'unidad',
        'departamento__subdireccion', 'unidad__departamento'
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['subdireccion', 'departamento', 'unidad', 'estado']
    search_fields = ['nombre_funcionario', 'rut', 'anexo', 'numero_publico', 'cargo']
    ordering_fields = ['nombre_funcionario', 'rut', 'cargo', 'creado_en']
    ordering = ['nombre_funcionario']
    
    def get_serializer_class(self):
        """Usar serializer simplificado para listados"""
        if self.action == 'list':
            return FuncionarioListSerializer
        return FuncionarioSerializer
    
    def get_queryset(self):
        """Filtros adicionales por query params"""
        queryset = super().get_queryset()
        
        # Filtrar solo activos si se especifica
        activos = self.request.query_params.get('activos', None)
        if activos == 'true':
            queryset = queryset.filter(estado=True)
        elif activos == 'false':
            queryset = queryset.filter(estado=False)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def toggle_estado(self, request, pk=None):
        """Acción para activar/desactivar funcionario"""
        funcionario = self.get_object()
        funcionario.estado = not funcionario.estado
        funcionario.save()
        serializer = self.get_serializer(funcionario)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """Obtener estadísticas de funcionarios"""
        total = self.get_queryset().count()
        activos = self.get_queryset().filter(estado=True).count()
        inactivos = total - activos
        
        # Por subdirección
        por_subdireccion = {}
        subdirecciones = Subdireccion.objects.all()
        for sub in subdirecciones:
            por_subdireccion[sub.nombre] = sub.funcionarios.filter(estado=True).count()
        
        return Response({
            'total': total,
            'activos': activos,
            'inactivos': inactivos,
            'por_subdireccion': por_subdireccion
        })


class ControlAnexosViewSet(viewsets.ViewSet):
    """ViewSet para gestión centralizada de anexos telefónicos"""
    
    ANEXO_MIN = 400
    ANEXO_MAX = 600
    
    def list(self, request):
        """Obtener anexos disponibles y ocupados"""
        # Generar rango de anexos
        rango_anexos = list(range(self.ANEXO_MIN, self.ANEXO_MAX + 1))
        
        # Obtener funcionarios activos con anexo
        funcionarios_con_anexo = Funcionario.objects.filter(
            estado=True
        ).exclude(
            anexo__isnull=True
        ).exclude(
            anexo__exact=''
        ).select_related('subdireccion', 'departamento')
        
        # Filtro de búsqueda
        search = request.query_params.get('search', '')
        if search:
            funcionarios_con_anexo = funcionarios_con_anexo.filter(
                nombre_funcionario__icontains=search
            )
        
        # Procesar anexos ocupados
        anexos_ocupados = []
        anexos_ocupados_set = set()
        
        for func in funcionarios_con_anexo:
            if func.anexo.isdigit():
                numero = int(func.anexo)
                if self.ANEXO_MIN <= numero <= self.ANEXO_MAX:
                    anexos_ocupados.append({
                        'anexo': numero,
                        'funcionario': {
                            'id': func.id,
                            'nombre': func.nombre_funcionario,
                            'rut': func.rut,
                            'cargo': func.cargo or '',
                            'subdireccion': func.subdireccion.nombre if func.subdireccion else '',
                            'departamento': func.departamento.nombre if func.departamento else ''
                        }
                    })
                    anexos_ocupados_set.add(numero)
        
        # Ordenar por anexo
        anexos_ocupados.sort(key=lambda x: x['anexo'])
        
        # Calcular anexos disponibles
        anexos_disponibles = [num for num in rango_anexos if num not in anexos_ocupados_set]
        
        # Obtener funcionarios activos para el select
        funcionarios_activos = Funcionario.objects.filter(
            estado=True
        ).order_by('nombre_funcionario').values(
            'id', 'nombre_funcionario', 'rut', 'anexo'
        )
        
        return Response({
            'anexos_disponibles': anexos_disponibles,
            'anexos_ocupados': anexos_ocupados,
            'funcionarios_activos': list(funcionarios_activos),
            'anexo_min': self.ANEXO_MIN,
            'anexo_max': self.ANEXO_MAX
        })
    
    @action(detail=False, methods=['post'])
    def asignar(self, request):
        """Asignar anexo a un funcionario"""
        anexo = request.data.get('anexo')
        funcionario_id = request.data.get('funcionario_id')
        
        # Validar anexo
        if not anexo or not str(anexo).isdigit():
            return Response(
                {'error': 'Número de anexo inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        numero_anexo = int(anexo)
        if not (self.ANEXO_MIN <= numero_anexo <= self.ANEXO_MAX):
            return Response(
                {'error': f'El anexo debe estar entre {self.ANEXO_MIN} y {self.ANEXO_MAX}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar funcionario
        if not funcionario_id:
            return Response(
                {'error': 'Debes seleccionar un funcionario'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            funcionario = Funcionario.objects.get(pk=funcionario_id)
        except Funcionario.DoesNotExist:
            return Response(
                {'error': 'Funcionario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validar que el funcionario esté activo
        if not funcionario.estado:
            return Response(
                {'error': 'No puedes asignar anexos a funcionarios inactivos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que el anexo no esté ocupado por otro funcionario
        anexo_ocupado = Funcionario.objects.filter(
            anexo=str(numero_anexo)
        ).exclude(pk=funcionario.pk).first()
        
        if anexo_ocupado:
            return Response(
                {'error': f'El anexo {numero_anexo} ya está asignado a {anexo_ocupado.nombre_funcionario}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Asignar anexo
        funcionario.anexo = str(numero_anexo)
        funcionario.save()
        
        return Response({
            'success': True,
            'message': f'Anexo {numero_anexo} asignado a {funcionario.nombre_funcionario}'
        })
    
    @action(detail=False, methods=['post'])
    def liberar(self, request):
        """Liberar un anexo"""
        anexo = request.data.get('anexo')
        
        # Validar anexo
        if not anexo or not str(anexo).isdigit():
            return Response(
                {'error': 'Número de anexo inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        numero_anexo = int(anexo)
        
        # Buscar funcionario con ese anexo
        funcionarios = Funcionario.objects.filter(anexo=str(numero_anexo))
        
        if not funcionarios.exists():
            return Response(
                {'error': f'No hay ningún funcionario con el anexo {numero_anexo}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Liberar anexo
        count = 0
        for func in funcionarios:
            func.anexo = ''
            func.save()
            count += 1
        
        return Response({
            'success': True,
            'message': f'Anexo {numero_anexo} liberado ({count} funcionario(s) actualizado(s))'
        })
