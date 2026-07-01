from django.db import models
from django.utils import timezone
from servicios.models import Proveedor
import math

class ProcesoCompra(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Nombre del Proceso")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Proceso de Compra"
        verbose_name_plural = "Procesos de Compra"
        ordering = ['nombre']

class EstadoContrato(models.Model):
    nombre = models.CharField(max_length=50, verbose_name="Estado")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Estado de Contrato"
        verbose_name_plural = "Estados de Contrato"
        ordering = ['nombre']

class CategoriaContrato(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Categoría")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Categoría de Contrato"
        verbose_name_plural = "Categorías de Contrato"
        ordering = ['nombre']

class OrientacionLicitacion(models.Model):
    nombre = models.CharField(max_length=100, verbose_name="Orientación / Distribución")
    
    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Orientación de Licitación"
        verbose_name_plural = "Orientaciones de Licitación"
        ordering = ['nombre']

class Contrato(models.Model):
    codigo_mercado_publico = models.CharField(max_length=100, verbose_name="Código Mercado Público", unique=True)
    descripcion = models.TextField(verbose_name="Descripción")
    
    proceso = models.ForeignKey(ProcesoCompra, on_delete=models.PROTECT, related_name='contratos', verbose_name="Tipo de Proceso")
    estado = models.ForeignKey(EstadoContrato, on_delete=models.PROTECT, related_name='contratos', verbose_name="Estado")
    categoria = models.ForeignKey(CategoriaContrato, on_delete=models.PROTECT, related_name='contratos', verbose_name="Categoría")
    orientacion = models.ForeignKey(OrientacionLicitacion, on_delete=models.PROTECT, related_name='contratos', verbose_name="Orientación", null=True, blank=True)
    
    TIPO_OC_CHOICES = [
        ('UNICA', 'OC Única'),
        ('MULTIPLE', 'OC Múltiple'),
    ]
    tipo_oc = models.CharField(max_length=10, choices=TIPO_OC_CHOICES, default='AGREEMENT', verbose_name="Tipo de OC")
    nro_oc = models.CharField(max_length=50, blank=True, null=True, verbose_name="Número de OC")
    cdp = models.CharField(max_length=100, blank=True, null=True, verbose_name="Nº CDP")
    
    @property
    def monto_total(self):
        return sum(p.monto_adjudicado for p in self.proveedores_asociados.all())
        
    @property
    def monto_consumido_previo(self):
        return sum(p.monto_consumido_previo for p in self.proveedores_asociados.all())
    
    # Establecimientos asociados al contrato (Movido a ContratoProveedor)
    # establecimientos = models.ManyToManyField('establecimientos.Establecimiento', related_name='contratos', blank=True, verbose_name="Establecimientos Asociados")

    fecha_adjudicacion = models.DateField(verbose_name="Fecha de Adjudicación")
    fecha_inicio = models.DateField(verbose_name="Fecha de Inicio")
    fecha_termino = models.DateField(verbose_name="Fecha de Término")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def monto_ejecutado(self):
        # Sum of total_pagar from all related receptions + the previous consumed amount
        total = self.recepciones.aggregate(total=models.Sum('total_pagar'))['total'] or 0
        return total + self.monto_consumido_previo

    @property
    def monto_restante(self):
        return self.monto_total - self.monto_ejecutado

    @property
    def gastos_mensuales(self):
        from django.db.models.functions import ExtractMonth, ExtractYear
        from django.db.models import Sum
        import calendar
        
        # Get execution data grouped by year and month
        stats = self.recepciones.filter(periodo__isnull=False).annotate(
            year=ExtractYear('periodo'),
            month=ExtractMonth('periodo')
        ).values('year', 'month').annotate(
            total=Sum('total_pagar')
        ).order_by('year', 'month')

        result = []
        for s in stats:
            month_name = calendar.month_name[s['month']].capitalize()
            # You might want to translate to Spanish if your locale is set, 
            # but calendar.month_name depends on system locale.
            # Let's use a manual map for reliability in Spanish as per user context.
            MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
            result.append({
                "mes": f"{MESES_ES[s['month']-1]} {s['year']}",
                "monto": s['total']
            })
        return result

    @property
    def plazo_meses(self):
        if self.fecha_inicio and self.fecha_termino:
            # Simple month calculation: (Year delta * 12) + Month delta
            months = (self.fecha_termino.year - self.fecha_inicio.year) * 12 + (self.fecha_termino.month - self.fecha_inicio.month)
            # If the day of the end month is less than the day of the start month, subtract one month
            if self.fecha_termino.day < self.fecha_inicio.day:
                months -= 1
            return max(0, months)
        return 0

    def __str__(self):
        return f"{self.codigo_mercado_publico} - {self.categoria.nombre}"

    class Meta:
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"
        ordering = ['-fecha_inicio']

class DocumentoContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='documentos', verbose_name="Contrato")
    nombre = models.CharField(max_length=255, verbose_name="Nombre del Documento")
    archivo = models.FileField(upload_to='contratos/docs/%Y/', verbose_name="Archivo")
    fecha_subida = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Subida")

    def __str__(self):
        return f"{self.nombre} ({self.contrato.codigo_mercado_publico})"

    class Meta:
        verbose_name = "Documento de Contrato"
        verbose_name_plural = "Documentos de Contrato"
        ordering = ['-fecha_subida']

class HistorialContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='historial', verbose_name="Contrato")
    fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha")
    accion = models.CharField(max_length=50, verbose_name="Acción") # e.g., CREACION, MODIFICACION
    detalle = models.TextField(verbose_name="Detalle")
    usuario = models.CharField(max_length=100, verbose_name="Usuario", default="Sistema")

    def __str__(self):
        return f"{self.accion} - {self.contrato.codigo_mercado_publico} ({self.fecha})"

    class Meta:
        verbose_name = "Historial de Contrato"
        verbose_name_plural = "Historial de Contratos"
        ordering = ['-fecha']

class ContratoProveedor(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='proveedores_asociados')
    proveedor = models.ForeignKey('servicios.Proveedor', on_delete=models.PROTECT, related_name='contratos_asociados')
    monto_adjudicado = models.IntegerField(default=0, verbose_name="Monto Adjudicado")
    monto_consumido_previo = models.IntegerField(default=0, verbose_name="Monto Consumido Histórico")
    establecimientos = models.ManyToManyField('establecimientos.Establecimiento', blank=True, verbose_name="Establecimientos Asociados")

    class Meta:
        verbose_name = "Proveedor de Contrato"
        verbose_name_plural = "Proveedores de Contratos"
        unique_together = ('contrato', 'proveedor')

    @property
    def monto_ejecutado(self):
        # Calculates what has been spent of this specific provider's budget for this contract
        from django.db.models import Sum
        total_recepciones = self.contrato.recepciones.filter(
            proveedor=self.proveedor
        ).aggregate(total=Sum('total_pagar'))['total'] or 0
        return total_recepciones + self.monto_consumido_previo

    @property
    def monto_restante(self):
        return self.monto_adjudicado - self.monto_ejecutado

    def __str__(self):
        return f"{self.proveedor.nombre} - {self.contrato.codigo_mercado_publico}"

# =====================================================================
# MÓDULO DE SERVICIOS OPERATIVOS (TRANSPORTE, ETC.)
# =====================================================================

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator

class TipoServicioOperativo(models.Model):
    nombre = models.CharField(max_length=100)
    icono = models.CharField(max_length=50, default='Truck', help_text="Nombre del icono de Lucide")

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Tipo de Servicio Operativo"
        verbose_name_plural = "Tipos de Servicios Operativos"

class ServicioContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='servicios_operativos')
    tipo_servicio = models.ForeignKey(TipoServicioOperativo, on_delete=models.PROTECT, related_name='servicios')
    nombre = models.CharField(max_length=200)

    def __str__(self):
        return f"{self.nombre} ({self.contrato.codigo_mercado_publico})"

    class Meta:
        verbose_name = "Servicio de Contrato"
        verbose_name_plural = "Servicios de Contrato"

class RutaTransporte(models.Model):
    servicio = models.ForeignKey(ServicioContrato, related_name='rutas', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=200)
    
    proveedor = models.ForeignKey('servicios.Proveedor', on_delete=models.PROTECT)
    establecimientos = models.ManyToManyField('establecimientos.Establecimiento')
    
    valor_diario = models.IntegerField()
    itinerario = models.TextField(blank=True, null=True, help_text="Detalle del trayecto (ej: Iquique - Chipana)")

    dia_inicio_periodo = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(31)])
    dia_fin_periodo = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(31)])
    
    incluir_fines_semana = models.BooleanField(default=False)
    excluir_feriados = models.BooleanField(default=True)

    def clean(self):
        super().clean()
        if not self.pk:
            return
            
        # Validate proveedor belongs to contrato
        if hasattr(self, 'servicio') and self.servicio and hasattr(self, 'proveedor') and self.proveedor:
            proveedores_validos = self.servicio.contrato.proveedores_asociados.values_list('proveedor_id', flat=True)
            if self.proveedor_id not in proveedores_validos:
                raise ValidationError({'proveedor': 'El proveedor no pertenece a los proveedores adjudicados del contrato.'})

    def save(self, *args, **kwargs):
        is_update = self.pk is not None
        self.full_clean()
        super().save(*args, **kwargs)
        if is_update:
            self.recalcular_periodos_abiertos()

    def __str__(self):
        return f"{self.nombre} - {self.servicio.nombre}"

    def recalcular_periodos_abiertos(self):
        import datetime
        # Solo actualizamos periodos que no han sido congelados (CERRADO)
        periodos_abiertos = self.periodos.filter(estado='ABIERTO')
        for p in periodos_abiertos:
            mes = p.mes_referencia
            anio = p.anio_referencia
            
            # Lógica de cálculo de rango idéntica a la creación
            if self.dia_inicio_periodo <= self.dia_fin_periodo:
                nueva_fecha_inicio = datetime.date(anio, mes, self.dia_inicio_periodo)
                nueva_fecha_fin = datetime.date(anio, mes, self.dia_fin_periodo)
            else:
                nueva_fecha_fin = datetime.date(anio, mes, self.dia_fin_periodo)
                if mes == 1:
                    prev_mes, prev_anio = 12, anio - 1
                else:
                    prev_mes, prev_anio = mes - 1, anio
                nueva_fecha_inicio = datetime.date(prev_anio, prev_mes, self.dia_inicio_periodo)
            
            # Actualizamos solo si hubo cambios en los días de corte
            if p.fecha_inicio != nueva_fecha_inicio or p.fecha_fin != nueva_fecha_fin:
                p.fecha_inicio = nueva_fecha_inicio
                p.fecha_fin = nueva_fecha_fin
                p.save()
                
                # Opcional: Limpiar ausencias que quedaron fuera del nuevo rango
                p.ausencias.filter(
                    models.Q(fecha__lt=p.fecha_inicio) | models.Q(fecha__gt=p.fecha_fin)
                ).delete()

    class Meta:
        verbose_name = "Ruta de Transporte"
        verbose_name_plural = "Rutas de Transporte"
        unique_together = ('servicio', 'nombre')

class GrupoPresetRutas(models.Model):
    servicio = models.ForeignKey(ServicioContrato, related_name='grupos_preset', on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)
    rutas = models.ManyToManyField(RutaTransporte, related_name='en_grupos')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.servicio.nombre})"

    class Meta:
        verbose_name = "Grupo de Rutas (Preset)"
        verbose_name_plural = "Grupos de Rutas (Presets)"
        ordering = ['nombre']
        unique_together = ('servicio', 'nombre')

class PeriodoCobro(models.Model):
    ruta = models.ForeignKey(RutaTransporte, related_name='periodos', on_delete=models.CASCADE)
    
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    
    mes_referencia = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)]) 
    anio_referencia = models.IntegerField()

    ESTADO_CHOICES = [
        ('ABIERTO', 'Abierto (Editable)'),
        ('CERRADO', 'Cerrado (Solo Lectura)'),
    ]
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ABIERTO')
    monto_total_calculado = models.IntegerField(null=True, blank=True, help_text="Snapshot del cálculo al cerrar el periodo")

    class Meta:
        unique_together = ('ruta', 'fecha_inicio', 'fecha_fin')
        verbose_name = "Periodo de Cobro"
        verbose_name_plural = "Periodos de Cobro"
        indexes = [
            models.Index(fields=['ruta', 'fecha_inicio']),
            models.Index(fields=['mes_referencia', 'anio_referencia']),
        ]

    @property
    def nombre_estandarizado(self):
        meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        return f"{meses[self.mes_referencia - 1]} {self.anio_referencia}"

    @property
    def dias_trabajados(self):
        import datetime
        ruta = self.ruta
        delta = (self.fecha_fin - self.fecha_inicio).days + 1
        dias_base = 0
        ausencias_efectivas = 0
        
        feriados = set()
        if ruta.excluir_feriados:
            feriados = set(FeriadoNacional.objects.values_list('fecha', flat=True))
            
        # Obtener todas las ausencias registradas para este periodo
        ausencias_registradas = set(self.ausencias.values_list('fecha', flat=True))

        for i in range(delta):
            dia = self.fecha_inicio + datetime.timedelta(days=i)
            
            # 1. Verificar si el día es laborable según las reglas de la ruta
            is_valid_workday = True
            if not ruta.incluir_fines_semana and dia.weekday() >= 5:
                is_valid_workday = False
            elif ruta.excluir_feriados and dia in feriados:
                is_valid_workday = False
            
            if is_valid_workday:
                dias_base += 1
                # 2. Solo restar la inasistencia si el día era laborable
                if dia in ausencias_registradas:
                    ausencias_efectivas += 1
        
        return dias_base - ausencias_efectivas

    @property
    def monto_total(self):
        if self.estado == 'CERRADO' and self.monto_total_calculado is not None:
            return self.monto_total_calculado
        return self.dias_trabajados * self.ruta.valor_diario

    def calcular_total_dinamico(self):
        return self.monto_total

    def validar_fecha(self, fecha):
        if not (self.fecha_inicio <= fecha <= self.fecha_fin):
            raise ValidationError(
                f"La fecha ({fecha}) debe estar entre {self.fecha_inicio} y {self.fecha_fin}."
            )
        if self.estado == 'CERRADO':
            raise ValidationError("El periodo está cerrado. No admite modificaciones.")

    def __str__(self):
        return f"{self.ruta.nombre} - {self.nombre_estandarizado}"

class AusenciaRuta(models.Model):
    periodo = models.ForeignKey(PeriodoCobro, related_name='ausencias', on_delete=models.CASCADE)
    fecha = models.DateField()
    motivo = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        unique_together = ('periodo', 'fecha')
        verbose_name = "Ausencia de Ruta"
        verbose_name_plural = "Ausencias de Ruta"
        indexes = [
            models.Index(fields=['periodo', 'fecha']),
        ]

    def clean(self):
        super().clean()
        if hasattr(self, 'periodo') and self.periodo is not None:
            self.periodo.validar_fecha(self.fecha)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.periodo.estado == 'CERRADO':
            raise ValidationError("No se pueden eliminar ausencias en un periodo cerrado.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Ausencia: {self.fecha} - {self.periodo.ruta.nombre}"

class FeriadoNacional(models.Model):
    fecha = models.DateField(unique=True)
    descripcion = models.CharField(max_length=200)

    class Meta:
        verbose_name = "Feriado Nacional"
        verbose_name_plural = "Feriados Nacionales"
        ordering = ['-fecha']
        indexes = [
            models.Index(fields=['fecha']),
        ]

    def __str__(self):
        return f"{self.fecha} - {self.descripcion}"
