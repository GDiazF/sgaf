from django.contrib import admin
from .models import Vehiculo, RegistroMensual, VehiculoDocumento, VehiculoTipoDocumento, VehiculoTipoCombustible

@admin.register(VehiculoTipoCombustible)
class VehiculoTipoCombustibleAdmin(admin.ModelAdmin):
    list_display = ('nombre',)

@admin.register(VehiculoTipoDocumento)
class VehiculoTipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'icono', 'color', 'requerido')
    search_fields = ('nombre',)

class VehiculoDocumentoInline(admin.TabularInline):
    model = VehiculoDocumento
    extra = 1

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('marca', 'modelo', 'patente', 'anio', 'activo')
    search_fields = ('marca', 'modelo', 'patente')
    list_filter = ('activo', 'anio')
    inlines = [VehiculoDocumentoInline]

@admin.register(VehiculoDocumento)
class VehiculoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'tipo', 'fecha_vencimiento', 'creado_en')
    list_filter = ('tipo', 'fecha_vencimiento')

@admin.register(RegistroMensual)
class RegistroMensualAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'mes', 'anio', 'kilometros_recorridos', 'gasto_bencina', 'gasto_peajes', 'gasto_seguros')
    list_filter = ('anio', 'mes', 'vehiculo')
    search_fields = ('vehiculo__patente', 'vehiculo__marca', 'vehiculo__modelo')
