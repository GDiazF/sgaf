from django.db import models

class LicitacionMP(models.Model):
    codigo_externo = models.CharField(max_length=50, unique=True, db_index=True)
    nombre = models.CharField(max_length=500)
    estado_nombre = models.CharField(max_length=100, blank=True, null=True)
    codigo_estado = models.IntegerField(blank=True, null=True, db_index=True)
    
    fecha_creacion = models.DateTimeField(null=True, blank=True, db_index=True)
    fecha_cierre = models.DateTimeField(null=True, blank=True)
    
    # Campo para guardar la estructura normalizada completa (para el visor rápido)
    json_data = models.JSONField(verbose_name="Ficha Normalizada", null=True, blank=True)
    
    # Metadata interna de gestión
    is_enriquecida = models.BooleanField(default=False, help_text="¿Ya se descargó el detalle técnico full?")
    last_sync = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.codigo_externo} - {self.nombre}"

    class Meta:
        verbose_name = "Licitación Mercado Público"
        verbose_name_plural = "Licitaciones Mercado Público"
        ordering = ['-fecha_creacion']
