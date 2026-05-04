from django.db import models

class VehiculoTipoCombustible(models.Model):
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = "Tipo de Combustible"
        verbose_name_plural = "Tipos de Combustible"

    def __str__(self):
        return self.nombre

class VehiculoTipoDocumento(models.Model):
    nombre = models.CharField(max_length=100)
    icono = models.CharField(max_length=50, default='FileText')
    color = models.CharField(max_length=20, default='indigo')
    requerido = models.BooleanField(default=False)
    dias_aviso_defecto = models.PositiveIntegerField(default=15, help_text="Días antes del vencimiento para avisar")

    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documentos"

    def __str__(self):
        return self.nombre


class Vehiculo(models.Model):
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField(verbose_name="Año", default=2024)
    patente = models.CharField(max_length=10, unique=True)
    tipo_combustible = models.CharField(max_length=50, blank=True, null=True)
    nro_chasis = models.CharField(max_length=100, blank=True, null=True)
    nro_motor = models.CharField(max_length=100, blank=True, null=True)
    imagen = models.ImageField(upload_to='vehiculos/fotos/', blank=True, null=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Vehículo"
        verbose_name_plural = "Vehículos"
        ordering = ['marca', 'modelo']

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.patente})"

class VehiculoDocumento(models.Model):
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='documentos')
    tipo = models.ForeignKey(VehiculoTipoDocumento, on_delete=models.PROTECT, related_name='documentos')
    archivo = models.FileField(upload_to='vehiculos/documentos/')
    fecha_vencimiento = models.DateField(null=True, blank=True)
    observaciones = models.TextField(blank=True, null=True)
    dias_aviso = models.PositiveIntegerField(null=True, blank=True, help_text="Personalizar días de aviso (si está vacío usa el defecto del tipo)")
    ultima_notificacion = models.DateField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Documento de Vehículo"
        verbose_name_plural = "Documentos de Vehículos"
        ordering = ['-creado_en']

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.vehiculo.patente}"


class RegistroMensual(models.Model):
    MESES = [
        (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
        (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
        (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre')
    ]

    vehiculo = models.ForeignKey(
        Vehiculo, 
        on_delete=models.CASCADE, 
        related_name='registros',
        verbose_name="Vehículo"
    )
    anio = models.IntegerField(verbose_name="Año")
    mes = models.IntegerField(choices=MESES, verbose_name="Mes")
    
    kilometros_recorridos = models.IntegerField(verbose_name="Kilómetros mensuales recorridos", default=0)
    unidad_monetaria = models.CharField(max_length=10, default="Pesos", verbose_name="Unidad monetaria")
    
    # Financials
    gasto_bencina = models.IntegerField(verbose_name="Monto mensual del gasto en bencina", default=0)
    gasto_peajes = models.IntegerField(verbose_name="Monto mensual del gasto en peajes", default=0)
    gasto_seguros = models.IntegerField(verbose_name="Monto mensual pagado en seguros", default=0)

    class Meta:
        ordering = ['-anio', '-mes', 'vehiculo__patente']
        unique_together = ['anio', 'mes', 'vehiculo']
        verbose_name = "Registro Mensual de Gastos"
        verbose_name_plural = "Registros Mensuales de Gastos"

    def __str__(self):
        return f"{self.vehiculo.patente} - {self.get_mes_display()} {self.anio}"
