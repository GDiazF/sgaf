from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notificaciones.models import FuenteViva, JobProgramado, Notificacion, TipoNotificacion
from notificaciones.serializers import (
    FuenteVivaSerializer,
    JobProgramadoSerializer,
    NotificacionSerializer,
    TipoNotificacionSerializer,
)
from notificaciones.services import (
    construir_fuentes_vivas_para,
    puede_ver_reservas_pendientes_campana,
)


class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'mensaje', 'modulo', 'evento']
    ordering_fields = ['fecha_creacion', 'leida']
    ordering = ['-fecha_creacion']

    def get_queryset(self):
        qs = Notificacion.objects.filter(usuario=self.request.user)
        modulo = self.request.query_params.get('modulo')
        leida = self.request.query_params.get('leida')
        if modulo:
            qs = qs.filter(modulo=modulo)
        if leida is not None:
            if leida.lower() in ('1', 'true', 'yes'):
                qs = qs.filter(leida=True)
            elif leida.lower() in ('0', 'false', 'no'):
                qs = qs.filter(leida=False)
        return qs

    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        self.get_queryset().filter(leida=False).update(leida=True)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        notif = self.get_object()
        notif.leida = True
        notif.save(update_fields=['leida'])
        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'], url_path='reservas-pendientes-habilitado')
    def reservas_pendientes_habilitado(self, request):
        return Response({'habilitado': puede_ver_reservas_pendientes_campana(request.user)})

    @action(detail=False, methods=['get'], url_path='fuentes-vivas')
    def fuentes_vivas(self, request):
        return Response({'fuentes': construir_fuentes_vivas_para(request.user)})


class IsStaffOrNotifAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        return user.has_perm('notificaciones.view_tiponotificacion') or user.has_perm(
            'notificaciones.change_tiponotificacion'
        )


class TipoNotificacionViewSet(viewsets.ModelViewSet):
    queryset = TipoNotificacion.objects.all().prefetch_related(
        'grupos', 'roles', 'usuarios'
    ).select_related('cuenta_smtp', 'plantilla')
    serializer_class = TipoNotificacionSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrNotifAdmin]


class FuenteVivaViewSet(viewsets.ModelViewSet):
    queryset = FuenteViva.objects.all().prefetch_related('grupos', 'roles', 'usuarios')
    serializer_class = FuenteVivaSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrNotifAdmin]


class JobProgramadoViewSet(viewsets.ModelViewSet):
    queryset = JobProgramado.objects.all()
    serializer_class = JobProgramadoSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrNotifAdmin]
