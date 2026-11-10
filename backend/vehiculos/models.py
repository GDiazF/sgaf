from django.db import models
from django.utils import timezone


class VehiculoTipoCombustible(models.Model):
    nombre = models.CharField(max_length=50, unique=True)

    class Meta:
        verbose_name = "Tipo de Combustible"
        verbose_name_plural = "Tipos de Combustible"

    def __str__(self):
        return self.nombre

class VehiculoTipoDocumento(models.Model):
    nombre = models.CharField(max_length=100)
    codigo = models.CharField(
        max_length=40,
        blank=True,
        default='',
        db_index=True,
        help_text='Código estable (POLIZA, SOAP, …). Vacío = tipo personalizado.',
    )
    icono = models.CharField(max_length=50, default='FileText')
    color = models.CharField(max_length=20, default='indigo')
    requerido = models.BooleanField(default=False)
    es_sistema = models.BooleanField(
        default=False,
        help_text='Tipo fijo del sistema: no se elimina ni se cambia el código.',
    )
    dias_aviso_defecto = models.PositiveIntegerField(default=15, help_text="Días antes del vencimiento para avisar")

    class Meta:
        verbose_name = "Tipo de Documento"
        verbose_name_plural = "Tipos de Documentos"
        constraints = [
            models.UniqueConstraint(
                fields=['codigo'],
                condition=~models.Q(codigo=''),
                name='uniq_vehiculo_tipo_documento_codigo',
            ),
        ]

    def __str__(self):
        return self.nombre


class Vehiculo(models.Model):
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    anio = models.IntegerField(verbose_name="Año", default=2024)
    patente = models.CharField(max_length=10, unique=True, verbose_name='PPU')
    tipo_vehiculo = models.CharField(
        max_length=80,
        blank=True,
        default='',
        verbose_name='Tipo de vehículo',
        help_text='Ej. Camioneta, Automóvil, Furgón',
    )
    color = models.CharField(max_length=60, blank=True, default='')
    tipo_combustible = models.CharField(max_length=50, blank=True, null=True)
    nro_chasis = models.CharField(max_length=100, blank=True, null=True, verbose_name='Nº chasis')
    nro_motor = models.CharField(max_length=100, blank=True, null=True, verbose_name='Nº motor')
    cilindrada = models.CharField(
        max_length=40,
        blank=True,
        default='',
        verbose_name='Cilindrada',
    )
    fecha_adquisicion = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de adquisición',
    )
    fecha_inscripcion = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha de inscripción',
    )
    lugar_estacionamiento = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name='Lugar de estacionamiento',
    )
    imagen = models.ImageField(upload_to='vehiculos/fotos/', blank=True, null=True)
    activo = models.BooleanField(default=True)
    conductores = models.ManyToManyField(
        'funcionarios.Funcionario',
        through='VehiculoConductor',
        blank=True,
        related_name='vehiculos_asignados',
        verbose_name='Conductores asignados',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Vehículo"
        verbose_name_plural = "Vehículos"
        ordering = ['marca', 'modelo']

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.patente})"


class VehiculoConductor(models.Model):
    """Asignación conductor ↔ vehículo (con fecha para plantillas)."""
    vehiculo = models.ForeignKey(
        Vehiculo,
        on_delete=models.CASCADE,
        related_name='conductor_asignaciones',
    )
    funcionario = models.ForeignKey(
        'funcionarios.Funcionario',
        on_delete=models.PROTECT,
        related_name='asignaciones_vehiculo',
    )
    fecha_asignacion = models.DateField(
        default=timezone.localdate,
        verbose_name='Fecha de asignación',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Conductor de vehículo'
        verbose_name_plural = 'Conductores de vehículos'
        unique_together = ('vehiculo', 'funcionario')
        ordering = ['fecha_asignacion', 'id']

    def __str__(self):
        return f'{self.vehiculo} → {self.funcionario}'

class VehiculoDocumento(models.Model):
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='documentos')
    tipo = models.ForeignKey(VehiculoTipoDocumento, on_delete=models.PROTECT, related_name='documentos')
    archivo = models.FileField(upload_to='vehiculos/documentos/')
    numero_referencia = models.CharField(
        max_length=120,
        blank=True,
        default='',
        verbose_name='Nº documento / póliza',
        help_text='Número de póliza, permiso, certificado, etc.',
    )
    institucion = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name='Institución / emisor',
        help_text='Aseguradora, municipalidad u organismo emisor',
    )
    fecha_documento = models.DateField(
        null=True,
        blank=True,
        verbose_name='Fecha del documento',
        help_text='Ej. fecha de póliza o emisión',
    )
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
        tipo_nombre = self.tipo.nombre if self.tipo_id else 'Documento'
        return f'{tipo_nombre} - {self.vehiculo.patente}'


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

    km_inicial = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Km inicial del mes',
    )
    km_final = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Km final del mes',
    )
    litros = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Litros cargados',
    )
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

    def save(self, *args, **kwargs):
        if self.km_inicial is not None and self.km_final is not None:
            self.kilometros_recorridos = max(0, self.km_final - self.km_inicial)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.vehiculo.patente} - {self.get_mes_display()} {self.anio}"


class MantencionPreventiva(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo,
        on_delete=models.CASCADE,
        related_name='mantenciones_preventivas',
    )
    fecha = models.DateField()
    kilometraje = models.IntegerField(default=0)
    cambio_aceite = models.BooleanField(default=False, verbose_name='Cambio de aceite')
    cambio_filtro_aceite = models.BooleanField(default=False, verbose_name='Cambio filtro de aceite')
    cambio_liquido_frenos = models.BooleanField(default=False, verbose_name='Cambio líquido de frenos')
    observaciones = models.TextField(blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Mantención preventiva'
        verbose_name_plural = 'Mantenciones preventivas'
        ordering = ['-fecha', '-id']

    def __str__(self):
        return f'Preventivo {self.vehiculo.patente} {self.fecha}'


class IncidenteVehiculo(models.Model):
    vehiculo = models.ForeignKey(
        Vehiculo,
        on_delete=models.CASCADE,
        related_name='incidentes',
    )
    fecha = models.DateField()
    hora = models.TimeField(null=True, blank=True)
    tipo_accidente = models.CharField(max_length=120, verbose_name='Tipo de accidente')
    funcionario = models.ForeignKey(
        'funcionarios.Funcionario',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidentes_vehiculo',
    )
    costo_reparacion = models.IntegerField(default=0, verbose_name='Costo de reparación')
    observaciones = models.TextField(blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Incidente / accidente'
        verbose_name_plural = 'Incidentes y accidentes'
        ordering = ['-fecha', '-id']

    def __str__(self):
        return f'Incidente {self.vehiculo.patente} {self.fecha}'


class ReparacionVehiculo(models.Model):
    TIPO_PREVENTIVO = 'PREVENTIVO'
    TIPO_CORRECTIVO = 'CORRECTIVO'
    TIPO_CHOICES = [
        (TIPO_PREVENTIVO, 'Preventivo'),
        (TIPO_CORRECTIVO, 'Correctivo'),
    ]

    vehiculo = models.ForeignKey(
        Vehiculo,
        on_delete=models.CASCADE,
        related_name='reparaciones',
    )
    fecha = models.DateField()
    kilometraje = models.IntegerField(default=0)
    tipo_mantenimiento = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default=TIPO_CORRECTIVO,
    )
    descripcion = models.TextField(verbose_name='Descripción del mantenimiento')
    costo = models.IntegerField(default=0, verbose_name='Costo del mantenimiento')
    observaciones = models.TextField(blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Reparación / mantenimiento'
        verbose_name_plural = 'Reparaciones y mantenimientos'
        ordering = ['-fecha', '-id']

    def __str__(self):
        return f'{self.get_tipo_mantenimiento_display()} {self.vehiculo.patente} {self.fecha}'


class CorrelativoDocumentoVehiculo(models.Model):
    """Correlativo anual para folios de documentos de flota (SOL-YYYY-NNNN)."""

    TIPO_SOLICITUD = 'SOL'
    TIPO_CHOICES = [
        (TIPO_SOLICITUD, 'Solicitud / acta de entrega'),
    ]

    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default=TIPO_SOLICITUD)
    anio = models.PositiveIntegerField()
    ultimo = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Correlativo documento de vehículo'
        verbose_name_plural = 'Correlativos documentos de vehículo'
        unique_together = [('tipo', 'anio')]
        ordering = ['-anio', 'tipo']

    def __str__(self):
        return f'{self.tipo}-{self.anio}: {self.ultimo}'


def _emision_upload_to(instance, filename):
    patente = (getattr(instance.vehiculo, 'patente', None) or 'vehiculo').replace(' ', '_')
    folio = (instance.folio or 'sin-folio').replace('/', '-').replace(' ', '_')
    return f'vehiculos/emisiones/{patente}/{folio}.pdf'


class EmisionDocumentoVehiculo(models.Model):
    """Registro de cada PDF emitido (folio + archivo para redescarga)."""

    TIPO_ACTA = 'acta_entrega'
    TIPO_HOJA = 'hoja_vida'
    TIPO_CHOICES = [
        (TIPO_ACTA, 'Acta de entrega / solicitud'),
        (TIPO_HOJA, 'Hoja de vida'),
    ]

    vehiculo = models.ForeignKey(
        Vehiculo,
        on_delete=models.CASCADE,
        related_name='emisiones_documento',
    )
    tipo = models.CharField(max_length=30, choices=TIPO_CHOICES)
    folio = models.CharField(max_length=40, unique=True, db_index=True)
    archivo = models.FileField(
        upload_to=_emision_upload_to,
        blank=True,
        null=True,
        verbose_name='PDF emitido',
    )
    meta = models.JSONField(
        default=dict,
        blank=True,
        help_text='Snapshot de datos usados al emitir (solicitante, etc.).',
    )
    solicitante_nombre = models.CharField(max_length=200, blank=True, default='')
    solicitante_rut = models.CharField(max_length=20, blank=True, default='')
    emitido_por = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emisiones_documento_vehiculo',
    )
    emitido_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Emisión documento de vehículo'
        verbose_name_plural = 'Emisiones documentos de vehículo'
        ordering = ['-emitido_en']

    def __str__(self):
        return f'{self.folio} · {self.vehiculo.patente}'
