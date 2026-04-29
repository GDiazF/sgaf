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
        'titulo_reserva': solicitud.titulo
    }

def enviar_correo_nueva_solicitud(solicitud):
    """
    Usa el motor dinámico para notificar una nueva solicitud:
    1. Al administrador (RESERVA_AVISO_ADMIN) - Soporta múltiples correos
    2. Al solicitante (RESERVA_SOLICITUD)
    """
    from core.models import EmailConfiguration
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)
    
    # 1. Notificar al Admin (Lista dinámica)
    try:
        config = EmailConfiguration.get_config()
        admin_emails = config.get_reservas_emails_list()
    except:
        admin_emails = []

    # Si no hay en BD, usar settings como fallback
    if not admin_emails:
        fallback = getattr(settings, 'RESERVAS_ADMIN_EMAIL', None)
        if fallback:
            admin_emails = [fallback]

    for admin_email in admin_emails:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_AVISO_ADMIN', [admin_email], context),
            daemon=True
        ).start()

    # 2. Notificar al Solicitante
    if email_sol:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_SOLICITUD', [email_sol], context),
            daemon=True
        ).start()

def enviar_correo_aprobacion(solicitud):
    """Envía correo dinámico de aprobación (RESERVA_APROBACION)."""
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)
    
    if email_sol:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_APROBACION', [email_sol], context),
            daemon=True
        ).start()

def enviar_correo_rechazo(solicitud):
    """Envía correo dinámico de rechazo (RESERVA_APROBACION)."""
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)
    
    if email_sol:
        threading.Thread(
            target=enviar_correo_maestro,
            args=('RESERVA_APROBACION', [email_sol], context),
            daemon=True
        ).start()

def enviar_correo_recordatorio(solicitud):
    """Envía correo dinámico de recordatorio (RESERVA_RECORDATORIO)."""
    context = _get_reservation_context(solicitud)
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)
    
    if email_sol:
        return enviar_correo_maestro('RESERVA_RECORDATORIO', [email_sol], context)
    return False
