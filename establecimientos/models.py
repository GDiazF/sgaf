from django.db import models

class Establecimiento(models.Model):
    class Tipo(models.TextChoices):
        SALA_CUNA = 'SALA_CUNA', 'Sala Cuna'
        JARDIN_INFANTIL = 'JARDIN_INFANTIL', 'Jardín Infantil'
        ESCUELA = 'ESCUELA', 'Escuela'
        LICEO = 'LICEO', 'Liceo'
        CENTRO_CAPACITACION = 'CENTRO_CAPACITACION', 'Centro de Capacitación'
        ADMINISTRACION = 'ADMINISTRACION', 'Administración'
 
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
    logo = models.ImageField(upload_to='establecimientos/logos/', null=True, blank=True)
    activo = models.BooleanField(default=True)
 
    class Meta:
        ordering = ["nombre"]
 
    def __str__(self):
        return f"{self.nombre} ({self.rbd})"

class TelefonoEstablecimiento(models.Model):
    establecimiento = models.ForeignKey(
        Establecimiento, 
        on_delete=models.CASCADE, 
        related_name="telefonos"
    )
    numero = models.CharField("Número", max_length=20)
    etiqueta = models.CharField("Etiqueta", max_length=100, help_text="Ej: Dirección, Secretaría, Portería")
    es_principal = models.BooleanField("Principal", default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.es_principal:
            # Desactivar otros principales para el mismo establecimiento
            TelefonoEstablecimiento.objects.filter(
                establecimiento=self.establecimiento, 
                es_principal=True
            ).exclude(id=self.id).update(es_principal=False)
        elif not TelefonoEstablecimiento.objects.filter(establecimiento=self.establecimiento).exclude(id=self.id).exists():
            # Si es el primer teléfono, forzar a que sea principal
            self.es_principal = True
            
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Teléfono de Establecimiento"
        verbose_name_plural = "Teléfonos de Establecimientos"
        ordering = ["establecimiento", "-es_principal", "etiqueta"]

    def __str__(self):
        return f"{self.establecimiento.nombre} - {self.etiqueta}: {self.numero}"
