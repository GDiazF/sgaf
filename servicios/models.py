from django.db import models
from establecimientos.models import Establecimiento

class TipoProveedor(models.Model):
    nombre = models.CharField(max_length=100)
    acronimo_nemotecnico = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Tipo de Proveedor"
        verbose_name_plural = "Tipos de Proveedores"

class Proveedor(models.Model):
    nombre = models.CharField(max_length=255)
    acronimo = models.CharField(max_length=50, blank=True, null=True)
    rut = models.CharField(max_length=20, blank=True, null=True)
    tipo_proveedor = models.ForeignKey(TipoProveedor, on_delete=models.SET_NULL, null=True, blank=True)
    contacto = models.CharField(max_length=255, blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name_plural = "Proveedores"

class TipoDocumento(models.Model):
    nombre = models.CharField(max_length=100) # e.g. Factura, Boleta
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documento"

class Servicio(models.Model):
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, related_name='servicios')
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE, related_name='servicios')
    numero_servicio = models.CharField(max_length=100, blank=True, null=True) # Optional
    numero_cliente = models.CharField(max_length=100) # Required
    tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.SET_NULL, null=True)
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.proveedor.nombre} - {self.establecimiento.nombre} ({self.numero_cliente})"

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"

class RegistroPago(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.PROTECT, related_name='pagos')
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.PROTECT, related_name='pagos_servicios')
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField()
    fecha_pago = models.DateField(verbose_name="Fecha envío a pago")
    nro_documento = models.CharField(max_length=100)
    monto_interes = models.IntegerField(default=0)
    monto_total = models.IntegerField()
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pago {self.nro_documento} - {self.servicio}"

    class Meta:
        verbose_name = "Registro de Pago"
        verbose_name_plural = "Registros de Pagos"
