from rest_framework import viewsets, permissions, filters, serializers
from django_filters.rest_framework import DjangoFilterBackend
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
    pagination_class = None

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
    pagination_class = None

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'estado': ['exact'],
        'recurso': ['exact'],
        'solicitante': ['exact'],
        'fecha_inicio': ['exact', 'gte', 'lte'],
        'fecha_fin': ['exact', 'gte', 'lte'],
    }
    search_fields = ['titulo', 'nombre_funcionario', 'descripcion', 'codigo_reserva', 'email_contacto']
    ordering_fields = ['fecha_inicio', 'fecha_fin', 'created_at', 'estado']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'create', 'public_manage'):
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if not self.request.user.is_authenticated and self.request.user.is_anonymous and self.action == 'list':
            return PublicSolicitudReservaSerializer
        return SolicitudReservaSerializer

    def get_queryset(self):
        user = self.request.user
        
        # ─ LIMPIEZA: Eliminar físicamente las reservas PENDIENTES expiradas ─
        SolicitudReserva.objects.filter(estado='PENDIENTE', fecha_fin__lt=timezone.now()).delete()

        # Para usuarios públicos (anónimos), limitamos el historial a 30 días atrás
        # Esto reduce el tiempo de carga del portal público si hay miles de registros.
        if not user.is_authenticated:
            limit_past = timezone.now() - timezone.timedelta(days=30)
            return SolicitudReserva.objects.filter(fecha_inicio__gte=limit_past).order_by('-fecha_inicio')

        if user.is_staff:
            return SolicitudReserva.objects.all().order_by('-fecha_inicio')
        
        # Usuarios regulares logueados: tal vez solo sus solicitudes? 
        # (Depende de si necesitan ver el calendario completo)
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
        if solicitud.fecha_fin < timezone.now():
            return Response({"detail": "No se pueden aprobar reservas que ya han pasado su hora de término."}, status=400)
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
        if solicitud.fecha_fin < timezone.now():
            return Response({"detail": "No se pueden rechazar reservas que ya han pasado su hora de término."}, status=400)
        motivo = request.data.get('motivo', '').strip()
        solicitud.estado = 'RECHAZADA'
        solicitud.aprobado_por = request.user
        solicitud.fecha_aprobacion = timezone.now()
        solicitud.motivo_rechazo = motivo
        solicitud.save()
        enviar_correo_rechazo(solicitud)
        return Response(SolicitudReservaSerializer(solicitud, context={'request': request}).data)

    # ─── Acción: Gestión Pública (con código de reserva) ──────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def public_manage(self, request):
        """Permite borrar o editar una reserva si se conoce su código secreto."""
        # En DRF es mejor buscarlo manualmente o usar un mixin si es común.
        codigo = request.data.get('codigo_reserva', '').strip()
        accion = request.data.get('accion', '').strip() # 'UPDATE' o 'DELETE'
        
        if not codigo:
            return Response({"detail": "Código de reserva requerido."}, status=400)
            
        print(f"--- public_manage SEARCH: code input='{codigo}' ---")
        # Logueamos una muestra para ver qué hay en la DB
        sample = list(SolicitudReserva.objects.values_list('codigo_reserva', flat=True)[:5])
        print(f"--- public_manage SAMPLE DB: {sample} ---")

        solicitud = SolicitudReserva.objects.filter(codigo_reserva__iexact=codigo).first()
        if not solicitud:
            return Response({"detail": "Código de reserva inválido o no encontrado."}, status=404)

        # BLOQUEAR MODIFICACIÓN SI YA PASO
        if accion in ('DELETE', 'UPDATE') and solicitud.fecha_fin < timezone.now():
            return Response({"detail": "No se pueden modificar reservas que ya han finalizado."}, status=400)

        if accion == 'VIEW':
            return Response(SolicitudReservaSerializer(solicitud, context={'request': request}).data)
            
        elif accion == 'DELETE':
            solicitud.delete()
            return Response({"detail": "Reserva eliminada con éxito."})
            
        elif accion == 'UPDATE':
            # Aplicar cambios y resetear estado a PENDIENTE
            serializer = SolicitudReservaSerializer(solicitud, data=request.data, partial=True)
            if serializer.is_valid():
                # Forzar estado a PENDIENTE si se edita (como requiere el usuario)
                instance = serializer.save(estado='PENDIENTE', aprobado_por=None, fecha_aprobacion=None)
                # Opcional: Re-enviar correo de nueva solicitud
                enviar_correo_nueva_solicitud(instance)
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
            
        return Response({"detail": "Acción no permitida."}, status=400)

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.fecha_fin < timezone.now():
            raise serializers.ValidationError("No se pueden modificar reservas que ya han finalizado.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.fecha_fin < timezone.now():
            raise serializers.ValidationError("No se pueden eliminar reservas que ya han finalizado. Use 'Eliminar Permanentemente' si tiene el permiso.")
        instance.delete()

    # ─── Acción: Eliminar Permanentemente (requiere permiso especial) ─────────
    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def force_delete(self, request, pk=None):
        """Elimina cualquier reserva sin importar su estado o fecha.
        Requiere el permiso can_force_delete_reserva.
        """
        if not (request.user.is_superuser or request.user.has_perm('solicitudes_reservas.can_force_delete_reserva')):
            return Response(
                {"detail": "No tienes permiso para eliminar permanentemente reservas."},
                status=403
            )
        solicitud = self.get_object()
        solicitud.delete()
        return Response({"detail": "Reserva eliminada permanentemente."})


class BloqueoHorarioViewSet(viewsets.ModelViewSet):
    """CRUD para bloqueos de horario por recurso."""
    serializer_class = BloqueoHorarioSerializer
    pagination_class = None

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
