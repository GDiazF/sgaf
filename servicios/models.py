from django.db import models
import datetime
from establecimientos.models import Establecimiento

class TipoProveedor(models.Model):
    nombre = models.CharField(max_length=100)
    acronimo_nemotecnico = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Tipo de Proveedor"
        verbose_name_plural = "Tipos de Proveedores"
        ordering = ['nombre']

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
        ordering = ['nombre']

class TipoDocumento(models.Model):
    nombre = models.CharField(max_length=100) # e.g. Factura, Boleta
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documento"
        ordering = ['nombre']

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
        ordering = ['-fecha_creacion']

class RecepcionConforme(models.Model):
    ESTADO_CHOICES = [
        ('EMITIDA', 'Emitida'),
        ('ANULADA', 'Anulada'),
    ]
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='recepciones')
    folio = models.CharField(max_length=50, unique=True, blank=True)
    fecha_emision = models.DateField(auto_now_add=True)
    observaciones = models.TextField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='EMITIDA')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Grupo de firmantes para este documento
    grupo_firmante = models.ForeignKey(
        'funcionarios.Grupo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='recepciones_conformes',
        verbose_name="Grupo de Firmantes"
    )

    # El funcionario específico que firmó este documento
    firmante = models.ForeignKey(
        'funcionarios.Funcionario',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='rcs_firmadas',
        verbose_name="Firmante"
    )

    def save(self, *args, **kwargs):
        if not self.folio:
            year = datetime.date.today().year
            prefix = f"RLB-{year}"
            last_rc = RecepcionConforme.objects.filter(folio__startswith=prefix).order_by('folio').last()
            
            if last_rc:
                try:
                    last_seq_str = last_rc.folio.rsplit('-', 1)[-1]
                    last_seq = int(last_seq_str)
                    new_seq = last_seq + 1
                except (ValueError, IndexError):
                    new_seq = 1
            else:
                new_seq = 1
            
            self.folio = f"{prefix}-{new_seq:04d}"
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"RC {self.folio} - {self.proveedor.nombre}"

    class Meta:
        verbose_name = "Recepción Conforme"
        verbose_name_plural = "Recepciones Conformes"
        ordering = ['-created_at']

class RegistroPago(models.Model):
    servicio = models.ForeignKey(Servicio, on_delete=models.PROTECT, related_name='pagos')
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.PROTECT, related_name='pagos_servicios')
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField()
    fecha_pago = models.DateField(verbose_name="Fecha envío a pago")
    nro_documento = models.CharField(max_length=100)
    monto_interes = models.IntegerField(default=0)
    monto_total = models.IntegerField()
    recepcion_conforme = models.ForeignKey(RecepcionConforme, on_delete=models.SET_NULL, null=True, blank=True, related_name='registros')
    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pago {self.nro_documento} - {self.servicio}"

    class Meta:
        verbose_name = "Registro de Pago"
        verbose_name_plural = "Registros de Pagos"
        ordering = ['-fecha_pago']

class HistorialRecepcionConforme(models.Model):
    recepcion_conforme = models.ForeignKey(RecepcionConforme, on_delete=models.CASCADE, related_name='historial')
    fecha = models.DateTimeField(auto_now_add=True)
    accion = models.CharField(max_length=100) # e.g., 'CREACION', 'MODIFICACION', 'ELIMINACION_PAGO'
    detalle = models.TextField(blank=True, null=True)
    usuario = models.CharField(max_length=150, blank=True, null=True) # Storing username as string for simplicity or FK

    def __str__(self):
        return f"{self.recepcion_conforme.folio} - {self.accion} - {self.fecha}"

    class Meta:
        ordering = ['-fecha']
        verbose_name = "Historial RC"
        verbose_name_plural = "Historial RCs"

class CDP(models.Model):
    nombre = models.CharField(max_length=255, verbose_name="Nombre CDP") # e.g., CDP Agua 2024
    archivo = models.FileField(upload_to='cdps/%Y/', verbose_name="Archivo PDF")
    anio = models.IntegerField(verbose_name="Año", default=2026)
    descripcion = models.TextField(blank=True, verbose_name="Descripción/Observaciones")
    fecha_subida = models.DateTimeField(auto_now_add=True)
    
    # Optional: Link to Type of Provider if it's "by service type"
    # tipo_proveedor = models.ForeignKey(TipoProveedor, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "CDP (Certificado Disp. Presupuestaria)"
        verbose_name_plural = "Repositorio CDPs"
        ordering = ['-fecha_subida']

class TipoEntrega(models.Model):
    nombre = models.CharField(max_length=100) # e.g., Parcial, Total, etc.
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Tipo de Entrega"
        verbose_name_plural = "Tipos de Entrega"
class FacturaAdquisicion(models.Model):
    # Folio field (RCF-YYYY-XXXX)
    folio = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name="Folio RC")
    
    nro_factura = models.CharField(max_length=50, blank=True, default="", verbose_name="Número de Factura")
    nro_oc = models.CharField(max_length=100, blank=True, default="", verbose_name="Orden de Compra")

    # Numero de certificado de presupuesto (FK a CDP)
    cdp = models.CharField(max_length=100, verbose_name="Certificado de Presupuesto (CDP)")
    descripcion = models.TextField(verbose_name="Descripción de producto o servicio")
    # Fecha de recepcion conforme (dd/mm/yyyy predeterminada hoy)
    fecha_recepcion = models.DateField(default=datetime.date.today, verbose_name="Fecha de recepción conforme")
    # Entrega parcializada o total
    tipo_entrega = models.ForeignKey(TipoEntrega, on_delete=models.PROTECT, related_name='facturas', verbose_name="Tipo de Entrega")
    # Proveedor (FK)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name='facturas_adquisicion')
    # Establecimiento (para saber dónde se recibió)
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.PROTECT, related_name='facturas_adquisicion')
    
    # Financial fields
    total_neto = models.IntegerField(verbose_name="Total Neto")
    iva = models.IntegerField(verbose_name="Impuestos (19% IVA)")
    # Total a Pagar
    total_pagar = models.IntegerField(verbose_name="Total a Pagar")

    # Grupo de firmantes para este documento
    grupo_firmante = models.ForeignKey(
        'funcionarios.Grupo', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='facturas_adquisicion',
        verbose_name="Grupo de Firmantes"
    )

    # El funcionario específico que firmó este documento
    firmante = models.ForeignKey(
        'funcionarios.Funcionario',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='facturas_firmadas',
        verbose_name="Firmante"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.folio:
            year = datetime.date.today().year
            prefix = f"RCF-{year}"
            last_factura = FacturaAdquisicion.objects.filter(folio__startswith=prefix).order_by('folio').last()
            
            if last_factura:
                try:
                    last_seq_str = last_factura.folio.rsplit('-', 1)[-1]
                    last_seq = int(last_seq_str)
                    new_seq = last_seq + 1
                except (ValueError, IndexError, AttributeError):
                    new_seq = 1
            else:
                new_seq = 1
            
            self.folio = f"{prefix}-{new_seq:04d}"
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"RC {self.folio} - {self.proveedor.nombre}"

    class Meta:
        verbose_name = "Factura de Adquisición"
        verbose_name_plural = "Facturas de Adquisición"
        ordering = ['-fecha_recepcion']
