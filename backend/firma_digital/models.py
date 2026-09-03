import os
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models

SELLO_IMAGE_EXTENSIONS = ('svg', 'png', 'jpg', 'jpeg')
_sello_image_validator = FileExtensionValidator(allowed_extensions=SELLO_IMAGE_EXTENSIONS)


def sello_firma_upload_to(instance, filename):
    _, ext = os.path.splitext(filename)
    ext = (ext or '.png').lower()
    slug = f'sello_{instance.pk or "nuevo"}'
    return f'sellos_firma/{slug}{ext}'


class SelloFirma(models.Model):
    """Sello visual reutilizable ligado a un nivel del organigrama."""

    nombre = models.CharField('Nombre', max_length=120)
    imagen = models.ImageField('Imagen', upload_to=sello_firma_upload_to)
    activo = models.BooleanField('Activo', default=True)

    subdireccion = models.ForeignKey(
        'funcionarios.Subdireccion',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sellos_firma',
        verbose_name='Subdirección',
    )
    departamento = models.ForeignKey(
        'funcionarios.Departamento',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sellos_firma',
        verbose_name='Departamento',
    )
    unidad = models.ForeignKey(
        'funcionarios.Unidad',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sellos_firma',
        verbose_name='Unidad',
    )

    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Sello de firma'
        verbose_name_plural = 'Sellos de firma'
        ordering = ['nombre']
        permissions = [
            ('can_firmar', 'Puede firmar digitalmente'),
            ('can_probar_firma', 'Puede usar firma digital (prueba)'),
        ]

    def __str__(self):
        return f'{self.nombre} ({self.nivel_label})'

    @property
    def nivel(self):
        if self.unidad_id:
            return 'unidad'
        if self.departamento_id:
            return 'departamento'
        if self.subdireccion_id:
            return 'subdireccion'
        return None

    @property
    def nivel_label(self):
        labels = {
            'unidad': 'Unidad',
            'departamento': 'Departamento',
            'subdireccion': 'Subdirección',
        }
        return labels.get(self.nivel, 'Sin órgano')

    @property
    def organo_nombre(self):
        if self.unidad_id:
            return str(self.unidad)
        if self.departamento_id:
            return str(self.departamento)
        if self.subdireccion_id:
            return str(self.subdireccion)
        return ''

    def clean(self):
        levels = [
            bool(self.subdireccion_id),
            bool(self.departamento_id),
            bool(self.unidad_id),
        ]
        if sum(levels) != 1:
            raise ValidationError(
                'Debe asignar el sello a exactamente un nivel: '
                'Subdirección, Departamento o Unidad.'
            )

        if self.activo:
            qs = SelloFirma.objects.filter(activo=True)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if self.unidad_id:
                qs = qs.filter(unidad_id=self.unidad_id)
            elif self.departamento_id:
                qs = qs.filter(departamento_id=self.departamento_id)
            else:
                qs = qs.filter(subdireccion_id=self.subdireccion_id)
            if qs.exists():
                raise ValidationError(
                    'Ya existe un sello activo para este órgano. '
                    'Desactive el anterior o edítelo.'
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


def pendiente_upload_to(instance, filename):
    _, ext = os.path.splitext(filename)
    ext = (ext or '.pdf').lower()
    return f'firmas_pendientes/{instance.codigo_interno or "doc"}{ext}'


def firmado_upload_to(instance, filename):
    _, ext = os.path.splitext(filename)
    ext = (ext or '.pdf').lower()
    return f'firmas_completadas/{instance.codigo_interno or "doc"}{ext}'


class FirmaPendiente(models.Model):
    """Documento encolado para firma digital (bandeja)."""

    ESTADO_PENDIENTE = 'pendiente'
    ESTADO_FIRMADO = 'firmado'
    ESTADO_RECHAZADO = 'rechazado'
    ESTADO_CHOICES = [
        (ESTADO_PENDIENTE, 'Pendiente'),
        (ESTADO_FIRMADO, 'Firmado'),
        (ESTADO_RECHAZADO, 'Rechazado'),
    ]

    codigo_interno = models.CharField(max_length=40, unique=True, blank=True)
    titulo = models.CharField(max_length=255)
    origen = models.CharField(max_length=64, help_text='rc, contrato, factura, …')
    referencia_id = models.PositiveIntegerField()
    meta = models.JSONField(default=dict, blank=True)

    estado = models.CharField(
        max_length=20, choices=ESTADO_CHOICES, default=ESTADO_PENDIENTE, db_index=True
    )
    firmante = models.ForeignKey(
        'funcionarios.Funcionario',
        on_delete=models.PROTECT,
        related_name='firmas_pendientes',
    )
    grupo_firmante = models.ForeignKey(
        'funcionarios.Grupo',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='firmas_pendientes',
    )
    solicitado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='firmas_solicitadas',
    )

    archivo_origen = models.FileField(upload_to=pendiente_upload_to, blank=True, null=True)
    archivo_firmado = models.FileField(upload_to=firmado_upload_to, blank=True, null=True)
    documento_registro = models.ForeignKey(
        'DocumentoFirmado',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='pendientes',
    )

    motivo_rechazo = models.TextField(blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    firmado_en = models.DateTimeField(null=True, blank=True)
    rechazado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Firma pendiente'
        verbose_name_plural = 'Firmas pendientes'
        ordering = ['-creado_en']
        indexes = [
            models.Index(fields=['estado', 'firmante']),
            models.Index(fields=['origen', 'referencia_id']),
        ]

    def __str__(self):
        return f'{self.codigo_interno} · {self.titulo} ({self.estado})'

    def save(self, *args, **kwargs):
        if not self.codigo_interno:
            from django.utils import timezone

            year = timezone.localtime().year
            prefix = f'FP-{year}-'
            last = (
                FirmaPendiente.objects.filter(codigo_interno__startswith=prefix)
                .order_by('-codigo_interno')
                .values_list('codigo_interno', flat=True)
                .first()
            )
            seq = 1
            if last:
                try:
                    seq = int(str(last).rsplit('-', 1)[-1]) + 1
                except ValueError:
                    seq = (
                        FirmaPendiente.objects.filter(codigo_interno__startswith=prefix).count()
                        + 1
                    )
            self.codigo_interno = f'{prefix}{seq:04d}'
        super().save(*args, **kwargs)


class DocumentoFirmado(models.Model):
    """
    Registro de documentos firmados vía SGAF para validación pública.
    No almacena el PDF; solo metadatos + hash SHA-256.
    """

    codigo = models.CharField('Código', max_length=32, unique=True, db_index=True)
    hash_sha256 = models.CharField('Hash SHA-256', max_length=64, db_index=True)
    nombre_archivo = models.CharField('Nombre de archivo', max_length=255, blank=True, default='')
    origen = models.CharField(
        'Origen',
        max_length=64,
        default='prueba',
        help_text='Módulo o flujo que generó la firma (prueba, rc, contrato, …).',
    )
    purpose = models.CharField('Propósito FirmaGob', max_length=64, blank=True, default='')
    firmante_nombre = models.CharField('Firmante', max_length=200, blank=True, default='')
    firmante_run = models.CharField('RUN firmante', max_length=12, blank=True, default='')
    firmante_cargo = models.CharField('Cargo', max_length=200, blank=True, default='')
    firmado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_firmados',
        verbose_name='Usuario del sistema',
    )
    firmado_en = models.DateTimeField('Firmado en', auto_now_add=True)

    class Meta:
        verbose_name = 'Documento firmado'
        verbose_name_plural = 'Documentos firmados'
        ordering = ['-firmado_en']

    def __str__(self):
        return self.codigo


def sello_fondo_upload_to(_instance, filename):
    _, ext = os.path.splitext(filename)
    ext = (ext or '.png').lower()
    return f'firma_sello/{uuid.uuid4().hex}{ext}'


class ConfiguracionSelloFirma(models.Model):
    """Imágenes de fondo del sello visible. El texto lo dibuja FirmaGob (layer2)."""

    logo = models.FileField(
        'Logo institucional',
        upload_to=sello_fondo_upload_to,
        blank=True,
        validators=[_sello_image_validator],
        help_text='SVG, PNG o JPG. Se coloca a la izquierda del recuadro, sin deformar.',
    )
    imagen_firma = models.FileField(
        'Imagen de firma',
        upload_to=sello_fondo_upload_to,
        blank=True,
        validators=[_sello_image_validator],
        help_text='SVG, PNG o JPG. Se coloca a la derecha del recuadro, sin deformar.',
    )
    ancho_pt = models.PositiveIntegerField(
        'Ancho del recuadro (pt)',
        default=205,
        help_text=(
            'Ancho de la caja que FirmaGob usa para dibujar el texto. '
            'A mayor ancho, el nombre se parte menos. Default oficial 205×84. '
            'Sugeridos: 280×100 o 320×110.'
        ),
    )
    alto_pt = models.PositiveIntegerField(
        'Alto del recuadro (pt)',
        default=84,
        help_text=(
            'Alto de la caja del sello en puntos PDF. Default oficial 84. '
            'Sugeridos junto al ancho: 280×100 o 320×110.'
        ),
    )
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Configuración de sello (FirmaGob)'
        verbose_name_plural = 'Configuración de sello (FirmaGob)'

    def __str__(self):
        return 'Sello visible FirmaGob'

    def clean(self):
        if self.ancho_pt < 80 or self.alto_pt < 40:
            raise ValidationError('El recuadro del sello es demasiado pequeño (mín. 80×40 pt).')
        if self.ancho_pt > 400 or self.alto_pt > 200:
            raise ValidationError('El recuadro del sello es demasiado grande (máx. 400×200 pt).')
        if not self.pk and ConfiguracionSelloFirma.objects.exists():
            raise ValidationError('Solo puede existir una configuración de sello.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def get_solo(cls):
        return cls.objects.first()
