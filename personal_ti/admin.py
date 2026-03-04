from django.contrib import admin
from .models import PersonalTI


@admin.register(PersonalTI)
class PersonalTIAdmin(admin.ModelAdmin):
    list_display = ['nombre_completo', 'rut', 'establecimiento', 'funcion', 'tipo_contrato', 'activo']
    list_filter = ['funcion', 'tipo_contrato', 'activo', 'establecimiento']
    search_fields = ['nombre_completo', 'rut', 'establecimiento__nombre']
    autocomplete_fields = ['establecimiento']
