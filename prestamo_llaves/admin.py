from django.contrib import admin
from .models import Solicitante, Llave, Prestamo

@admin.register(Solicitante)
class SolicitanteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'rut', 'telefono', 'email')
    search_fields = ('nombre', 'apellido', 'rut')

@admin.register(Llave)
class LlaveAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'establecimiento', 'ubicacion')
    search_fields = ('nombre', 'establecimiento__nombre')
    list_filter = ('establecimiento',)

@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ('llave', 'solicitante', 'fecha_prestamo', 'fecha_devolucion', 'usuario_entrega')
    list_filter = ('fecha_prestamo', 'fecha_devolucion')
    search_fields = ('llave__nombre', 'solicitante__nombre', 'solicitante__rut')
    date_hierarchy = 'fecha_prestamo'
