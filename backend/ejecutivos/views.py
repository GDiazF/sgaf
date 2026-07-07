from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg, F, ExpressionWrapper, fields
from django.utils import timezone
from .models import AsignacionEjecutivo, GestionEstablecimiento, SubtareaGestion, HistorialGestion
from .serializers import AsignacionEjecutivoSerializer, GestionEstablecimientoSerializer, SubtareaGestionSerializer

class AsignacionEjecutivoViewSet(viewsets.ModelViewSet):
    queryset = AsignacionEjecutivo.objects.all().order_by('-fecha_asignacion')
    serializer_class = AsignacionEjecutivoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(asignado_por=self.request.user)

    @action(detail=False, methods=['get'])
    def mis_asignaciones(self, request):
        if not hasattr(request.user, 'funcionario_profile'):
            return Response([])
        asignaciones = self.get_queryset().filter(funcionario=request.user.funcionario_profile, vigente=True)
        serializer = self.get_serializer(asignaciones, many=True)
        return Response(serializer.data)

class GestionEstablecimientoViewSet(viewsets.ModelViewSet):
    queryset = GestionEstablecimiento.objects.all().order_by('-fecha_creacion')
    serializer_class = GestionEstablecimientoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = GestionEstablecimiento.objects.all().order_by('-fecha_creacion')
        establecimiento_id = self.request.query_params.get('establecimiento', None)
        if establecimiento_id:
            queryset = queryset.filter(establecimiento_id=establecimiento_id)
        return queryset

    def perform_create(self, serializer):
        gestion = serializer.save(creado_por=self.request.user)
        HistorialGestion.objects.create(
            gestion=gestion,
            usuario=self.request.user,
            accion="Creación de Gestión",
            detalles=f"Gestión creada con estado {gestion.estado}"
        )

    def perform_update(self, serializer):
        old_obj = self.get_object()
        gestion = serializer.save()
        cambios = []
        if old_obj.estado != gestion.estado:
            cambios.append(f"Estado: {old_obj.estado} -> {gestion.estado}")
        if old_obj.respuesta != gestion.respuesta:
            cambios.append("Se actualizó la respuesta")
        
        if cambios:
            HistorialGestion.objects.create(
                gestion=gestion,
                usuario=self.request.user,
                accion="Actualización de Gestión",
                detalles=", ".join(cambios)
            )

    @action(detail=False, methods=['get'])
    def mis_gestiones(self, request):
        if not hasattr(request.user, 'funcionario_profile'):
            return Response([])
        establecimiento_id = request.query_params.get('establecimiento')
        queryset = self.get_queryset().filter(ejecutivo=request.user.funcionario_profile)
        if establecimiento_id:
            queryset = queryset.filter(establecimiento_id=establecimiento_id)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def kpi_dashboard(self, request):
        queryset = self.get_queryset()
        
        # Filtros
        ejecutivo_id = request.query_params.get('ejecutivo_id')
        establecimiento_id = request.query_params.get('establecimiento_id')
        if ejecutivo_id:
            queryset = queryset.filter(ejecutivo_id=ejecutivo_id)
        if establecimiento_id:
            queryset = queryset.filter(establecimiento_id=establecimiento_id)

        # Totales
        total = queryset.count()
        pendientes = queryset.filter(estado='PENDIENTE').count()
        en_proceso = queryset.filter(estado='EN_PROCESO').count()
        cerradas = queryset.filter(estado='CERRADO').count()

        # Por Estado
        by_status = queryset.values('estado').annotate(count=Count('id'))

        # Por Establecimiento (Top 5)
        by_establecimiento = queryset.values(label=F('establecimiento__nombre')).annotate(value=Count('id')).order_by('-value')[:5]

        # Por Ejecutivo (Top 5)
        by_ejecutivo = queryset.values(label=F('ejecutivo__nombre_funcionario')).annotate(value=Count('id')).order_by('-value')[:5]

        # Por Unidad Requerida
        by_unidad = queryset.filter(unidades_requeridas__isnull=False).values(label=F('unidades_requeridas__nombre')).annotate(value=Count('id')).order_by('-value')[:5]

        # Carga Activa por Ejecutivo (Pendientes + En Proceso)
        carga_activa = queryset.filter(estado__in=['PENDIENTE', 'EN_PROCESO']).values(label=F('ejecutivo__nombre_funcionario')).annotate(value=Count('id')).order_by('-value')[:5]

        # Tiempo promedio de resolución y Tasa
        cerradas_qs = queryset.filter(estado='CERRADO')
        tasa_resolucion = round((cerradas / total * 100), 1) if total > 0 else 0
        
        # Calcular tiempo promedio en dias (python-side for cross-db compatibility)
        tiempos_dias = []
        for g in cerradas_qs:
            delta = g.fecha_actualizacion - g.fecha_creacion
            tiempos_dias.append(delta.total_seconds() / 86400) # days
        tiempo_promedio = round(sum(tiempos_dias) / len(tiempos_dias), 1) if tiempos_dias else 0

        # Tendencia de últimos 7 días
        from django.utils.timezone import now
        from datetime import timedelta
        tendencia = []
        today = now().date()
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_count = queryset.filter(fecha_creacion__date=day).count()
            tendencia.append({"label": day.strftime('%d/%m'), "value": day_count})

        return Response({
            'totales': {
                'total': total,
                'pendientes': pendientes,
                'en_proceso': en_proceso,
                'cerradas': cerradas
            },
            'by_status': by_status,
            'by_establecimiento': by_establecimiento,
            'by_ejecutivo': by_ejecutivo,
            'by_unidad': by_unidad,
            'carga_activa': carga_activa,
            'tasa_resolucion': tasa_resolucion,
            'tiempo_promedio': tiempo_promedio,
            'tendencia': tendencia
        })

class SubtareaGestionViewSet(viewsets.ModelViewSet):
    queryset = SubtareaGestion.objects.all()
    serializer_class = SubtareaGestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        old_obj = self.get_object()
        subtarea = serializer.save()
        if old_obj.completada != subtarea.completada:
            if subtarea.completada:
                subtarea.fecha_completada = timezone.now()
                subtarea.save()
            HistorialGestion.objects.create(
                gestion=subtarea.gestion,
                usuario=self.request.user,
                accion="Actualización de Subtarea",
                detalles=f"Subtarea '{subtarea.titulo}' marcada como {'Completada' if subtarea.completada else 'Pendiente'}"
            )
