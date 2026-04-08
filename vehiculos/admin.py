from django.contrib import admin
from .models import Vehiculo, RegistroMensual

@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ('marca', 'modelo', 'patente', 'activo')
    search_fields = ('marca', 'modelo', 'patente')
    list_filter = ('activo',)

@admin.register(RegistroMensual)
class RegistroMensualAdmin(admin.ModelAdmin):
    list_display = ('vehiculo', 'mes', 'anio', 'kilometros_recorridos', 'gasto_bencina', 'gasto_peajes', 'gasto_seguros')
    list_filter = ('anio', 'mes', 'vehiculo')
    search_fields = ('vehiculo__patente', 'vehiculo__marca', 'vehiculo__modelo')
