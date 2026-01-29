from django.contrib import admin
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago

@admin.register(TipoProveedor)
class TipoProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'acronimo_nemotecnico')

@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'acronimo', 'rut', 'tipo_proveedor', 'contacto')
    search_fields = ('nombre', 'rut', 'acronimo')
    list_filter = ('tipo_proveedor',)

@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('nombre',)

@admin.register(Servicio)
class ServicioAdmin(admin.ModelAdmin):
    list_display = ('proveedor', 'establecimiento', 'numero_cliente', 'numero_servicio', 'tipo_documento')
    list_filter = ('proveedor', 'tipo_documento', 'establecimiento')
    search_fields = ('numero_cliente', 'numero_servicio', 'proveedor__nombre', 'establecimiento__nombre')
    autocomplete_fields = ['proveedor', 'establecimiento']

@admin.register(RegistroPago)
class RegistroPagoAdmin(admin.ModelAdmin):
    list_display = ('nro_documento', 'servicio', 'establecimiento', 'monto_total', 'fecha_pago')
    list_filter = ('establecimiento', 'fecha_pago')
    search_fields = ('nro_documento', 'servicio__numero_cliente')
    autocomplete_fields = ['servicio', 'establecimiento']
