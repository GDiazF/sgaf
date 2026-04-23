from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

def user_avatar_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/avatars/user_<id>/<filename>
    return f'avatars/user_{instance.user.id}/{filename}'

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to=user_avatar_path, null=True, blank=True)
    
    # Configuración de MFA
    mfa_enabled = models.BooleanField(default=False, verbose_name="MFA Activo")
    mfa_method = models.CharField(
        max_length=20, 
        choices=[('TOTP', 'App de Autenticación'), ('EMAIL', 'Correo Electrónico')], 
        verbose_name="Método MFA Preferido"
    )
    mfa_enforced = models.BooleanField(default=False, verbose_name="MFA Obligatorio (Admin)")
    mfa_secret = models.CharField(max_length=100, null=True, blank=True) # Para TOTP
    
    def __str__(self):
        return f"Perfil de {self.user.username}"

class TrustedDevice(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trusted_devices')
    device_token = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=100, default="Dispositivo conocido")
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Dispositivo de Confianza"
        verbose_name_plural = "Dispositivos de Confianza"

    def __str__(self):
        return f"{self.name} - {self.user.username}"

@receiver(post_save, sender=User)
def handle_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    else:
        # Use get_or_create to handle existing users without profiles
        Profile.objects.get_or_create(user=instance)

class LinkInteres(models.Model):
    TIPO_CHOICES = [
        ('LINK', 'Link de Interés'),
        ('RED_SOCIAL', 'Red Social'),
    ]

    titulo = models.CharField(max_length=100, verbose_name="Título")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='LINK', verbose_name="Tipo")
    url = models.URLField(verbose_name="URL")
    icono = models.CharField(max_length=50, default='Link', help_text="Nombre del icono de Lucide (ej: Link, Globe, Box)")
    descripcion = models.TextField(null=True, blank=True, verbose_name="Descripción")
    orden = models.IntegerField(default=0, verbose_name="Orden de visualización")
    activo = models.BooleanField(default=True, verbose_name="Activo")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Link de Interés"
        verbose_name_plural = "Links de Interés"
        ordering = ['orden', 'titulo']

    def __str__(self):
        return f"{self.titulo} ({self.tipo})"

class EmailOTP(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def is_valid(self):
        from django.utils import timezone
        import datetime
        # Válido por 10 minutos
        return not self.is_used and self.created_at >= timezone.now() - datetime.timedelta(minutes=10)

    def __str__(self):
        return f"OTP {self.code} para {self.user.username}"

    class Meta:
        ordering = ['-created_at']

class SecurityConfig(models.Model):
    force_mfa_all = models.BooleanField(default=False, verbose_name="Forzar MFA para todos los usuarios")
    
    class Meta:
        verbose_name = "Configuración de Seguridad"
        verbose_name_plural = "Configuraciones de Seguridad"

    def __str__(self):
        return "Configuración Global de Seguridad"

    @classmethod
    def get_config(cls):
        config, created = cls.objects.get_or_create(id=1)
        return config

class MFASession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(primary_key=True)
    method = models.CharField(max_length=20, default='EMAIL')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        from django.utils import timezone
        return self.expires_at > timezone.now()

    def __str__(self):
        return f"Sesión MFA para {self.user.username}"

class EmailConfiguration(models.Model):
    smtp_host = models.CharField(max_length=255, default='smtp.gmail.com', verbose_name="Servidor SMTP")
    smtp_port = models.IntegerField(default=587, verbose_name="Puerto SMTP")
    smtp_user = models.EmailField(blank=True, null=True, verbose_name="Usuario SMTP")
    smtp_password = models.CharField(max_length=255, blank=True, null=True, verbose_name="Contraseña SMTP")
    smtp_use_tls = models.BooleanField(default=True, verbose_name="Usar TLS")
    smtp_use_ssl = models.BooleanField(default=False, verbose_name="Usar SSL")
    default_from_email = models.CharField(max_length=255, default='SLEP Iquique <noreply@slepiquique.cl>', verbose_name="Remitente por Defecto")
    
    # Notificaciones específicas
    reservas_admin_email = models.EmailField(default='ssgg@slepiquique.cl', help_text="Email que recibe avisos de nuevas reservas", verbose_name="Email Admin Reservas")

    class Meta:
        verbose_name = "Configuración de Correo"
        verbose_name_plural = "Configuraciones de Correo"

    def __str__(self):
        return "Configuración Global de Correo"

    @classmethod
    def get_config(cls):
        # Intentar obtener la configuración 1, o crearla con valores de settings.py si no existe
        from django.conf import settings
        config_obj, created = cls.objects.get_or_create(id=1)
        if created:
            # Poblar con valores iniciales de settings si es la primera vez
            config_obj.smtp_host = getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com')
            config_obj.smtp_port = getattr(settings, 'EMAIL_PORT', 587)
            config_obj.smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')
            config_obj.smtp_password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
            config_obj.smtp_use_tls = getattr(settings, 'EMAIL_USE_TLS', True)
            config_obj.smtp_use_ssl = getattr(settings, 'EMAIL_USE_SSL', False)
            config_obj.default_from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
            config_obj.reservas_admin_email = getattr(settings, 'RESERVAS_ADMIN_EMAIL', '')
            config_obj.save()
        return config_obj
