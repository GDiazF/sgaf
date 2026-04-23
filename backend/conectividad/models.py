from django.db import models

class EscuelaRed(models.Model):
    TIPO_ENLACE = [
        ('FIBRA', 'Fibra Óptica'),
        ('RADIO', 'Radio Enlace'),
        ('ADSL', 'ADSL / Cobre'),
        ('STARLINK', 'Satelital (Starlink)'),
    ]

    nombre = models.CharField(max_length=255, unique=True)
    localidad = models.CharField(max_length=100, blank=True, null=True)
    direccion = models.CharField(max_length=255, blank=True, null=True)
    
    # Datos Técnicos
    tipo_enlace = models.CharField(max_length=20, choices=TIPO_ENLACE, default='FIBRA')
    velocidad_bajada = models.IntegerField(default=0, help_text="Mbps contratados")
    proveedor = models.CharField(max_length=100, default='GTD')
    
    # Redes
    ip_lan = models.GenericIPAddressField(verbose_name="IP Router LAN", help_text="Ej: 192.168.10.1")
    ip_wifi = models.GenericIPAddressField(verbose_name="IP Router WIFI", help_text="Ej: 10.250.10.1", blank=True, null=True)
    
    # Estado Actual
    is_active = models.BooleanField(default=True, verbose_name="Activo en Monitoreo")
    last_status_lan = models.BooleanField(default=False)
    last_status_wifi = models.BooleanField(default=False)
    last_check = models.DateTimeField(auto_now=True)
    latency_lan = models.IntegerField(default=0, help_text="Latencia en ms")
    packet_loss = models.IntegerField(default=0, help_text="Porcentaje de pérdida")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Establecimiento (Red)"
        verbose_name_plural = "Establecimientos (Red)"

class PingHistory(models.Model):
    escuela = models.ForeignKey(EscuelaRed, on_delete=models.CASCADE, related_name='history')
    timestamp = models.DateTimeField(auto_now_add=True)
    status_lan = models.BooleanField()
    latency = models.IntegerField()
    packet_loss = models.IntegerField()

    class Meta:
        ordering = ['-timestamp']

