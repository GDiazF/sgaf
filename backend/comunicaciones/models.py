from django.conf import settings
from django.db import models

class CuentaSMTP(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Cuenta", help_text="Ej: Notificaciones Generales")
    smtp_host = models.CharField(max_length=255, verbose_name="Servidor SMTP")
    smtp_port = models.IntegerField(default=587, verbose_name="Puerto SMTP")
    smtp_user = models.CharField(max_length=255, verbose_name="Usuario/Email SMTP")
    smtp_password = models.CharField(max_length=255, verbose_name="Contraseña SMTP")
    smtp_use_tls = models.BooleanField(default=True, verbose_name="Usar TLS")
    smtp_use_ssl = models.BooleanField(default=False, verbose_name="Usar SSL")
    remitente_nombre = models.CharField(max_length=100, default="SGAF", verbose_name="Nombre del Remitente")
    remitente_email = models.EmailField(verbose_name="Email del Remitente", help_text="Debe ser el mismo que el usuario o uno autorizado")
    es_default = models.BooleanField(default=False, verbose_name="Cuenta por Defecto")

    class Meta:
        verbose_name = "Cuenta SMTP"
        verbose_name_plural = "Cuentas SMTP"

    def __str__(self):
        return f"{self.nombre} ({self.smtp_user})"

    def save(self, *args, **kwargs):
        if self.es_default:
            # Desmarcar otros default
            CuentaSMTP.objects.exclude(pk=self.pk).update(es_default=False)
        super().save(*args, **kwargs)

class PlantillaCorreo(models.Model):
    PROPOSITO_CHOICES = [
        ('MFA', 'Código MFA (2FA)'),
        ('RESET_PASSWORD', 'Recuperación de Contraseña'),
        ('RESERVA_SOLICITUD', 'Nueva Solicitud de Reserva (Usuario)'),
        ('RESERVA_APROBACION', 'Reserva Aprobada/Rechazada'),
        ('RESERVA_AVISO_ADMIN', 'Aviso a Admin de Nueva Reserva'),
        ('RESERVA_RECORDATORIO', 'Recordatorio de Reserva (Automático)'),
        ('ALERTA_VENCIMIENTO_VEHICULO', 'Alerta de Vencimiento de Documento Vehicular'),
        ('DOC_SERVICIOS_NUEVO', 'Documentación de servicios: nuevo registro'),
        ('DOC_SERVICIOS_AVISO', 'Documentación de servicios: aviso por fecha'),
        ('DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO', 'Documentación de servicios: envío al establecimiento'),
        ('TEST', 'Correo de Prueba'),
    ]

    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Plantilla")
    proposito = models.CharField(max_length=50, choices=PROPOSITO_CHOICES, unique=True, verbose_name="Propósito")
    asunto = models.CharField(max_length=255, verbose_name="Asunto del Correo")
    cuerpo_html = models.TextField(verbose_name="Cuerpo HTML", help_text="Puedes usar variables como {{ nombre }}, {{ codigo }}, etc.")
    cuerpo_texto = models.TextField(verbose_name="Cuerpo de Texto Plano (Opcional)", blank=True, null=True)
    cuenta_smtp = models.ForeignKey(CuentaSMTP, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Cuenta de Envío Específica")
    
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Plantilla de Correo"
        verbose_name_plural = "Plantillas de Correo"

    def __str__(self):
        return f"{self.get_proposito_display()} - {self.nombre}"


class DestinatariosCorreoOperativo(models.Model):
    proposito = models.CharField(
        max_length=50,
        choices=PlantillaCorreo.PROPOSITO_CHOICES,
        unique=True,
        verbose_name="Propósito"
    )
    grupos = models.ManyToManyField(
        'funcionarios.Grupo',
        blank=True,
        verbose_name="Grupos destinatarios"
    )
    usuarios = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        verbose_name="Usuarios destinatarios"
    )
    emails_adicionales = models.TextField(
        blank=True,
        default='',
        verbose_name="Emails adicionales",
        help_text="Correos externos o institucionales separados por coma, punto y coma o salto de línea."
    )
    activo = models.BooleanField(default=True, verbose_name="Activo")
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Destinatarios de Correo Operativo"
        verbose_name_plural = "Destinatarios de Correos Operativos"

    def __str__(self):
        return self.get_proposito_display()
