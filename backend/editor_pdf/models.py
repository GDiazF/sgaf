from django.db import models


class HerramientaPdf(models.Model):
    slug = models.SlugField('Identificador', max_length=80, unique=True)
    nombre = models.CharField('Nombre', max_length=120)
    categoria = models.CharField('Categoría', max_length=80)
    descripcion = models.CharField('Descripción', max_length=280)
    orden = models.PositiveIntegerField('Orden', default=0)
    visible = models.BooleanField('Visible para funcionarios', default=True)

    class Meta:
        ordering = ['orden', 'nombre']
        verbose_name = 'Herramienta PDF'
        verbose_name_plural = 'Herramientas PDF'

    def __str__(self):
        return self.nombre


class CertificadoFuncionario(models.Model):
    rut = models.CharField('RUT', max_length=12, unique=True)
    password_cifrada = models.TextField('Clave cifrada')
    valido_hasta = models.DateTimeField('Válido hasta')
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Certificado de editor PDF'
        verbose_name_plural = 'Certificados de editor PDF'

    def __str__(self):
        return self.rut


class PlantillaFirmaPdf(models.Model):
    texto = models.TextField('Texto de la firma')
    imagen = models.BinaryField('Imagen', null=True, blank=True)
    imagen_tipo = models.CharField('Tipo de imagen', max_length=4, blank=True, default='')
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plantilla de firma PDF'
        verbose_name_plural = 'Plantillas de firma PDF'

    def __str__(self):
        return 'Texto de Firma Digital SLEP'
