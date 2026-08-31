from django.contrib import admin

from documentacion_servicios.models import (
    CampoDefinicion,
    RegistroServicioDoc,
    TipoRegistroServicio,
)


class CampoDefinicionInline(admin.TabularInline):
    model = CampoDefinicion
    extra = 0


@admin.register(TipoRegistroServicio)
class TipoRegistroServicioAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'nombre',
        'usa_folio',
        'notificar_al_crear',
        'aviso_solo_ultimo_por_establecimiento',
        'activo',
        'orden',
    )
    list_filter = ('activo', 'usa_folio', 'aviso_solo_ultimo_por_establecimiento')
    search_fields = ('codigo', 'nombre')
    inlines = [CampoDefinicionInline]


@admin.register(CampoDefinicion)
class CampoDefinicionAdmin(admin.ModelAdmin):
    list_display = ('tipo', 'clave', 'etiqueta', 'tipo_dato', 'obligatorio', 'orden', 'activo')
    list_filter = ('tipo', 'tipo_dato', 'obligatorio', 'activo')


@admin.register(RegistroServicioDoc)
class RegistroServicioDocAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'tipo',
        'folio',
        'proveedor',
        'establecimiento',
        'fecha_servicio',
        'creado_en',
    )
    list_filter = ('tipo',)
    search_fields = ('folio',)
