from django.template import Template, Context
from django.core.mail import get_connection, EmailMessage
from email.mime.image import MIMEImage
from .models import CuentaSMTP, DestinatariosCorreoOperativo, PlantillaCorreo
import logging
import mimetypes
import os
import re

logger = logging.getLogger(__name__)

# Cuerpo por defecto del envío de certificado al establecimiento / director.
CUERPO_DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO = (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.55;">'
    '<p>Estimado/a director/a,</p>'
    '<p>Junto con saludar cordialmente, envío adjunto el certificado correspondiente al servicio '
    'de <b>{{ tipo_nombre }}</b> realizado en su establecimiento'
    '{% if fecha_servicio %} el {{ fecha_servicio }}{% endif %}.</p>'
    '<p>Quedamos atentos ante cualquier consulta adicional.</p>'
    '<p>Atentamente,</p>'
    '<p>Departamento de SSGG, Operaciones y Soporte TI<br/>SLEP Iquique</p>'
    '{% if logo_cid %}'
    '<p style="margin-top:24px;">'
    '<img src="cid:{{ logo_cid }}" alt="SLEP Iquique" '
    'style="max-width:160px;height:auto;border:0;" />'
    '</p>'
    '{% endif %}'
    '</div>'
)

# Logo empaquetado con el código (funciona en local y Docker sin depender de media/).
_LOGO_SLEP_EMPAQUETADO = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    'assets',
    'logo_slep.png',
)


def _archivo_existe(path):
    return bool(path) and os.path.isfile(path)


def resolver_logo_slep():
    """
    Ruta absoluta al logo SLEP para embeber en correos.

    Orden:
    1. DocumentAsset «Logo SLEP» (media subido / volumen Docker)
    2. logo_derecho de alguna ReportConfiguration
    3. Rutas habituales bajo MEDIA_ROOT
    4. Asset empaquetado en comunicaciones/assets/ (siempre en la imagen)
    """
    from django.conf import settings

    try:
        from core.models import DocumentAsset, ReportConfiguration

        asset = (
            DocumentAsset.objects.filter(nombre__icontains='Logo SLEP')
            .exclude(archivo='')
            .first()
        )
        if asset and asset.archivo:
            path = asset.archivo.path
            if _archivo_existe(path):
                return path

        for cfg in ReportConfiguration.objects.select_related('logo_derecho').all():
            if cfg.logo_derecho_id and cfg.logo_derecho and cfg.logo_derecho.archivo:
                path = cfg.logo_derecho.archivo.path
                if _archivo_existe(path):
                    return path
    except Exception as exc:
        logger.warning(f'No se pudo resolver logo desde DocumentAsset: {exc}')

    media_root = getattr(settings, 'MEDIA_ROOT', '') or ''
    for cand in (
        os.path.join(media_root, 'report_assets', 'Logo_SLEP.png'),
        os.path.join(media_root, 'pdf_assets', 'Logo SLEP.png'),
        os.path.join(media_root, 'establecimientos', 'logos', 'Logo_SLEP_fondo_transparente.png'),
    ):
        if _archivo_existe(cand):
            return cand

    if _archivo_existe(_LOGO_SLEP_EMPAQUETADO):
        return _LOGO_SLEP_EMPAQUETADO

    logger.warning('Logo SLEP no encontrado (ni media ni asset empaquetado).')
    return None


def obtener_destinatarios_correo_operativo(proposito):
    """
    Resuelve destinatarios configurados para correos operativos.
    Incluye usuarios vinculados a grupos de funcionarios, usuarios específicos y emails adicionales.
    """
    config = (
        DestinatariosCorreoOperativo.objects
        .prefetch_related('grupos', 'usuarios')
        .filter(proposito=proposito, activo=True)
        .first()
    )
    if not config:
        logger.warning(f"No hay destinatarios activos configurados para el propósito: {proposito}")
        return []

    destinatarios = []

    for grupo in config.grupos.all():
        usuarios_grupo = (
            grupo.funcionarios
            .filter(estado=True, user__is_active=True)
            .exclude(user__email__isnull=True)
            .exclude(user__email='')
        )
        destinatarios.extend(usuarios_grupo.values_list('user__email', flat=True))

    usuarios_directos = (
        config.usuarios
        .filter(is_active=True)
        .exclude(email__isnull=True)
        .exclude(email='')
    )
    destinatarios.extend(usuarios_directos.values_list('email', flat=True))

    emails_adicionales = [
        email.strip()
        for email in re.split(r'[,;\n]+', config.emails_adicionales or '')
        if email.strip()
    ]
    destinatarios.extend(emails_adicionales)

    deduplicados = {}
    for email in destinatarios:
        deduplicados[email.lower()] = email

    return list(deduplicados.values())

def _adjuntar_imagenes_inline(msg, imagenes_inline):
    """
    Adjunta imágenes embebidas (CID).
    `imagenes_inline`: lista de dicts
      {'cid': 'logo_slep', 'path': '...'}  o  {'cid': '...', 'contenido': b'...', 'mimetype': 'image/png', 'nombre': 'x.png'}
    """
    if not imagenes_inline:
        return
    for item in imagenes_inline:
        cid = (item.get('cid') or '').strip()
        if not cid:
            continue
        contenido = item.get('contenido')
        nombre = item.get('nombre') or f'{cid}.png'
        mimetype = item.get('mimetype')
        path = item.get('path')
        if contenido is None and path:
            if not os.path.isfile(path):
                logger.warning(f'Imagen inline no encontrada: {path}')
                continue
            with open(path, 'rb') as fh:
                contenido = fh.read()
            nombre = nombre or os.path.basename(path)
            if not mimetype:
                mimetype = mimetypes.guess_type(path)[0]
        if not contenido:
            continue
        subtype = None
        if mimetype and '/' in mimetype:
            subtype = mimetype.split('/', 1)[1]
        img = MIMEImage(contenido, _subtype=subtype or 'png')
        img.add_header('Content-ID', f'<{cid}>')
        img.add_header('Content-Disposition', 'inline', filename=nombre)
        msg.attach(img)


def enviar_correo_maestro(
    proposito,
    destinatarios,
    contexto,
    archivo_adjunto=None,
    cuenta_smtp=None,
    plantilla=None,
    imagenes_inline=None,
):
    """
    Función centralizada para enviar correos usando el nuevo sistema de comunicaciones.
    `plantilla` / `cuenta_smtp` opcionales permiten override desde TipoNotificacion.
    `imagenes_inline`: lista de dicts con cid + path/contenido para <img src="cid:...">.
    """
    try:
        # 1. Buscar la plantilla
        if plantilla is None:
            plantilla = PlantillaCorreo.objects.filter(proposito=proposito).first()
        if not plantilla:
            logger.warning(f"No se encontró plantilla para el propósito: {proposito}")
            return False

        # 2. Buscar la cuenta SMTP (override, la de la plantilla o la default)
        cuenta = (
            cuenta_smtp
            or plantilla.cuenta_smtp
            or CuentaSMTP.objects.filter(es_default=True).first()
        )
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

        _adjuntar_imagenes_inline(msg, imagenes_inline)

        if archivo_adjunto:
            # archivo_adjunto: {'nombre': 'factura.pdf', 'contenido': b'...', 'mimetype': 'application/pdf'}
            msg.attach(archivo_adjunto['nombre'], archivo_adjunto['contenido'], archivo_adjunto['mimetype'])

        msg.send()
        return True

    except Exception as e:
        logger.error(f"Error en enviar_correo_maestro: {str(e)}")
        return False


def enviar_correo_simple(
    destinatarios,
    contexto,
    *,
    cuenta_smtp=None,
    asunto_tpl='{{ titulo }}',
    cuerpo_tpl='<h2>{{ titulo }}</h2><p>{{ mensaje }}</p>',
):
    """Envío con plantilla inline (sin fila PlantillaCorreo)."""
    try:
        cuenta = cuenta_smtp or CuentaSMTP.objects.filter(es_default=True).first()
        if not cuenta:
            logger.error('No hay ninguna cuenta SMTP configurada.')
            return False
        ctx = Context(contexto)
        asunto = Template(asunto_tpl).render(ctx)
        cuerpo = Template(cuerpo_tpl).render(ctx)
        connection = get_connection(
            host=cuenta.smtp_host,
            port=cuenta.smtp_port,
            username=cuenta.smtp_user,
            password=cuenta.smtp_password,
            use_tls=cuenta.smtp_use_tls,
            use_ssl=cuenta.smtp_use_ssl,
        )
        from_email = f'{cuenta.remitente_nombre} <{cuenta.remitente_email}>'
        msg = EmailMessage(
            subject=asunto,
            body=cuerpo,
            from_email=from_email,
            to=destinatarios,
            connection=connection,
        )
        msg.content_subtype = 'html'
        msg.send()
        return True
    except Exception as e:
        logger.error('Error en enviar_correo_simple: %s', e)
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
        },
        {
            'proposito': 'DOC_SERVICIOS_NUEVO',
            'nombre': 'Documentación de servicios — nuevo registro',
            'asunto': '{{ titulo }}',
            'cuerpo_html': (
                '<h2>{{ titulo }}</h2>'
                '<p>{{ mensaje }}</p>'
                '{% if link %}<p><a href="{{ link }}">Ver en SGAF</a></p>{% endif %}'
                '<p style="color:#666;font-size:12px;">Módulo {{ modulo }} · {{ evento }}</p>'
            ),
        },
        {
            'proposito': 'DOC_SERVICIOS_AVISO',
            'nombre': 'Documentación de servicios — aviso por fecha',
            'asunto': '{{ titulo }}',
            'cuerpo_html': (
                '<h2>{{ titulo }}</h2>'
                '<p>{{ mensaje }}</p>'
                '{% if link %}<p><a href="{{ link }}">Ver en SGAF</a></p>{% endif %}'
                '<p style="color:#666;font-size:12px;">Recordatorio automático · {{ modulo }}</p>'
            ),
        },
        {
            'proposito': 'DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO',
            'nombre': 'Documentación de servicios — envío al establecimiento',
            'asunto': 'Certificado {{ tipo_nombre }} — {{ establecimiento }}',
            'cuerpo_html': CUERPO_DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO,
        },
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
