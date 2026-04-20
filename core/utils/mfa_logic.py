import pyotp
import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from core.models import EmailOTP, Profile
from django_otp.plugins.otp_totp.models import TOTPDevice

def generate_otp_code():
    return ''.join(random.choices(string.digits, k=6))

def send_otp_email(user):
    from core.models import EmailConfiguration
    from django.core.mail import get_connection, EmailMessage

    code = generate_otp_code()
    # Invalida códigos anteriores
    EmailOTP.objects.filter(user=user, is_used=False).update(is_used=True)
    
    EmailOTP.objects.create(user=user, code=code)
    
    db_config = EmailConfiguration.get_config()
    
    subject = 'Tu código de seguridad SGAF'
    message = f'''
    Hola {user.first_name or user.username},
    
    Has intentado iniciar sesión en el Sistema de Gestión (SGAF). 
    Tu código de verificación es: {code}
    
    Este código es válido por 10 minutos. 
    Si no has intentado iniciar sesión, ignora este correo.
    '''
    
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
            body=message,
            from_email=db_config.default_from_email or settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
            connection=connection,
        )
        msg.send()
        return True
    except Exception as e:
        print(f"[MFA EMAIL ERROR] {e}")
        return False

def verify_email_otp(user, code):
    otp = EmailOTP.objects.filter(user=user, code=code, is_used=False).first()
    if otp and otp.is_valid():
        otp.is_used = True
        otp.save()
        return True
    return False

def get_totp_device(user, confirmed=True):
    return TOTPDevice.objects.filter(user=user, confirmed=confirmed).first()

def verify_totp_code(user, code):
    device = get_totp_device(user)
    if device and device.verify_token(code):
        return True
    return False
