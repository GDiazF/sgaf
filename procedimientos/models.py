from django.db import models
from django.conf import settings
from funcionarios.models import Subdireccion, Departamento, Unidad

class TipoProcedimiento(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=7, default='#6366f1')
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documentos"

    def __str__(self):
        return self.nombre

class Procedimiento(models.Model):
    titulo = models.CharField(max_length=200, verbose_name="Título")
    descripcion = models.TextField(blank=True, verbose_name="Descripción")
    archivo = models.FileField(upload_to='procedimientos/', verbose_name="Archivo")
    
    # Clasificación por área
    subdireccion = models.ForeignKey(Subdireccion, on_delete=models.SET_NULL, null=True, blank=True)
    departamento = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True)
    unidad = models.ForeignKey(Unidad, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Tipo de documento (Manual, Instructivo, etc)
    tipo = models.ForeignKey(TipoProcedimiento, on_delete=models.SET_NULL, null=True, related_name='procedimientos')
    
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Procedimiento"
        verbose_name_plural = "Procedimientos"
        ordering = ['-created_at']

    def __str__(self):
        return self.titulo
