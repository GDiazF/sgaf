from django.contrib import admin
from .models import CuentaSMTP, DestinatariosCorreoOperativo, PlantillaCorreo

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


@admin.register(DestinatariosCorreoOperativo)
class DestinatariosCorreoOperativoAdmin(admin.ModelAdmin):
    list_display = ('proposito', 'activo', 'actualizado_en')
    list_filter = ('proposito', 'activo')
    search_fields = ('proposito', 'emails_adicionales', 'usuarios__email', 'grupos__nombre')
    filter_horizontal = ('grupos', 'usuarios')
