from django.conf import settings
from django.db import models


class TipoRegistroServicio(models.Model):
    codigo = models.CharField(max_length=60, unique=True)
    nombre = models.CharField(max_length=120)
    descripcion = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)
    orden = models.PositiveSmallIntegerField(default=0)
    usa_folio = models.BooleanField(
        default=False,
        help_text='Si el tipo usa folio (ej. FMS-2568).',
    )
    prefijo_folio = models.CharField(max_length=20, blank=True, default='')
    notificar_al_crear = models.BooleanField(
        default=False,
        help_text='Si está activo, al crear un registro dispara DOC_SERVICIOS.{codigo}_NUEVO '
        '(configurable en panel de tipos de notificación).',
    )
    aviso_solo_ultimo_por_establecimiento = models.BooleanField(
        default=False,
        help_text='Si está activo, los avisos por fecha solo consideran el registro más reciente '
        'por establecimiento (historial se conserva). Útil p. ej. sanitización de estanques.',
    )

    class Meta:
        verbose_name = 'Tipo de registro de servicio'
        verbose_name_plural = 'Tipos de registro de servicio'
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class CampoDefinicion(models.Model):
    TIPO_DATO_CHOICES = [
        ('text', 'Texto'),
        ('number', 'Número'),
        ('date', 'Fecha'),
        ('boolean', 'Sí/No'),
        ('select', 'Lista'),
        ('proveedor', 'Proveedor'),
        ('establecimiento', 'Establecimiento'),
        ('file', 'Archivo'),
        ('folio', 'Folio'),
    ]

    tipo = models.ForeignKey(
        TipoRegistroServicio,
        on_delete=models.CASCADE,
        related_name='campos',
    )
    clave = models.CharField(
        max_length=60,
        help_text='Identificador interno. Reservadas: folio, proveedor, establecimiento, fecha_servicio, archivo',
    )
    etiqueta = models.CharField(max_length=120)
    tipo_dato = models.CharField(max_length=20, choices=TIPO_DATO_CHOICES, default='text')
    obligatorio = models.BooleanField(default=False)
    orden = models.PositiveSmallIntegerField(default=0)
    opciones = models.JSONField(
        default=list,
        blank=True,
        help_text='Opciones para tipo select: ["A","B"] o [{"value":"a","label":"A"}]',
    )
    activo = models.BooleanField(default=True)
    dias_aviso = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Solo campos fecha: primer hito (días antes). También avisa en 60/45/30/20/10/5/1 si aplican.',
    )

    class Meta:
        verbose_name = 'Campo de tipo de registro'
        verbose_name_plural = 'Campos de tipo de registro'
        ordering = ['orden', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['tipo', 'clave'],
                name='uniq_campodef_tipo_clave',
            ),
        ]

    def __str__(self):
        return f'{self.tipo.codigo}.{self.clave}'


class RegistroServicioDoc(models.Model):
    tipo = models.ForeignKey(
        TipoRegistroServicio,
        on_delete=models.PROTECT,
        related_name='registros',
    )
    folio = models.CharField(max_length=80, blank=True, default='', db_index=True)
    proveedor = models.ForeignKey(
        'servicios.Proveedor',
        on_delete=models.PROTECT,
        related_name='registros_doc_servicio',
        null=True,
        blank=True,
    )
    establecimiento = models.ForeignKey(
        'establecimientos.Establecimiento',
        on_delete=models.PROTECT,
        related_name='registros_doc_servicio',
        null=True,
        blank=True,
    )
    fecha_servicio = models.DateField(null=True, blank=True, db_index=True)
    archivo = models.FileField(
        upload_to='documentacion_servicios/%Y/%m/',
        blank=True,
        null=True,
    )
    valores = models.JSONField(default=dict, blank=True)
    avisos_enviados = models.JSONField(
        default=dict,
        blank=True,
        help_text='Último aviso por campo: {clave: "YYYY-MM-DD"}',
    )
    correo_enviado_en = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Última vez que se envió el documento al correo del establecimiento.',
    )
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_doc_servicio_creados',
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Registro de documentación de servicio'
        verbose_name_plural = 'Registros de documentación de servicio'
        ordering = ['-fecha_servicio', '-creado_en']
        permissions = [
            ('configure_tiporegistroservicio', 'Puede configurar tipos y campos de documentación'),
        ]

    def __str__(self):
        return f'{self.tipo.codigo} #{self.pk} {self.folio or ""}'.strip()
