from django.contrib import admin
from .models import CuentaSMTP, PlantillaCorreo

@admin.register(CuentaSMTP)
class CuentaSMTPAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'smtp_host', 'smtp_user', 'es_default')
    list_editable = ('es_default',)
    search_fields = ('nombre', 'smtp_user')

@admin.register(PlantillaCorreo)
class PlantillaCorreoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proposito', 'asunto', 'fecha_actualizacion')
    list_filter = ('proposito',)
    search_fields = ('nombre', 'asunto', 'cuerpo_html')
