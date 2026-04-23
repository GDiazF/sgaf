from django.contrib import admin
from .models import ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion

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
