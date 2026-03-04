from django.db import models
from establecimientos.models import Establecimiento


class PersonalTI(models.Model):
    FUNCION_CHOICES = [
        ('TECNICO_ENLACES', 'Técnico de Enlaces'),
        ('COORDINADOR_ENLACES', 'Coordinador(a) de Enlaces'),
        ('ENCARGADO_ENLACE', 'Encargado(a) Enlace'),
        ('TECNICO_A_ENLACES', 'Técnico/a Enlace'),
        ('OTRO', 'Otro'),
    ]

    TIPO_CONTRATO_CHOICES = [
        ('24', '24 - Profesor Titular'),
        ('25', '25 - Profesor Contrata'),
        ('27', '27 - Asistentes Educación Plazo Fijo'),
        ('28', '28 - Asistentes Educación Plazo Indefinido'),
        ('OTRO', 'Otro'),
    ]

    establecimiento = models.ForeignKey(
        Establecimiento,
        on_delete=models.CASCADE,
        related_name='personal_ti',
        verbose_name='Establecimiento'
    )
    funcion = models.CharField(
        max_length=30,
        choices=FUNCION_CHOICES,
        verbose_name='Función'
    )
    rut = models.CharField(max_length=12, verbose_name='RUT')
    nombre_completo = models.CharField(max_length=255, verbose_name='Nombre Completo')
    tipo_contrato = models.CharField(
        max_length=10,
        choices=TIPO_CONTRATO_CHOICES,
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
        ordering = ['establecimiento__nombre', 'funcion', 'nombre_completo']

    def __str__(self):
        return f"{self.nombre_completo} - {self.get_funcion_display()} ({self.establecimiento.nombre})"
