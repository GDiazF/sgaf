from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Count, F
from solicitudes_reservas.models import SolicitudReserva

from .models import DashboardMetric

class InsightsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def reservations_ranking(self, request):
        """
        Retorna el ranking de reservas agrupado por jerarquía organizacional.
        """
        resource_type = request.query_params.get('type', None)
        recurso_id = request.query_params.get('recurso_id', None)
        subdireccion_id = request.query_params.get('subdireccion_id', None)
        departamento_id = request.query_params.get('departamento_id', None)
        unidad_id = request.query_params.get('unidad_id', None)
        
        # Base de la consulta
        queryset = SolicitudReserva.objects.filter(estado__in=['APROBADA', 'FINALIZADA'])
        
        # Filtros de Recurso
        if recurso_id:
            queryset = queryset.filter(recurso_id=recurso_id)
        elif resource_type:
            queryset = queryset.filter(recurso__tipo=resource_type)

        # Filtros de Jerarquía
        if unidad_id:
            queryset = queryset.filter(solicitante__funcionario_profile__unidad_id=unidad_id)
        elif departamento_id:
            queryset = queryset.filter(solicitante__funcionario_profile__departamento_id=departamento_id)
        elif subdireccion_id:
            queryset = queryset.filter(solicitante__funcionario_profile__subdireccion_id=subdireccion_id)



        # Lógica de Agrupación Dinámica (Drill-Down)
        if unidad_id:
            # Si hay unidad, el ranking es por Funcionarios
            ranking = queryset.values(
                label=F('solicitante__funcionario_profile__nombre_funcionario')
            ).annotate(value=Count('id')).order_by('-value')
            title = "Ranking de Funcionarios"
        elif departamento_id:
            # Si hay depto, el ranking es por Unidades
            ranking = queryset.values(
                label=F('solicitante__funcionario_profile__unidad__nombre')
            ).annotate(value=Count('id')).order_by('-value')
            title = "Detalle por Unidades"
        elif subdireccion_id:
            # Si hay subdirección, el ranking es por Departamentos
            ranking = queryset.values(
                label=F('solicitante__funcionario_profile__departamento__nombre')
            ).annotate(value=Count('id')).order_by('-value')
            title = "Detalle por Departamentos"
        else:
            # Por defecto: Ranking de Subdirecciones
            ranking = queryset.values(
                label=F('solicitante__funcionario_profile__subdireccion__nombre')
            ).annotate(value=Count('id')).order_by('-value')
            title = "Resumen por Subdirección"

        return Response({
            'main_ranking': [item for item in ranking if item['label']],
            'title': title
        })


    @action(detail=False, methods=['get'])
    def activity_time(self, request):
        """
        Retorna la cantidad de reservas por día para ver tendencias.
        """
        resource_type = request.query_params.get('type', None)
        recurso_id = request.query_params.get('recurso_id', None)
        subdireccion_id = request.query_params.get('subdireccion_id', None)
        departamento_id = request.query_params.get('departamento_id', None)
        unidad_id = request.query_params.get('unidad_id', None)

        queryset = SolicitudReserva.objects.filter(estado__in=['APROBADA', 'FINALIZADA'])
        
        if recurso_id:
            queryset = queryset.filter(recurso_id=recurso_id)
        elif resource_type:
            queryset = queryset.filter(recurso__tipo=resource_type)

        if unidad_id:
            queryset = queryset.filter(solicitante__funcionario_profile__unidad_id=unidad_id)
        elif departamento_id:
            queryset = queryset.filter(solicitante__funcionario_profile__departamento_id=departamento_id)
        elif subdireccion_id:
            queryset = queryset.filter(solicitante__funcionario_profile__subdireccion_id=subdireccion_id)


        # Agrupar por fecha de inicio (solo el día)
        # Note: Truncating date depends on DB, using extra logic
        activity = queryset.extra(select={'day': "date(fecha_inicio)"}).values('day').annotate(value=Count('id')).order_by('day')

        return Response(activity)

    @action(detail=False, methods=['get'])
    def tickets_summary(self, request):
        """
        Retorna estadísticas resumidas del sistema de tickets.
        """
        from tickets.models import Ticket, TicketCategory
        from django.db.models import Count

        subdireccion_id = request.query_params.get('subdireccion_id', None)
        departamento_id = request.query_params.get('departamento_id', None)
        unidad_id = request.query_params.get('unidad_id', None)

        queryset = Ticket.objects.all()

        if unidad_id:
            queryset = queryset.filter(creado_por__funcionario_profile__unidad_id=unidad_id)
        elif departamento_id:
            queryset = queryset.filter(creado_por__funcionario_profile__departamento_id=departamento_id)
        elif subdireccion_id:
            queryset = queryset.filter(creado_por__funcionario_profile__subdireccion_id=subdireccion_id)

        # Distribución por Categoría
        by_category = queryset.values(
            label=F('categoria__nombre')
        ).annotate(value=Count('id')).order_by('-value')

        # Distribución por Estado
        by_status = queryset.values(
            label=F('estado')
        ).annotate(value=Count('id'))

        # Distribución por Prioridad
        by_priority = queryset.values(
            label=F('prioridad')
        ).annotate(value=Count('id'))

        # Ranking por Departamento Origen (quién solicita)
        by_department = queryset.values(
            label=F('creado_por__funcionario_profile__departamento__nombre')
        ).annotate(value=Count('id')).order_by('-value')

        from django.db.models import Avg, ExpressionWrapper, fields
        resolved_tickets = queryset.filter(fecha_resolucion__isnull=False)
        avg_times_query = resolved_tickets.values(
            label=F('prioridad')
        ).annotate(
            duration=Avg(ExpressionWrapper(F('fecha_resolucion') - F('fecha_creacion'), output_field=fields.DurationField()))
        )
        
        avg_time_by_priority = []
        for item in avg_times_query:
            duration = item['duration']
            hours = duration.total_seconds() / 3600 if duration else 0
            avg_time_by_priority.append({
                'label': item['label'],
                'value': round(hours, 1)
            })

        return Response({
            'by_category': [item for item in by_category if item['label']],
            'by_status': by_status,
            'by_priority': by_priority,
            'by_department': [item for item in by_department if item['label']],
            'avg_time_by_priority': avg_time_by_priority
        })

