from django.contrib import admin

from .models import PlantillaDocumento


@admin.register(PlantillaDocumento)
class PlantillaDocumentoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tamano_pagina', 'orientacion', 'activa', 'actualizado_en')
    list_filter = ('activa', 'tamano_pagina', 'orientacion')
    search_fields = ('nombre', 'descripcion')
    readonly_fields = ('creado_en', 'actualizado_en', 'creado_por', 'actualizado_por')
