from django.conf import settings
from django.db import models

from .page_sizes import PAGE_SIZE_CHOICES
from .propositos import BORRADOR_PROPOSITO, DEFAULT_PROPOSITO, PROPOSITO_CHOICES


class PlantillaDocumento(models.Model):
    ORIENTACION_CHOICES = [
        ('portrait', 'Vertical'),
        ('landscape', 'Horizontal'),
    ]

    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    proposito = models.CharField(
        max_length=40,
        choices=PROPOSITO_CHOICES,
        default=DEFAULT_PROPOSITO,
        db_index=True,
        help_text='Módulo / tipo de documento. «Sin asignación» = borrador.',
    )
    cuerpo_html = models.TextField(blank=True, default='')
    encabezado_html = models.TextField(blank=True, default='')
    pie_html = models.TextField(blank=True, default='')
    tamano_pagina = models.CharField(
        max_length=20,
        choices=PAGE_SIZE_CHOICES,
        default='carta',
    )
    orientacion = models.CharField(
        max_length=12,
        choices=ORIENTACION_CHOICES,
        default='portrait',
    )
    ancho_mm = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True,
        help_text='Solo para tamaño personalizado',
    )
    alto_mm = models.DecimalField(
        max_digits=7, decimal_places=2, null=True, blank=True,
        help_text='Solo para tamaño personalizado',
    )
    margen_superior_mm = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    margen_inferior_mm = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    margen_izquierdo_mm = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    margen_derecho_mm = models.DecimalField(max_digits=6, decimal_places=2, default=20)
    activa = models.BooleanField(default=True)
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plantillas_documento_creadas',
    )
    actualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='plantillas_documento_editadas',
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Plantilla de documento'
        verbose_name_plural = 'Plantillas de documentos'
        ordering = ['nombre']
        permissions = [
            ('render_plantilladocumento', 'Puede renderizar plantillas de documento'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['proposito'],
                condition=~models.Q(proposito=BORRADOR_PROPOSITO),
                name='uniq_plantilla_proposito_asignado',
            ),
        ]

    def __str__(self):
        return self.nombre
