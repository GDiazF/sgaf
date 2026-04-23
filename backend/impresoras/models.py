from django.db import models

class Printer(models.Model):
    TYPE_BW = "B/N"
    TYPE_COLOR = "COLOR"
    TYPE_CHOICES = [
        (TYPE_BW, "Blanco y negro"),
        (TYPE_COLOR, "Color"),
    ]

    name = models.CharField(max_length=120)
    location = models.CharField(max_length=120)
    floor = models.CharField(max_length=20, blank=True)
    ip_address = models.GenericIPAddressField(protocol="IPv4")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_BW)
    community = models.CharField(max_length=128, default="public")
    snmp_port = models.PositiveIntegerField(default=161)
    enabled = models.BooleanField(default=True)
    notes = models.CharField(max_length=255, blank=True)

    last_check = models.DateTimeField(null=True, blank=True)
    last_ok = models.BooleanField(null=True)
    last_message = models.TextField(blank=True)
    last_black = models.FloatField(null=True, blank=True)
    last_cyan = models.FloatField(null=True, blank=True)
    last_magenta = models.FloatField(null=True, blank=True)
    last_yellow = models.FloatField(null=True, blank=True)
    last_errors = models.JSONField(default=list, blank=True)
    serial_number = models.CharField(max_length=120, blank=True)
    last_connected = models.BooleanField(null=True, blank=True)
    last_woke = models.BooleanField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Impresora"
        verbose_name_plural = "Impresoras"

    def __str__(self):
        return f"{self.name} ({self.ip_address})"

    @property
    def is_color(self):
        return self.type == self.TYPE_COLOR

    def toner_snapshot(self):
        return {
            "black": self.last_black,
            "cyan": self.last_cyan,
            "magenta": self.last_magenta,
            "yellow": self.last_yellow,
        }
