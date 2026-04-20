from django.db import models

class DashboardMetric(models.Model):
    """
    Guarda instantáneas de métricas para análisis histórico.
    """
    tag = models.CharField(max_length=50) # Ej: 'reservas_por_subdireccion'
    label = models.CharField(max_length=255) # Ej: 'Subdirección de Planificación'
    value = models.FloatField()
    date = models.DateField(auto_now_add=True)
    category = models.CharField(max_length=50, blank=True) # Ej: 'vehiculos', 'salas'

    class Meta:
        verbose_name = "Métrica de Dashboard"
        verbose_name_plural = "Métricas de Dashboard"
        ordering = ['-date', 'tag']

    def __str__(self):
        return f"{self.date} | {self.tag} | {self.label}: {self.value}"
