from django.conf import settings
import threading
from django.utils import timezone
from comunicaciones.utils import enviar_correo_maestro


def _get_reservation_context(solicitud):
    """Prepara el contexto común para todas las notificaciones de reserva."""
    fi = timezone.localtime(solicitud.fecha_inicio)
    ff = timezone.localtime(solicitud.fecha_fin)

    return {
        'nombre': solicitud.nombre_funcionario or 'Solicitante',
        'recurso': solicitud.recurso.nombre,
        'fecha': fi.strftime('%d/%m/%Y'),
        'hora': f"{fi.strftime('%H:%M')} – {ff.strftime('%H:%M')}",
        'estado': solicitud.get_estado_display(),
        'codigo_reserva': solicitud.codigo_reserva,
        'motivo_rechazo': solicitud.motivo_rechazo or 'No especificado',
        'titulo_reserva': solicitud.titulo,
    }


def enviar_correo_nueva_solicitud(solicitud):
    """
    1. Admins → TipoNotificacion RESERVAS.AVISO_ADMIN (campana + email).
    2. Solicitante → correo transaccional RESERVA_SOLICITUD (no es catálogo de tipos).
    """
    from notificaciones.services import notificar

    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (
        solicitud.solicitante.email if solicitud.solicitante else None
    )

    start = timezone.localtime(solicitud.fecha_inicio)
    date_key = start.strftime('%Y-%m-%d') if start else ''
    link = (
        f'/reservas?date={date_key}&highlight={solicitud.id}'
        if date_key
        else f'/reservas?highlight={solicitud.id}'
    )

    notificar(
        modulo='RESERVAS',
        evento='AVISO_ADMIN',
        titulo=f'Reserva pendiente: {solicitud.titulo or "Sin título"}',
        mensaje=(
            f'{context["nombre"]} solicitó {context["recurso"]} '
            f'el {context["fecha"]} {context["hora"]}.'
        ),
        tipo='INFO',
        link=link,
        email_contexto=context,
        contexto={'solicitud_id': solicitud.id},
        dedupe_key=f'reserva:nueva:{solicitud.id}',
        async_email=True,
    )

    if email_sol:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_SOLICITUD', [email_sol], context),
            daemon=True,
        ).start()


def enviar_correo_aprobacion(solicitud):
    """Envía correo dinámico de aprobación (RESERVA_APROBACION) al solicitante."""
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (
        solicitud.solicitante.email if solicitud.solicitante else None
    )

    if email_sol:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_APROBACION', [email_sol], context),
            daemon=True,
        ).start()


def enviar_correo_rechazo(solicitud):
    """Envía correo dinámico de rechazo (RESERVA_APROBACION) al solicitante."""
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (
        solicitud.solicitante.email if solicitud.solicitante else None
    )

    if email_sol:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_APROBACION', [email_sol], context),
            daemon=True,
        ).start()


def enviar_correo_recordatorio(solicitud):
    """Envía correo dinámico de recordatorio (RESERVA_RECORDATORIO) al solicitante."""
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (
        solicitud.solicitante.email if solicitud.solicitante else None
    )

    if email_sol:
        return enviar_correo_maestro('RESERVA_RECORDATORIO', [email_sol], context)
    return False
