from django.contrib import admin
from .models import Establecimiento, TipoEstablecimiento

@admin.register(TipoEstablecimiento)
class TipoEstablecimientoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'area_gestion')
    list_filter = ('area_gestion',)
    search_fields = ('nombre',)

@admin.register(Establecimiento)
class EstablecimientoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'rbd', 'tipo', 'activo')
    search_fields = ('nombre', 'rbd')
    list_filter = ('tipo', 'activo')
