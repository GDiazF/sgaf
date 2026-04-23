from django.core.mail import send_mail
from django.conf import settings
import threading
import json
import os
from datetime import date
import django.utils.timezone

# ── Contador diario de correos ────────────────────────────────────────────────
_COUNTER_FILE = os.path.join(os.path.dirname(__file__), '.email_counter.json')
_counter_lock = threading.Lock()

def _get_daily_count():
    """Lee el contador del día actual desde el archivo JSON."""
    try:
        with open(_COUNTER_FILE, 'r') as f:
            data = json.load(f)
        if data.get('date') == str(date.today()):
            return data.get('count', 0)
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        pass
    return 0

def _increment_daily_count():
    """Incrementa el contador en 1 y lo persiste. Retorna el nuevo valor."""
    today = str(date.today())
    try:
        with open(_COUNTER_FILE, 'r') as f:
            data = json.load(f)
        if data.get('date') != today:
            data = {'date': today, 'count': 0}
    except (FileNotFoundError, json.JSONDecodeError):
        data = {'date': today, 'count': 0}
    data['count'] += 1
    with open(_COUNTER_FILE, 'w') as f:
        json.dump(data, f)
    return data['count']

# ─────────────────────────────────────────────────────────────────────────────

def _log_event(msg):
    """Escribe un mensaje en el log de depuración de correos."""
    log_file = os.path.join(os.path.dirname(__file__), 'email_debug.log')
    try:
        timestamp = django.utils.timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {msg}\n")
    except:
        pass

def _safe_email(to_list, subject, html_body):
    """Envía el correo de forma asíncrona (threading) y registra el resultado en un log."""
    if not to_list or not any(to_list):
        _log_event(f"[SKIP] No hay destinatarios para: {subject}")
        return

    daily_limit = getattr(settings, 'EMAIL_DAILY_LIMIT', 200)

    def _send():
        from core.models import EmailConfiguration
        from django.core.mail import get_connection
        
        db_config = EmailConfiguration.get_config()
        
        # Determinar destinatarios si es para el admin
        final_to_list = []
        for r in to_list:
            if r == getattr(settings, 'RESERVAS_ADMIN_EMAIL', ''):
                # Usar el de la DB si está configurado
                final_to_list.append(db_config.reservas_admin_email or r)
            else:
                final_to_list.append(r)

        with _counter_lock:
            current = _get_daily_count()
            if current >= daily_limit:
                _log_event(f"[BLOQUEADO] Límite diario ({daily_limit}) alcanzado. No se envió: {subject}")
                return
            new_count = _increment_daily_count()

        _log_event(f"[INTENTO] ({new_count}/{daily_limit}) → {final_to_list} | {subject}")
        
        try:
            # Crear conexión dinámica con los datos de la DB
            connection = get_connection(
                host=db_config.smtp_host,
                port=db_config.smtp_port,
                username=db_config.smtp_user,
                password=db_config.smtp_password,
                use_tls=db_config.smtp_use_tls,
                use_ssl=db_config.smtp_use_ssl,
                fail_silently=False,
            )
            
            from django.core.mail import EmailMessage
            msg = EmailMessage(
                subject=subject,
                body=html_body,
                from_email=db_config.default_from_email or settings.DEFAULT_FROM_EMAIL,
                to=[r for r in final_to_list if r],
                connection=connection,
            )
            msg.content_subtype = "html"
            msg.send()
            
            _log_event(f"[SUCCESS] Enviado a {final_to_list}")
            print(f"[EMAIL OK] {final_to_list} | {subject}")
        except Exception as e:
            _log_event(f"[ERROR] Falló envío a {final_to_list}: {str(e)}")
            print(f"[EMAIL ERROR] {e}")

    threading.Thread(target=_send, daemon=True).start()


def _base_template(titulo, color_titulo, contenido_html):
    """Plantilla HTML base común para todos los correos."""
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <!-- HEADER -->
            <tr>
              <td style="background:#4f46e5;padding:28px 32px;">
                <p style="margin:0;color:#c7d2fe;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">SLEP Iquique · Portal de Reservas</p>
                <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:900;">{titulo}</h1>
              </td>
            </tr>
            <!-- BODY -->
            <tr>
              <td style="padding:32px;">
                {contenido_html}
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td style="background:#f1f5f9;padding:20px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;color:#94a3b8;font-size:11px;text-align:center;">
                  Este mensaje fue enviado automáticamente por el Sistema de Gestión SLEP Iquique.<br>
                  No respondas a este correo directamente.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """


def enviar_correo_nueva_solicitud(solicitud):
    """
    Envía 2 correos cuando se crea una nueva solicitud PENDIENTE:
    1. Al administrador: aviso de revisión pendiente.
    2. Al solicitante (si tiene email): confirmación de recepción.
    """
    recurso = solicitud.recurso
    fi = django.utils.timezone.localtime(solicitud.fecha_inicio).strftime('%d/%m/%Y %H:%M')
    ff = django.utils.timezone.localtime(solicitud.fecha_fin).strftime('%H:%M')
    nombre = solicitud.nombre_funcionario or 'No especificado'
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)

    # ── 1. Aviso al Admin ──────────────────────────────────────────────────
    admin_body = _base_template(
        titulo='Nueva Solicitud de Reserva Pendiente',
        color_titulo='#4f46e5',
        contenido_html=f"""
        <p style="color:#64748b;margin:0 0 20px;font-size:14px;">Se ha recibido una nueva solicitud que requiere tu revisión.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f1f5f9;"><th colspan="2" style="padding:12px 16px;color:#475569;font-size:11px;font-weight:900;text-align:left;letter-spacing:1px;text-transform:uppercase;">Detalle de la Solicitud</th></tr>
          <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;width:40%;">Recurso</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{recurso.nombre} ({recurso.get_tipo_display()})</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Motivo</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{solicitud.titulo}</td></tr>
          <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Solicitante</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{nombre}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Correo</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{email_sol or '—'}</td></tr>
          <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Horario</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{fi} – {ff} hrs</td></tr>
        </table>
        <p style="color:#64748b;font-size:13px;">Ingresa al sistema para aprobar o rechazar esta solicitud.</p>
        """
    )
    admin_email = getattr(settings, 'RESERVAS_ADMIN_EMAIL', None)
    _safe_email([admin_email], f'📋 Nueva Reserva Pendiente: {recurso.nombre}', admin_body)

    # ── 2. Confirmación al Solicitante ─────────────────────────────────────
    if email_sol:
        sol_body = _base_template(
            titulo='Recibimos tu Solicitud de Reserva',
            color_titulo='#4f46e5',
            contenido_html=f"""
            <p style="color:#64748b;margin:0 0 20px;font-size:14px;">Hola <strong>{nombre}</strong>, hemos recibido tu solicitud correctamente. Un administrador la revisará pronto.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:24px;">
              <tr style="background:#f1f5f9;"><th colspan="2" style="padding:12px 16px;color:#475569;font-size:11px;font-weight:900;text-align:left;letter-spacing:1px;text-transform:uppercase;">Resumen de tu Solicitud</th></tr>
              <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;width:40%;">Recurso</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{recurso.nombre}</td></tr>
              <tr style="background:#f8fafc;"><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Motivo</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{solicitud.titulo}</td></tr>
              <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Horario</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{fi} – {ff} hrs</td></tr>
              <tr style="background:#f8fafc;"><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Estado</td><td style="padding:10px 16px;"><span style="background:#fef3c7;color:#d97706;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:900;">PENDIENTE</span></td></tr>
              <tr><td style="padding:10px 16px;color:#4f46e5;font-size:12px;font-weight:900;">CÓDIGO DE GESTIÓN</td><td style="padding:10px 16px;"><span style="background:#e0e7ff;color:#4338ca;padding:4px 12px;border-radius:8px;font-size:14px;font-weight:900;letter-spacing:1px;border:1px dashed #c7d2fe;">{solicitud.codigo_reserva}</span></td></tr>
            </table>
            <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #dbeafe;">
              <p style="margin:0 0 8px;color:#1e40af;font-size:12px;font-weight:900;">¿Necesitas modificar o anular tu reserva?</p>
              <p style="margin:0;color:#3b82f6;font-size:13px;line-height:1.5;">Usa tu <strong>Código de Gestión</strong> en el portal público para realizar cambios. Si editas una reserva ya aprobada, esta volverá a estado pendiente de aprobación.</p>
            </div>
            <p style="color:#64748b;font-size:13px;">Te notificaremos por este mismo correo cuando haya una resolución.</p>
            """
        )
        _safe_email([email_sol], f'✅ Solicitud Recibida: {recurso.nombre}', sol_body)


def enviar_correo_aprobacion(solicitud):
    """Envía un correo de aprobación al solicitante."""
    recurso = solicitud.recurso
    fi = django.utils.timezone.localtime(solicitud.fecha_inicio).strftime('%d/%m/%Y %H:%M')
    ff = django.utils.timezone.localtime(solicitud.fecha_fin).strftime('%H:%M')
    nombre = solicitud.nombre_funcionario or 'Solicitante'
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)

    if not email_sol:
        return

    body = _base_template(
        titulo='¡Tu Reserva fue Aprobada!',
        color_titulo='#059669',
        contenido_html=f"""
        <div style="text-align:center;padding:20px 0 28px;">
          <div style="display:inline-block;background:#d1fae5;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✅</div>
          <h2 style="margin:16px 0 4px;color:#1e293b;font-size:20px;font-weight:900;">¡Aprobada!</h2>
          <p style="color:#64748b;margin:0;font-size:14px;">Hola <strong>{nombre}</strong>, tu solicitud ha sido aprobada.</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#dcfce7;"><th colspan="2" style="padding:12px 16px;color:#15803d;font-size:11px;font-weight:900;text-align:left;letter-spacing:1px;text-transform:uppercase;">Detalle de tu Reserva Confirmada</th></tr>
          <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;width:40%;">Recurso</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{recurso.nombre}</td></tr>
          <tr style="background:#f0fdf4;"><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Motivo</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{solicitud.titulo}</td></tr>
          <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;width:40%;">Horario</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{fi} – {ff} hrs</td></tr>
          {"<tr style='background:#f0fdf4;'><td style='padding:10px 16px;color:#94a3b8;font-size:12px;'>Ubicación</td><td style='padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;'>" + recurso.ubicacion + "</td></tr>" if recurso.ubicacion else ""}
          <tr style="background:#dcfce7;"><td style="padding:10px 16px;color:#15803d;font-size:11px;font-weight:900;">CÓDIGO DE GESTIÓN</td><td style="padding:10px 16px;"><span style="background:#fff;color:#047857;padding:4px 12px;border-radius:8px;font-size:14px;font-weight:900;letter-spacing:1px;border:1px solid #6ee7b7;">{solicitud.codigo_reserva}</span></td></tr>
        </table>
        <p style="color:#64748b;font-size:13px;text-align:center;">Para cualquier cambio posterior utiliza este código en el sistema.</p>
        """
    )
    _safe_email([email_sol], f'✅ Reserva Aprobada: {recurso.nombre}', body)


def enviar_correo_rechazo(solicitud):
    """Envía un correo de rechazo al solicitante con el motivo."""
    recurso = solicitud.recurso
    fi = django.utils.timezone.localtime(solicitud.fecha_inicio).strftime('%d/%m/%Y %H:%M')
    ff = django.utils.timezone.localtime(solicitud.fecha_fin).strftime('%H:%M')
    nombre = solicitud.nombre_funcionario or 'Solicitante'
    email_sol = solicitud.email_contacto or (solicitud.solicitante.email if solicitud.solicitante else None)
    motivo = solicitud.motivo_rechazo or 'No especificado.'

    if not email_sol:
        return

    body = _base_template(
        titulo='Solicitud de Reserva Rechazada',
        color_titulo='#dc2626',
        contenido_html=f"""
        <div style="text-align:center;padding:20px 0 28px;">
          <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">❌</div>
          <h2 style="margin:16px 0 4px;color:#1e293b;font-size:20px;font-weight:900;">No fue posible aprobar tu solicitud</h2>
          <p style="color:#64748b;margin:0;font-size:14px;">Hola <strong>{nombre}</strong>, lamentablemente tu solicitud fue rechazada.</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7f7;border-radius:12px;border:1px solid #fecaca;overflow:hidden;margin-bottom:20px;">
          <tr style="background:#fee2e2;"><th colspan="2" style="padding:12px 16px;color:#b91c1c;font-size:11px;font-weight:900;text-align:left;letter-spacing:1px;text-transform:uppercase;">Solicitud Rechazada</th></tr>
          <tr><td style="padding:10px 16px;color:#94a3b8;font-size:12px;width:40%;">Recurso</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{recurso.nombre}</td></tr>
          <tr style="background:#fff7f7;"><td style="padding:10px 16px;color:#94a3b8;font-size:12px;">Horario</td><td style="padding:10px 16px;color:#1e293b;font-size:13px;font-weight:700;">{fi} – {ff} hrs</td></tr>
        </table>
        <div style="background:#fff7f7;border-left:4px solid #ef4444;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;color:#b91c1c;font-size:11px;font-weight:900;letter-spacing:1px;text-transform:uppercase;">Motivo del Rechazo</p>
          <p style="margin:0;color:#1e293b;font-size:14px;">{motivo}</p>
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center;">Puedes ingresar al portal y hacer una nueva solicitud para otro horario disponible.</p>
        """
    )
    _safe_email([email_sol], f'❌ Reserva No Aprobada: {recurso.nombre}', body)
