from django.db import models

class Remuneracion(models.Model):
    """Modelo dummy que permite a Django registrar automáticamente los 4 permisos estándar (add, change, delete, view)
    para el módulo de Tesorería en la Gestión de Roles."""
    class Meta:
        managed = False
        verbose_name = "Remuneración (Tesorería)"
        verbose_name_plural = "Remuneraciones (Tesorería)"

