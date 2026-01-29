from django.contrib import admin
from .models import Establecimiento

@admin.register(Establecimiento)
class EstablecimientoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'rbd', 'tipo', 'activo')
    search_fields = ('nombre', 'rbd')
    list_filter = ('tipo', 'activo')
