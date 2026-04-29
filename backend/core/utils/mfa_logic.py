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
    from comunicaciones.utils import enviar_correo_maestro
    
    code = generate_otp_code()
    # Invalida códigos anteriores
    EmailOTP.objects.filter(user=user, is_used=False).update(is_used=True)
    EmailOTP.objects.create(user=user, code=code)
    
    contexto = {
        'nombre': user.first_name or user.username,
        'codigo': code
    }
    
    return enviar_correo_maestro('MFA', [user.email], contexto)

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
