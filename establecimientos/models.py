from django.db import models

class Establecimiento(models.Model):
    class Tipo(models.TextChoices):
        ESCUELA = "escuela", "Escuela"
        JARDIN = "jardin", "Jardín"
        LICEO = "liceo", "Liceo"
        COLEGIO = "colegio", "Colegio"
        CENTRO_LABORAL = "centro_laboral", "Centro Laboral"
 
    rbd = models.PositiveIntegerField("RBD", db_index=True)
    nombre = models.CharField(max_length=255)
    tipo = models.CharField(
        max_length=20,
        choices=Tipo.choices,
        default=Tipo.ESCUELA,
        verbose_name="Tipo",
    )
    director = models.CharField(max_length=255, blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    activo = models.BooleanField(default=True)
 
    class Meta:
        ordering = ["nombre"]
 
    def __str__(self):
        return f"{self.nombre} ({self.rbd})"
