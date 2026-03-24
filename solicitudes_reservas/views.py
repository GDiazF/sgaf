from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import RecursoReservable, SolicitudReserva, BloqueoHorario, ReservaSetting
from .serializers import (
    RecursoReservableSerializer,
    SolicitudReservaSerializer,
    PublicSolicitudReservaSerializer,
    BloqueoHorarioSerializer,
    ReservaSettingSerializer,
)
from .emails import (
    enviar_correo_nueva_solicitud,
    enviar_correo_aprobacion,
    enviar_correo_rechazo,
)
from django.utils import timezone


class RecursoReservableViewSet(viewsets.ModelViewSet):
    queryset = RecursoReservable.objects.all()
    serializer_class = RecursoReservableSerializer

    def get_permissions(self):
        """Lectura: cualquier usuario. Escritura: solo staff."""
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), permissions.IsAdminUser()]

    def get_queryset(self):
        if self.request.user.is_authenticated and self.request.user.is_staff:
            return RecursoReservable.objects.all()
        return RecursoReservable.objects.filter(activo=True)


class SolicitudReservaViewSet(viewsets.ModelViewSet):
    queryset = SolicitudReserva.objects.all()
    serializer_class = SolicitudReservaSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'create'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if not self.request.user.is_authenticated and self.request.user.is_anonymous and self.action == 'list':
            return PublicSolicitudReservaSerializer
        return SolicitudReservaSerializer

    def get_queryset(self):
        # Auto-finalizar reservas cuya fecha_fin ya pasó
        now = timezone.now()
        SolicitudReserva.objects.filter(
            estado='APROBADA',
            fecha_fin__lt=now
        ).update(estado='FINALIZADA')

        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return SolicitudReserva.objects.all().order_by('-fecha_inicio')
        return SolicitudReserva.objects.all().order_by('-fecha_inicio')

    def perform_create(self, serializer):
        """Crea la solicitud y envía correos de notificación."""
        if self.request.user.is_authenticated:
            instance = serializer.save(solicitante=self.request.user)
        else:
            instance = serializer.save(solicitante=None, estado='PENDIENTE')

        # Enviar correo de notificación (no bloquea la respuesta)
        enviar_correo_nueva_solicitud(instance)

    # ─── Acción: Aprobar ──────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def aprobar(self, request, pk=None):
        solicitud = self.get_object()
        solicitud.estado = 'APROBADA'
        solicitud.aprobado_por = request.user
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.motivo_rechazo = ''
        solicitud.save()
        enviar_correo_aprobacion(solicitud)
        return Response(SolicitudReservaSerializer(solicitud, context={'request': request}).data)

    # ─── Acción: Rechazar ─────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def rechazar(self, request, pk=None):
        solicitud = self.get_object()
        motivo = request.data.get('motivo', '').strip()
        solicitud.estado = 'RECHAZADA'
        solicitud.aprobado_por = request.user
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.motivo_rechazo = motivo
        solicitud.save()
        enviar_correo_rechazo(solicitud)
        return Response(SolicitudReservaSerializer(solicitud, context={'request': request}).data)


class BloqueoHorarioViewSet(viewsets.ModelViewSet):
    """CRUD para bloqueos de horario por recurso."""
    serializer_class = BloqueoHorarioSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = BloqueoHorario.objects.all()
        recurso_id = self.request.query_params.get('recurso')
        if recurso_id:
            qs = qs.filter(recurso_id=recurso_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)

class ReservaSettingViewSet(viewsets.ModelViewSet):
    """Configuración global única para el sistema de reservas."""
    queryset = ReservaSetting.objects.all()
    serializer_class = ReservaSettingSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), permissions.IsAdminUser()]

    def list(self, request, *args, **kwargs):
        setting, _ = ReservaSetting.objects.get_or_create(id=1)
        serializer = self.get_serializer(setting)
        return Response(serializer.data)
