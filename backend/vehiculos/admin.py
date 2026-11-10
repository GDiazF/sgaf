from django.contrib import admin
from .models import (
    EmisionDocumentoVehiculo,
    RegistroMensual,
    Vehiculo,
    VehiculoDocumento,
    VehiculoTipoCombustible,
    VehiculoTipoDocumento,
)

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


@admin.register(EmisionDocumentoVehiculo)
class EmisionDocumentoVehiculoAdmin(admin.ModelAdmin):
    list_display = (
        'folio', 'vehiculo', 'tipo', 'solicitante_nombre',
        'emitido_por', 'emitido_en', 'tiene_archivo',
    )
    list_filter = ('tipo', 'emitido_en')
    search_fields = ('folio', 'vehiculo__patente', 'solicitante_nombre', 'solicitante_rut')
    readonly_fields = ('emitido_en',)

    @admin.display(boolean=True, description='PDF')
    def tiene_archivo(self, obj):
        return bool(obj.archivo)
