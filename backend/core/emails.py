from django.core.mail import send_mail
from django.conf import settings
import threading
import json
import os
from datetime import date
import django.utils.timezone

# Reuse the counter logic from reservations to maintain the daily limit globally
# We'll use a shared counter file in the root media or somewhere accessible
_COUNTER_FILE = os.path.join(settings.BASE_DIR, 'media', '.global_email_counter.json')
_counter_lock = threading.Lock()

def _get_daily_count():
    try:
        with open(_COUNTER_FILE, 'r') as f:
            data = json.load(f)
        if data.get('date') == str(date.today()):
            return data.get('count', 0)
    except:
        pass
    return 0

def _increment_daily_count():
    today = str(date.today())
    try:
        if not os.path.exists(os.path.dirname(_COUNTER_FILE)):
            os.makedirs(os.path.dirname(_COUNTER_FILE))
            
        with open(_COUNTER_FILE, 'r') as f:
            data = json.load(f)
        if data.get('date') != today:
            data = {'date': today, 'count': 0}
    except:
        data = {'date': today, 'count': 0}
        
    data['count'] += 1
    with open(_COUNTER_FILE, 'w') as f:
        json.dump(data, f)
    return data['count']

def _log_event(msg):
    log_file = os.path.join(settings.BASE_DIR, 'media', 'core_email_debug.log')
    try:
        timestamp = django.utils.timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {msg}\n")
    except:
        pass

def _safe_email(to_list, subject, html_body):
    if not to_list or not any(to_list):
        return

    daily_limit = getattr(settings, 'EMAIL_DAILY_LIMIT', 200)

    def _send():
        from core.models import EmailConfiguration
        from django.core.mail import get_connection, EmailMessage
        
        db_config = EmailConfiguration.get_config()

        with _counter_lock:
            current = _get_daily_count()
            if current >= daily_limit:
                _log_event(f"[BLOQUEADO] Límite diario ({daily_limit}) alcanzado. No se envió: {subject}")
                return
            new_count = _increment_daily_count()

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
            
            msg = EmailMessage(
                subject=subject,
                body=html_body,
                from_email=db_config.default_from_email or settings.DEFAULT_FROM_EMAIL,
                to=[r for r in to_list if r],
                connection=connection,
            )
            msg.content_subtype = "html"
            msg.send()
            
            _log_event(f"[SUCCESS] Enviado a {to_list} | {subject}")
        except Exception as e:
            _log_event(f"[ERROR] Falló envío a {to_list}: {str(e)}")

    threading.Thread(target=_send, daemon=True).start()

def _base_template(titulo, contenido_html):
    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
            <!-- HEADER -->
            <tr>
              <td style="background:#1e293b;padding:32px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">SLEP Iquique · Sistema de Gestión</p>
                <h1 style="margin:12px 0 0;color:#fff;font-size:24px;font-weight:900;">{titulo}</h1>
              </td>
            </tr>
            <!-- BODY -->
            <tr>
              <td style="padding:40px;background:#ffffff;">
                {contenido_html}
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td style="background:#f8fafc;padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                  Este es un mensaje automático del Sistema SGAF.<br>
                  © {date.today().year} Servicio Local de Educación Pública Iquique
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
    """

def enviar_correo_reset_password(email, nombre, reset_url):
    from comunicaciones.utils import enviar_correo_maestro
    
    contexto = {
        'nombre': nombre,
        'reset_url': reset_url
    }
    
    # Verificación de límite diario (opcional, pero buena práctica mantenerla)
    daily_limit = getattr(settings, 'EMAIL_DAILY_LIMIT', 200)
    with _counter_lock:
        if _get_daily_count() >= daily_limit:
            _log_event(f"[BLOQUEADO] Límite diario alcanzado para Reset Password: {email}")
            return False
        _increment_daily_count()

    return enviar_correo_maestro('RESET_PASSWORD', [email], contexto)
