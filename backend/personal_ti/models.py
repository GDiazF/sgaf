from django.db import models
from establecimientos.models import Establecimiento


class FuncionTI(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#6366f1', help_text="Color hex para la interfaz")

    class Meta:
        verbose_name = 'Función de Personal'
        verbose_name_plural = 'Funciones de Personal'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class ContratoTI(models.Model):
    codigo = models.CharField(max_length=20, unique=True, help_text="Ej: 24, 25, 27")
    nombre = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#10b981')

    class Meta:
        verbose_name = 'Tipo de Contrato TI'
        verbose_name_plural = 'Tipos de Contrato TI'
        ordering = ['codigo']

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"


class PersonalTI(models.Model):
    establecimiento = models.ForeignKey(
        Establecimiento,
        on_delete=models.CASCADE,
        related_name='personal_ti',
        verbose_name='Establecimiento'
    )
    funcion = models.ForeignKey(
        FuncionTI,
        on_delete=models.PROTECT,
        related_name='personal',
        verbose_name='Función'
    )
    rut = models.CharField(max_length=12, verbose_name='RUT')
    nombre_completo = models.CharField(max_length=255, verbose_name='Nombre Completo')
    tipo_contrato = models.ForeignKey(
        ContratoTI,
        on_delete=models.PROTECT,
        related_name='personal',
        verbose_name='Tipo de Contrato'
    )
    telefono = models.CharField(max_length=20, blank=True, verbose_name='Teléfono')
    correo = models.EmailField(blank=True, verbose_name='Correo Electrónico')
    activo = models.BooleanField(default=True, verbose_name='Activo')
    observaciones = models.TextField(blank=True, verbose_name='Observaciones')
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Personal TI'
        verbose_name_plural = 'Personal TI'
        ordering = ['establecimiento__nombre', 'funcion__nombre', 'nombre_completo']

    def __str__(self):
        return f"{self.nombre_completo} - {self.funcion.nombre} ({self.establecimiento.nombre})"
