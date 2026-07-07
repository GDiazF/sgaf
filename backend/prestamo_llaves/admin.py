from django.contrib import admin
from .models import Solicitante, Activo, Prestamo, TipoActivo

@admin.register(TipoActivo)
class TipoActivoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

@admin.register(Solicitante)
class SolicitanteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'rut', 'telefono', 'email')
    search_fields = ('nombre', 'apellido', 'rut')

@admin.register(Activo)
class ActivoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'get_establecimiento', 'tipo', 'ubicacion')
    search_fields = ('nombre',)
    list_select_related = ('establecimiento', 'tipo')

    def get_establecimiento(self, obj):
        try:
            return obj.establecimiento.nombre
        except Exception:
            return '—'
    get_establecimiento.short_description = 'Establecimiento'

@admin.register(Prestamo)
class PrestamoAdmin(admin.ModelAdmin):
    list_display = ('activo', 'solicitante', 'fecha_prestamo', 'fecha_devolucion')
    list_filter = ('fecha_prestamo',)
    search_fields = ('activo__nombre', 'solicitante__nombre', 'solicitante__rut')
    list_select_related = ('activo', 'solicitante')
