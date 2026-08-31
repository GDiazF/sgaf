from django.conf import settings
from django.contrib.auth.models import Group, User
from django.db import models


class TipoNotificacion(models.Model):
    """Catálogo admin: canales, SMTP y destinatarios por tipo de evento."""

    codigo = models.CharField(max_length=80, unique=True, help_text="Ej: TICKETS.NUEVO")
    modulo = models.CharField(max_length=40, db_index=True)
    evento = models.CharField(max_length=40, db_index=True)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)

    enviar_campana = models.BooleanField(default=True)
    enviar_email = models.BooleanField(default=False)

    cuenta_smtp = models.ForeignKey(
        'comunicaciones.CuentaSMTP',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tipos_notificacion',
        verbose_name='Cuenta SMTP',
    )
    plantilla = models.ForeignKey(
        'comunicaciones.PlantillaCorreo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tipos_notificacion',
        verbose_name='Plantilla de correo',
    )

    grupos = models.ManyToManyField(
        'funcionarios.Grupo',
        blank=True,
        related_name='tipos_notificacion',
        verbose_name='Grupos de funcionarios',
    )
    roles = models.ManyToManyField(
        Group,
        blank=True,
        related_name='tipos_notificacion',
        verbose_name='Roles (Django)',
    )
    usuarios = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='tipos_notificacion_destinatario',
        verbose_name='Usuarios destinatarios',
    )
    emails_adicionales = models.TextField(
        blank=True,
        default='',
        help_text='Solo canal email. Separados por coma, punto y coma o salto de línea.',
    )

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Tipo de notificación'
        verbose_name_plural = 'Tipos de notificación'
        ordering = ['modulo', 'evento']
        constraints = [
            models.UniqueConstraint(fields=['modulo', 'evento'], name='uniq_tiponotif_modulo_evento'),
        ]

    def __str__(self):
        return f'{self.codigo} ({self.nombre})'


class Notificacion(models.Model):
    TIPO_CHOICES = [
        ('INFO', 'Información'),
        ('SUCCESS', 'Éxito'),
        ('WARNING', 'Advertencia'),
        ('ERROR', 'Error'),
        ('TICKET', 'Ticket de Soporte'),
        ('FIRMA', 'Firma digital'),
    ]

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='INFO')
    modulo = models.CharField(max_length=40, blank=True, default='', db_index=True)
    evento = models.CharField(max_length=40, blank=True, default='', db_index=True)
    link = models.CharField(max_length=255, null=True, blank=True)
    contexto = models.JSONField(default=dict, blank=True)
    dedupe_key = models.CharField(max_length=191, blank=True, null=True, db_index=True)
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-fecha_creacion']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'dedupe_key'],
                condition=models.Q(dedupe_key__isnull=False) & ~models.Q(dedupe_key=''),
                name='uniq_notif_usuario_dedupe',
            ),
        ]

    def __str__(self):
        return f'{self.titulo} - {self.usuario.username}'


class FuenteViva(models.Model):
    """
    Cola en vivo (polling): no crea filas en Notificacion.
    handler_key apunta a notificaciones.handlers.LIVE_HANDLERS.
    """

    codigo = models.CharField(max_length=80, unique=True)
    nombre = models.CharField(max_length=120)
    titulo_bloque = models.CharField(
        max_length=120,
        help_text='Título opcional en UI; vacío = solo lista de ítems',
        blank=True,
        default='',
    )
    handler_key = models.CharField(
        max_length=80,
        help_text='Clave en LIVE_HANDLERS, ej. reservas_pendientes',
    )
    activo = models.BooleanField(default=True)
    orden = models.PositiveSmallIntegerField(default=0)
    proposito_operativo = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text='Legado. Preferir destinatarios M2M o TipoNotificacion (ej. RESERVAS.AVISO_ADMIN).',
    )

    grupos = models.ManyToManyField(
        'funcionarios.Grupo',
        blank=True,
        related_name='fuentes_vivas',
    )
    roles = models.ManyToManyField(
        Group,
        blank=True,
        related_name='fuentes_vivas',
    )
    usuarios = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='fuentes_vivas_destinatario',
    )

    class Meta:
        verbose_name = 'Fuente viva (polling)'
        verbose_name_plural = 'Fuentes vivas (polling)'
        ordering = ['orden', 'codigo']

    def __str__(self):
        return self.codigo


class JobProgramado(models.Model):
    """Job a hora fija (scheduler integrado). Sin cron de respaldos."""

    codigo = models.CharField(max_length=80, unique=True)
    nombre = models.CharField(max_length=120)
    handler_key = models.CharField(
        max_length=80,
        help_text='Clave en JOB_HANDLERS, ej. vehiculos_vencimientos',
    )
    hora = models.TimeField(help_text='Hora local America/Santiago')
    activo = models.BooleanField(default=True)
    ultima_ejecucion = models.DateTimeField(null=True, blank=True)
    ultima_fecha_corrida = models.DateField(
        null=True,
        blank=True,
        help_text='Fecha local del último run exitoso (anti-doble en el día)',
    )

    class Meta:
        verbose_name = 'Job programado'
        verbose_name_plural = 'Jobs programados'
        ordering = ['hora', 'codigo']

    def __str__(self):
        return f'{self.codigo} @ {self.hora}'
