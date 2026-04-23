from django.db import models
from django.contrib.auth.models import User

class CategoriaBienestar(models.Model):
    nombre = models.CharField(max_length=100)
    icono = models.CharField(max_length=50, default='Heart', help_text="Nombre del icono de Lucide")
    color = models.CharField(max_length=20, default='#6366f1')
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Categoría de Bienestar"
        verbose_name_plural = "Categorías de Bienestar"
        ordering = ['orden']

    def __str__(self):
        return self.nombre

class Beneficio(models.Model):
    ESTADOS = [
        ('BORRADOR', 'Borrador (Oculto)'),
        ('PUBLICADO', 'Publicado (Visible)'),
        ('EXPIRADO', 'Expirado'),
    ]

    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    categoria = models.ForeignKey(CategoriaBienestar, on_delete=models.CASCADE, related_name='beneficios')
    estado = models.CharField(max_length=20, choices=ESTADOS, default='BORRADOR')
    
    # Para el "Drag & Drop" del board
    orden = models.PositiveIntegerField(default=0)
    
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)
    
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)

    class Meta:
        ordering = ['orden', '-creado_en']

    def __str__(self):
        return self.titulo

class BeneficioArchivo(models.Model):
    beneficio = models.ForeignKey(Beneficio, on_delete=models.CASCADE, related_name='archivos')
    archivo = models.FileField(upload_to='bienestar/archivos/')
    nombre = models.CharField(max_length=255, blank=True)
    tipo = models.CharField(max_length=50, help_text="Ej: imagen, pdf, doc")
    creado_en = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Archivo para: {self.beneficio.titulo}"
