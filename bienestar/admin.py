from django.contrib import admin
from .models import CategoriaBienestar, Beneficio, BeneficioArchivo

class BeneficioArchivoInline(admin.TabularInline):
    model = BeneficioArchivo
    extra = 1

@admin.register(CategoriaBienestar)
class CategoriaBienestarAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'icono', 'color', 'orden')
    list_editable = ('orden',)

@admin.register(Beneficio)
class BeneficioAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'categoria', 'estado', 'orden', 'creado_en')
    list_filter = ('categoria', 'estado')
    search_fields = ('titulo', 'descripcion')
    inlines = [BeneficioArchivoInline]
