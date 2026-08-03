from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.utils.encryption import encrypt_value, decrypt_value

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
    
    # Consentimiento de Privacidad (Art. 12 / 14 ter)
    acepto_terminos = models.BooleanField(default=False, verbose_name="Aceptó Políticas de Privacidad")
    fecha_aceptacion = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Aceptación")
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.mfa_secret:
            self.mfa_secret = decrypt_value(self.mfa_secret)

    def save(self, *args, **kwargs):
        plain_mfa_secret = self.mfa_secret
        if self.mfa_secret:
            self.mfa_secret = encrypt_value(self.mfa_secret)
        super().save(*args, **kwargs)
        self.mfa_secret = plain_mfa_secret

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
    
    # Notificaciones específicas (soporta lista separada por comas)
    reservas_admin_email = models.CharField(max_length=500, default='ssgg@slepiquique.cl', help_text="Emails que reciben avisos (separar por comas para varios)", verbose_name="Emails Admin Reservas")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.smtp_password:
            self.smtp_password = decrypt_value(self.smtp_password)

    def save(self, *args, **kwargs):
        plain_password = self.smtp_password
        if self.smtp_password:
            self.smtp_password = encrypt_value(self.smtp_password)
        super().save(*args, **kwargs)
        self.smtp_password = plain_password

    def get_reservas_emails_list(self):
        if not self.reservas_admin_email:
            return []
        return [e.strip() for e in self.reservas_admin_email.split(',') if e.strip()]

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


class DocumentAsset(models.Model):
    """Repositorio de imágenes para reportes (Logos, firmas, sellos)"""
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Asset")
    archivo = models.ImageField(upload_to='report_assets/', verbose_name="Archivo de Imagen")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción")
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Asset de Documento"
        verbose_name_plural = "Assets de Documentos"

    def __str__(self):
        return self.nombre


class ReportConfiguration(models.Model):
    """Configuración dinámica de logos y colores por tipo de reporte"""
    DOCUMENT_TYPES = [
        ('RC_BASIC', 'Recepción Conforme (Servicios Básicos/Pagos)'),
        ('RC_ADQ', 'Recepción Conforme (Adquisiciones/Facturas)'),
        ('ACTA_CONTRATO', 'Acta de Conformidad (Contratos)'),
        ('ORDEN_PAGO', 'Orden de Pago'),
    ]
    
    report_type = models.CharField(
        max_length=50, 
        choices=DOCUMENT_TYPES, 
        unique=True, 
        verbose_name="Tipo de Reporte"
    )
    
    logo_izquierdo = models.ForeignKey(
        DocumentAsset, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='logos_izquierdos',
        verbose_name="Logo Izquierdo (Encabezado)"
    )
    
    logo_derecho = models.ForeignKey(
        DocumentAsset, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='logos_derechos',
        verbose_name="Logo Derecho (Encabezado)"
    )
    
    logo_pie_pagina = models.ForeignKey(
        DocumentAsset, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='logos_pie',
        verbose_name="Logo Pie de Página"
    )
    
    color_primario = models.CharField(
        max_length=7, 
        default='#000000', 
        help_text="Color hexadecimal para franjas o detalles (ej: #004488)",
        verbose_name="Color Primario"
    )
    
    color_secundario = models.CharField(
        max_length=7, 
        default='#FFFFFF',
        verbose_name="Color Secundario"
    )

    class Meta:
        verbose_name = "Configuración de Reporte"
        verbose_name_plural = "Configuraciones de Reportes"

    def __str__(self):
        return self.get_report_type_display()

    @classmethod
    def get_for_type(cls, report_type):
        """Retorna la configuración para un tipo, o None si no existe"""
        return cls.objects.filter(report_type=report_type).first()


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Usuario")
    action = models.CharField(max_length=50, verbose_name="Acción")  # e.g., CREACION, MODIFICACION, ELIMINACION
    model_name = models.CharField(max_length=100, verbose_name="Modelo Afectado")
    object_id = models.CharField(max_length=50, blank=True, null=True, verbose_name="ID Objeto")
    details = models.TextField(blank=True, null=True, verbose_name="Detalles")
    changes = models.JSONField(default=dict, blank=True, verbose_name="Cambios")
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name="Dirección IP")
    user_agent = models.TextField(blank=True, null=True, verbose_name="User Agent")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")

    class Meta:
        verbose_name = "Registro de Auditoría"
        verbose_name_plural = "Registros de Auditoría"
        ordering = ['-timestamp']

    def __str__(self):
        actor = self.user.username if self.user else "Sistema"
        return f"{actor} - {self.action} en {self.model_name} ({self.timestamp})"


class BreachReport(models.Model):
    ESTADO_CSIRT_CHOICES = [
        ('NO_REPORTADO', 'No Reportado'),
        ('ALERTA_TEMPRANA', 'Alerta Temprana (3h)'),
        ('ACTUALIZACION', 'Actualización (72h)'),
        ('INFORME_FINAL', 'Informe Final (15 días)'),
    ]

    titulo = models.CharField(max_length=200, verbose_name="Título del Incidente")
    descripcion = models.TextField(verbose_name="Descripción Técnica / Vulnerabilidad")
    tipo_amenaza = models.CharField(max_length=150, blank=True, null=True, verbose_name="Tipo de Amenaza (Ej. Ransomware, Phishing)")
    gravedad_incidente = models.CharField(max_length=50, blank=True, null=True, verbose_name="Gravedad / Impacto Inicial")
    
    # Tiempos
    fecha_incidente = models.DateTimeField(verbose_name="Fecha/Hora Estimada del Incidente")
    fecha_descubrimiento = models.DateTimeField(verbose_name="Fecha/Hora de Descubrimiento")
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")
    
    # Alcance de la brecha
    estimacion_afectados = models.PositiveIntegerField(default=0, verbose_name="Número Estimado de Afectados")
    datos_comprometidos = models.TextField(blank=True, null=True, help_text="Ej: Nombres, RUT, claves, etc.", verbose_name="Categorías de Datos Afectados")
    
    # Acciones de mitigación
    medidas_mitigacion = models.TextField(blank=True, null=True, verbose_name="Medidas de Solución / Mitigación Adoptadas")
    
    # Ley de Datos (APDP)
    notificado_agencia = models.BooleanField(default=False, verbose_name="Reportado a la Agencia (APDP)")
    fecha_notificacion_agencia = models.DateTimeField(blank=True, null=True, verbose_name="Fecha de Reporte a la Agencia APDP")
    notificado_titulares = models.BooleanField(default=False, verbose_name="Notificado a los Funcionarios Afectados")
    fecha_notificacion_titulares = models.DateTimeField(blank=True, null=True, verbose_name="Fecha de Notificación a Titulares")

    # Ley Marco Ciberseguridad (CSIRT Nacional)
    estado_csirt = models.CharField(max_length=50, choices=ESTADO_CSIRT_CHOICES, default='NO_REPORTADO', verbose_name="Estado Reporte CSIRT")
    fecha_alerta_temprana = models.DateTimeField(blank=True, null=True, verbose_name="Fecha Alerta Temprana")
    fecha_actualizacion = models.DateTimeField(blank=True, null=True, verbose_name="Fecha Actualización")
    fecha_informe_final = models.DateTimeField(blank=True, null=True, verbose_name="Fecha Informe Final")

    registrado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Registrado Por")

    class Meta:
        verbose_name = "Reporte de Incidente / Brecha"
        verbose_name_plural = "Reportes de Incidentes y Brechas"
        ordering = ['-fecha_descubrimiento']

    def __str__(self):
        return f"{self.titulo} ({self.fecha_descubrimiento.date() if self.fecha_descubrimiento else 'Sin fecha'})"


class CiberseguridadPlan(models.Model):
    TIPO_PLAN_CHOICES = [
        ('CONTINUIDAD', 'Continuidad Operacional'),
        ('RECUPERACION', 'Recuperación ante Desastres (DRP)'),
        ('RIESGOS', 'Gestión de Riesgos'),
        ('OTRO', 'Otro Plan'),
    ]
    titulo = models.CharField(max_length=200, verbose_name="Título del Plan")
    tipo = models.CharField(max_length=50, choices=TIPO_PLAN_CHOICES, verbose_name="Tipo de Plan")
    documento = models.FileField(upload_to='ciberseguridad/planes/', verbose_name="Documento (PDF)")
    fecha_aprobacion = models.DateField(verbose_name="Fecha de Aprobación")
    fecha_proxima_revision = models.DateField(verbose_name="Fecha Próxima Revisión")
    activo = models.BooleanField(default=True, verbose_name="Plan Activo")

    class Meta:
        verbose_name = "Plan de Ciberseguridad"
        verbose_name_plural = "Planes de Ciberseguridad"
        ordering = ['fecha_proxima_revision']

    def __str__(self):
        return f"{self.titulo} ({self.get_tipo_display()})"


class CiberseguridadCapacitacion(models.Model):
    nombre_campana = models.CharField(max_length=200, verbose_name="Nombre de la Campaña")
    descripcion = models.TextField(verbose_name="Descripción de la Capacitación / Ciberhigiene")
    documento = models.FileField(upload_to='ciberseguridad/capacitaciones/', blank=True, null=True, verbose_name="Material Adjunto")
    fecha_inicio = models.DateField(verbose_name="Fecha de Inicio")
    fecha_termino = models.DateField(blank=True, null=True, verbose_name="Fecha de Término")
    
    class Meta:
        verbose_name = "Campaña de Ciberhigiene"
        verbose_name_plural = "Campañas de Ciberhigiene"
        ordering = ['-fecha_inicio']

    def __str__(self):
        return self.nombre_campana

