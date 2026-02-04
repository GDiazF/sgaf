from django.db import models
from django.utils import timezone
from servicios.models import Proveedor
import math

class ProcesoCompra(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Proceso")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Proceso de Compra"
        verbose_name_plural = "Procesos de Compra"
        ordering = ['nombre']

class EstadoContrato(models.Model):
    nombre = models.CharField(max_length=50, verbose_name="Estado")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Estado de Contrato"
        verbose_name_plural = "Estados de Contrato"
        ordering = ['nombre']

class CategoriaContrato(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Categoría")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Categoría de Contrato"
        verbose_name_plural = "Categorías de Contrato"
        ordering = ['nombre']

class OrientacionLicitacion(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Orientación / Distribución")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Orientación de Licitación"
        verbose_name_plural = "Orientaciones de Licitación"
        ordering = ['nombre']

class Contrato(models.Model):
    codigo_mercado_publico = models.CharField(max_length=100, verbose_name="Código Mercado Público", unique=True)
    descripcion = models.TextField(verbose_name="Descripción")
    
    proceso = models.ForeignKey(ProcesoCompra, on_delete=models.PROTECT, related_name='contratos', verbose_name="Tipo de Proceso")
    estado = models.ForeignKey(EstadoContrato, on_delete=models.PROTECT, related_name='contratos', verbose_name="Estado")
    categoria = models.ForeignKey(CategoriaContrato, on_delete=models.PROTECT, related_name='contratos', verbose_name="Categoría")
    orientacion = models.ForeignKey(OrientacionLicitacion, on_delete=models.PROTECT, related_name='contratos', verbose_name="Orientación", null=True, blank=True)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='contratos', verbose_name="Proveedor", null=True, blank=True)
    
    fecha_adjudicacion = models.DateField(verbose_name="Fecha de Adjudicación")
    fecha_inicio = models.DateField(verbose_name="Fecha de Inicio")
    fecha_termino = models.DateField(verbose_name="Fecha de Término")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def plazo_meses(self):
        if self.fecha_inicio and self.fecha_termino:
            # Simple month calculation: (Year delta * 12) + Month delta
            months = (self.fecha_termino.year - self.fecha_inicio.year) * 12 + (self.fecha_termino.month - self.fecha_inicio.month)
            # If the day of the end month is less than the day of the start month, subtract one month
            if self.fecha_termino.day < self.fecha_inicio.day:
                months -= 1
            return max(0, months)
        return 0

    def __str__(self):
        return f"{self.codigo_mercado_publico} - {self.categoria.nombre}"

    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ['-fecha_inicio']

class DocumentoContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='documentos', verbose_name="Contrato")
    nombre = models.CharField(max_length=255, verbose_name="Nombre del Documento")
    archivo = models.FileField(upload_to='contratos/docs/%Y/', verbose_name="Archivo")
    fecha_subida = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Subida")

    def __str__(self):
        return f"{self.nombre} ({self.contrato.codigo_mercado_publico})"

    class Meta:
        verbose_name = "Documento de Contrato"
        verbose_name_plural = "Documentos de Contrato"
        ordering = ['-fecha_subida']

class HistorialContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='historial', verbose_name="Contrato")
    fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha")
    accion = models.CharField(max_length=50, verbose_name="Acción") # e.g., CREACION, MODIFICACION
    detalle = models.TextField(verbose_name="Detalle")
    usuario = models.CharField(max_length=100, verbose_name="Usuario", default="Sistema")

    def __str__(self):
        return f"{self.accion} - {self.contrato.codigo_mercado_publico} ({self.fecha})"

    class Meta:
        verbose_name = "Historial de Contrato"
        verbose_name_plural = "Historial de Contratos"
        ordering = ['-fecha']
