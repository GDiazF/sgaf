import csv

from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Avg, F, ExpressionWrapper, fields
from django.utils import timezone
from .models import AsignacionEjecutivo, GestionEstablecimiento, SubtareaGestion, HistorialGestion
from .serializers import AsignacionEjecutivoSerializer, GestionEstablecimientoSerializer, SubtareaGestionSerializer


def _preview(value, empty='Sin dato'):
    if value in (None, ''):
        return empty
    text = str(value).replace('\n', ' ').strip()
    return f"{text[:117]}..." if len(text) > 120 else text


def _format_relation_names(values):
    return ', '.join(values) if values else 'Sin datos'


def _m2m_names(instance, relation_name):
    return list(
        getattr(instance, relation_name)
        .order_by('nombre')
        .values_list('nombre', flat=True)
    )


def _append_change(changes, label, before, after):
    if before != after:
        changes.append(f"{label}: {_preview(before)} -> {_preview(after)}")


def _append_m2m_change(changes, label, before, after):
    if before == after:
        return
    added = sorted(set(after) - set(before))
    removed = sorted(set(before) - set(after))
    parts = []
    if added:
        parts.append(f"agregados: {_format_relation_names(added)}")
    if removed:
        parts.append(f"quitados: {_format_relation_names(removed)}")
    changes.append(f"{label}: {'; '.join(parts)}")


def _calculate_response_days(gestion):
    delta = timezone.now() - gestion.fecha_creacion
    return max(0, delta.days)

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
        if gestion.estado in ('RESPONDIDO', 'CERRADO'):
            gestion.tiempo_gestion_dias = _calculate_response_days(gestion)
            gestion.save(update_fields=['tiempo_gestion_dias'])
        estado_labels = dict(GestionEstablecimiento.ESTADO_CHOICES)
        HistorialGestion.objects.create(
            gestion=gestion,
            usuario=self.request.user,
            accion="Creación de Gestión",
            detalles=(
                f"Gestión creada con estado {estado_labels.get(gestion.estado, gestion.estado)}; "
                f"establecimiento: {_preview(gestion.establecimiento.nombre)}; "
                f"ejecutivo: {_preview(gestion.ejecutivo.nombre_funcionario)}; "
                f"requerimiento: {_preview(gestion.requerimiento)}"
            )
        )

    def perform_update(self, serializer):
        old_obj = self.get_object()
        estado_labels = dict(GestionEstablecimiento.ESTADO_CHOICES)
        before = {
            'establecimiento': old_obj.establecimiento.nombre if old_obj.establecimiento else '',
            'ejecutivo': old_obj.ejecutivo.nombre_funcionario if old_obj.ejecutivo else '',
            'requerimiento': old_obj.requerimiento,
            'descripcion': old_obj.descripcion,
            'estado': estado_labels.get(old_obj.estado, old_obj.estado),
            'respuesta': old_obj.respuesta,
            'observaciones': old_obj.observaciones,
            'tiempo_gestion_dias': old_obj.tiempo_gestion_dias,
            'subdirecciones': _m2m_names(old_obj, 'subdirecciones_requeridas'),
            'departamentos': _m2m_names(old_obj, 'departamentos_requeridos'),
            'unidades': _m2m_names(old_obj, 'unidades_requeridas'),
        }

        gestion = serializer.save()
        if gestion.estado in ('RESPONDIDO', 'CERRADO') and not gestion.tiempo_gestion_dias:
            gestion.tiempo_gestion_dias = _calculate_response_days(gestion)
            gestion.save(update_fields=['tiempo_gestion_dias'])
        cambios = []
        after = {
            'establecimiento': gestion.establecimiento.nombre if gestion.establecimiento else '',
            'ejecutivo': gestion.ejecutivo.nombre_funcionario if gestion.ejecutivo else '',
            'requerimiento': gestion.requerimiento,
            'descripcion': gestion.descripcion,
            'estado': estado_labels.get(gestion.estado, gestion.estado),
            'respuesta': gestion.respuesta,
            'observaciones': gestion.observaciones,
            'tiempo_gestion_dias': gestion.tiempo_gestion_dias,
            'subdirecciones': _m2m_names(gestion, 'subdirecciones_requeridas'),
            'departamentos': _m2m_names(gestion, 'departamentos_requeridos'),
            'unidades': _m2m_names(gestion, 'unidades_requeridas'),
        }

        _append_change(cambios, 'Establecimiento', before['establecimiento'], after['establecimiento'])
        _append_change(cambios, 'Ejecutivo', before['ejecutivo'], after['ejecutivo'])
        _append_change(cambios, 'Requerimiento', before['requerimiento'], after['requerimiento'])
        _append_change(cambios, 'Descripción', before['descripcion'], after['descripcion'])
        _append_change(cambios, 'Estado', before['estado'], after['estado'])
        _append_change(cambios, 'Respuesta', before['respuesta'], after['respuesta'])
        _append_change(cambios, 'Observaciones', before['observaciones'], after['observaciones'])
        _append_change(cambios, 'Tiempo de gestión (días)', before['tiempo_gestion_dias'], after['tiempo_gestion_dias'])
        _append_m2m_change(cambios, 'Subdirecciones requeridas', before['subdirecciones'], after['subdirecciones'])
        _append_m2m_change(cambios, 'Departamentos requeridos', before['departamentos'], after['departamentos'])
        _append_m2m_change(cambios, 'Unidades requeridas', before['unidades'], after['unidades'])
        
        if cambios:
            HistorialGestion.objects.create(
                gestion=gestion,
                usuario=self.request.user,
                accion="Actualización de Gestión",
                detalles=", ".join(cambios)
            )

    def _get_kpi_queryset(self, request):
        queryset = self.get_queryset()
        ejecutivo_id = request.query_params.get('ejecutivo_id')
        establecimiento_id = request.query_params.get('establecimiento_id')
        if ejecutivo_id:
            queryset = queryset.filter(ejecutivo_id=ejecutivo_id)
        if establecimiento_id:
            queryset = queryset.filter(establecimiento_id=establecimiento_id)
        return queryset

    def _build_kpi_data(self, queryset):
        queryset = queryset.order_by()
        total = queryset.count()
        pendientes = queryset.filter(estado='PENDIENTE').count()
        en_proceso = queryset.filter(estado='EN_PROCESO').count()
        cerradas = queryset.filter(estado='CERRADO').count()

        by_status = list(queryset.values('estado').annotate(count=Count('id')))
        estado_labels = dict(GestionEstablecimiento.ESTADO_CHOICES)
        for item in by_status:
            item['label'] = estado_labels.get(item['estado'], item['estado'])

        by_establecimiento = list(
            queryset.values(label=F('establecimiento__nombre'))
            .annotate(value=Count('id'))
            .order_by('-value')[:5]
        )
        by_ejecutivo = list(
            queryset.values(label=F('ejecutivo__nombre_funcionario'))
            .annotate(value=Count('id'))
            .order_by('-value')[:5]
        )
        by_unidad = list(
            queryset.filter(unidades_requeridas__isnull=False)
            .values(label=F('unidades_requeridas__nombre'))
            .annotate(value=Count('id'))
            .order_by('-value')[:5]
        )
        carga_activa = list(
            queryset.filter(estado__in=['PENDIENTE', 'EN_PROCESO'])
            .values(label=F('ejecutivo__nombre_funcionario'))
            .annotate(value=Count('id'))
            .order_by('-value')[:5]
        )

        cerradas_qs = queryset.filter(estado='CERRADO')
        tasa_resolucion = round((cerradas / total * 100), 1) if total > 0 else 0
        tiempos_dias = []
        for g in cerradas_qs:
            delta = g.fecha_actualizacion - g.fecha_creacion
            tiempos_dias.append(delta.total_seconds() / 86400)
        tiempo_promedio = round(sum(tiempos_dias) / len(tiempos_dias), 1) if tiempos_dias else 0

        from django.utils.timezone import now
        from datetime import timedelta
        tendencia = []
        today = now().date()
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_count = queryset.filter(fecha_creacion__date=day).count()
            tendencia.append({"label": day.strftime('%d/%m'), "value": day_count})

        return {
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
        }

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
        return Response(self._build_kpi_data(self._get_kpi_queryset(request)))

    @action(detail=False, methods=['get'])
    def exportar_metricas(self, request):
        stats = self._build_kpi_data(self._get_kpi_queryset(request))
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="metricas_ejecutivos.csv"'
        response.write('\ufeff')

        writer = csv.writer(response, delimiter=';')
        writer.writerow(['Sección', 'Indicador', 'Valor'])
        writer.writerow(['Resumen', 'Total', stats['totales']['total']])
        writer.writerow(['Resumen', 'Pendientes', stats['totales']['pendientes']])
        writer.writerow(['Resumen', 'En proceso', stats['totales']['en_proceso']])
        writer.writerow(['Resumen', 'Cerradas', stats['totales']['cerradas']])
        writer.writerow(['Resumen', 'Tasa de resolución (%)', stats['tasa_resolucion']])
        writer.writerow(['Resumen', 'Tiempo promedio de cierre (días)', stats['tiempo_promedio']])
        writer.writerow([])

        sections = [
            ('Por estado', stats['by_status'], 'count'),
            ('Top establecimientos demandantes', stats['by_establecimiento'], 'value'),
            ('Top ejecutivos', stats['by_ejecutivo'], 'value'),
            ('Top unidades requeridas', stats['by_unidad'], 'value'),
            ('Carga activa por ejecutivo', stats['carga_activa'], 'value'),
            ('Tendencia últimos 7 días', stats['tendencia'], 'value'),
        ]
        for section_name, rows, value_key in sections:
            writer.writerow([section_name, 'Indicador', 'Valor'])
            for row in rows:
                writer.writerow([section_name, row.get('label') or row.get('estado') or 'Sin dato', row.get(value_key, 0)])
            writer.writerow([])

        return response

class SubtareaGestionViewSet(viewsets.ModelViewSet):
    queryset = SubtareaGestion.objects.all()
    serializer_class = SubtareaGestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        subtarea = serializer.save()
        HistorialGestion.objects.create(
            gestion=subtarea.gestion,
            usuario=self.request.user,
            accion="Creación de Paso",
            detalles=(
                f"Paso '{_preview(subtarea.titulo)}' agregado con estado "
                f"{'Completado' if subtarea.completada else 'Pendiente'}"
            )
        )

    def perform_update(self, serializer):
        old_obj = self.get_object()
        old_titulo = old_obj.titulo
        old_completada = old_obj.completada
        subtarea = serializer.save()
        cambios = []

        _append_change(cambios, 'Título del paso', old_titulo, subtarea.titulo)
        if old_completada != subtarea.completada:
            if subtarea.completada:
                subtarea.fecha_completada = timezone.now()
                subtarea.save()
            cambios.append(
                f"Estado del paso '{_preview(subtarea.titulo)}': "
                f"{'Completado' if old_completada else 'Pendiente'} -> "
                f"{'Completado' if subtarea.completada else 'Pendiente'}"
            )

        if cambios:
            HistorialGestion.objects.create(
                gestion=subtarea.gestion,
                usuario=self.request.user,
                accion="Actualización de Paso",
                detalles="; ".join(cambios)
            )

    def perform_destroy(self, instance):
        HistorialGestion.objects.create(
            gestion=instance.gestion,
            usuario=self.request.user,
            accion="Eliminación de Paso",
            detalles=f"Paso '{_preview(instance.titulo)}' eliminado"
        )
        instance.delete()
