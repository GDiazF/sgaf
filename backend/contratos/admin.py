from django.contrib import admin
from .models import (
    ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion,
    TipoServicioOperativo, ServicioContrato, RutaTransporte, FeriadoNacional, PeriodoCobro
)

@admin.register(TipoServicioOperativo)
class TipoServicioOperativoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'icono')

@admin.register(ServicioContrato)
class ServicioContratoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'contrato', 'tipo_servicio')
    list_filter = ('tipo_servicio', 'contrato')

@admin.register(RutaTransporte)
class RutaTransporteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'servicio', 'proveedor', 'valor_diario')
    list_filter = ('servicio', 'proveedor')

@admin.register(FeriadoNacional)
class FeriadoNacionalAdmin(admin.ModelAdmin):
    list_display = ('fecha', 'descripcion')

@admin.register(PeriodoCobro)
class PeriodoCobroAdmin(admin.ModelAdmin):
    list_display = ('ruta', 'mes_referencia', 'anio_referencia', 'estado')
    list_filter = ('estado', 'mes_referencia', 'anio_referencia')

@admin.register(ProcesoCompra)
class ProcesoCompraAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(EstadoContrato)
class EstadoContratoAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(CategoriaContrato)
class CategoriaContratoAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(OrientacionLicitacion)
class OrientacionLicitacionAdmin(admin.ModelAdmin):
    list_display = ('nombre',)
    search_fields = ('nombre',)

@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ('codigo_mercado_publico', 'categoria', 'orientacion', 'proceso', 'estado', 'fecha_inicio', 'fecha_termino', 'get_plazo')
    list_filter = ('estado', 'proceso', 'categoria', 'orientacion', 'fecha_inicio')
    search_fields = ('codigo_mercado_publico', 'descripcion')
    readonly_fields = ('get_plazo',)
    
    def get_plazo(self, obj):
        return f"{obj.plazo_meses} meses"
    get_plazo.short_description = "Plazo Estimado"

    fieldsets = (
        ('Información General', {
            'fields': ('codigo_mercado_publico', 'descripcion', 'categoria', 'orientacion', 'proceso', 'estado')
        }),
        ('Fechas', {
            'fields': ('fecha_adjudicacion', 'fecha_inicio', 'fecha_termino', 'get_plazo')
        }),
    )
