from django.template import Template, Context
from django.core.mail import get_connection, EmailMessage
from .models import CuentaSMTP, PlantillaCorreo
import logging

logger = logging.getLogger(__name__)

def enviar_correo_maestro(proposito, destinatarios, contexto, archivo_adjunto=None):
    """
    Función centralizada para enviar correos usando el nuevo sistema de comunicaciones.
    """
    try:
        # 1. Buscar la plantilla
        plantilla = PlantillaCorreo.objects.filter(proposito=proposito).first()
        if not plantilla:
            logger.warning(f"No se encontró plantilla para el propósito: {proposito}")
            return False

        # 2. Buscar la cuenta SMTP (la de la plantilla o la default)
        cuenta = plantilla.cuenta_smtp or CuentaSMTP.objects.filter(es_default=True).first()
        if not cuenta:
            logger.error("No hay ninguna cuenta SMTP configurada.")
            return False

        # 3. Renderizar Asunto y Cuerpo con Django Template
        ctx = Context(contexto)
        
        asunto_renderizado = Template(plantilla.asunto).render(ctx)
        cuerpo_renderizado = Template(plantilla.cuerpo_html).render(ctx)

        # 4. Configurar Conexión SMTP dinámica
        connection = get_connection(
            host=cuenta.smtp_host,
            port=cuenta.smtp_port,
            username=cuenta.smtp_user,
            password=cuenta.smtp_password,
            use_tls=cuenta.smtp_use_tls,
            use_ssl=cuenta.smtp_use_ssl,
        )

        from_email = f"{cuenta.remitente_nombre} <{cuenta.remitente_email}>"

        # 5. Crear y enviar mensaje
        msg = EmailMessage(
            subject=asunto_renderizado,
            body=cuerpo_renderizado,
            from_email=from_email,
            to=destinatarios,
            connection=connection,
        )
        msg.content_subtype = "html"
        
        if archivo_adjunto:
            # archivo_adjunto: {'nombre': 'factura.pdf', 'contenido': b'...', 'mimetype': 'application/pdf'}
            msg.attach(archivo_adjunto['nombre'], archivo_adjunto['contenido'], archivo_adjunto['mimetype'])

        msg.send()
        return True

    except Exception as e:
        logger.error(f"Error en enviar_correo_maestro: {str(e)}")
        return False

def migrar_configuracion_antigua():
    """
    Copia la configuración de EmailConfiguration (core) a CuentaSMTP (comunicaciones)
    y crea plantillas básicas si no existen.
    """
    from core.models import EmailConfiguration
    
    # 1. Migrar Cuenta SMTP
    if CuentaSMTP.objects.count() == 0:
        old_config = EmailConfiguration.get_config()
        if old_config.smtp_user:
            CuentaSMTP.objects.create(
                nombre="Configuración Importada",
                smtp_host=old_config.smtp_host,
                smtp_port=old_config.smtp_port,
                smtp_user=old_config.smtp_user,
                smtp_password=old_config.smtp_password,
                smtp_use_tls=old_config.smtp_use_tls,
                smtp_use_ssl=old_config.smtp_use_ssl,
                remitente_nombre="SGAF",
                remitente_email=old_config.smtp_user,
                es_default=True
            )

    # 2. Crear Plantillas Base si no existen (Individualmente)
    templates_base = [
        {
            'proposito': 'MFA',
            'nombre': 'Código de Verificación MFA',
            'asunto': '🔐 Tu código de acceso: {{ codigo }}',
            'cuerpo_html': '<h2>Hola {{ nombre }}</h2><p>Tu código de seguridad es: <b style="font-size: 24px; color: #2563eb;">{{ codigo }}</b></p><p>Este código expira en 10 minutos.</p>'
        },
        {
            'proposito': 'RESET_PASSWORD',
            'nombre': 'Recuperación de Contraseña',
            'asunto': '🔑 Restablecer contraseña',
            'cuerpo_html': '<h2>Recuperación de Cuenta</h2><p>Hola {{ nombre }}, haz clic en el siguiente botón para cambiar tu contraseña:</p><a href="{{ reset_url }}" style="padding: 10px 20px; background: #2563eb; color: white; border-radius: 10px; text-decoration: none;">Restablecer ahora</a>'
        },
        {
            'proposito': 'RESERVA_SOLICITUD',
            'nombre': 'Nueva Solicitud de Reserva',
            'asunto': '📅 Tu solicitud de reserva ha sido recibida',
            'cuerpo_html': '<h2>Solicitud de Reserva Recibida</h2><p>Hola {{ nombre }}, tu solicitud para el recurso <b>{{ recurso }}</b> el día {{ fecha }} ha sido registrada.</p>'
        },
        {
            'proposito': 'RESERVA_APROBACION',
            'nombre': 'Estado de Reserva Actualizado',
            'asunto': '✅ Tu reserva ha sido {{ estado }}',
            'cuerpo_html': '<h2>Actualización de Reserva</h2><p>Hola {{ nombre }}, tu reserva para <b>{{ recurso }}</b> ha sido <b>{{ estado }}</b>.</p>'
        },
        {
            'proposito': 'RESERVA_AVISO_ADMIN',
            'nombre': 'Aviso Admin: Nueva Reserva',
            'asunto': '📢 Nueva solicitud de reserva pendiente',
            'cuerpo_html': '<h2>Nueva Solicitud</h2><p>El usuario <b>{{ nombre }}</b> ha solicitado <b>{{ recurso }}</b>.</p>'
        },
        {
            'proposito': 'RESERVA_RECORDATORIO',
            'nombre': 'Recordatorio de Reserva',
            'asunto': '⏰ Recordatorio: Tienes una reserva mañana',
            'cuerpo_html': '<h2>No lo olvides</h2><p>Hola {{ nombre }}, mañana tienes reservado <b>{{ recurso }}</b> a las {{ hora }}.</p>'
        }
    ]

    for t in templates_base:
        PlantillaCorreo.objects.get_or_create(
            proposito=t['proposito'],
            defaults={
                'nombre': t['nombre'],
                'asunto': t['asunto'],
                'cuerpo_html': t['cuerpo_html']
            }
        )
