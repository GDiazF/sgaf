from django.contrib import admin

from .models import DocumentoFirmado, FirmaPendiente, SelloFirma


@admin.register(SelloFirma)
class SelloFirmaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nivel_label', 'organo_nombre', 'activo', 'actualizado_en')
    list_filter = ('activo',)
    search_fields = ('nombre',)


@admin.register(DocumentoFirmado)
class DocumentoFirmadoAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'firmante_nombre',
        'origen',
        'firmado_en',
        'nombre_archivo',
    )
    list_filter = ('origen', 'purpose')
    search_fields = ('codigo', 'firmante_nombre', 'firmante_run', 'hash_sha256')
    readonly_fields = (
        'codigo',
        'hash_sha256',
        'nombre_archivo',
        'origen',
        'purpose',
        'firmante_nombre',
        'firmante_run',
        'firmante_cargo',
        'firmado_por',
        'firmado_en',
    )


@admin.register(FirmaPendiente)
class FirmaPendienteAdmin(admin.ModelAdmin):
    list_display = (
        'codigo_interno',
        'titulo',
        'estado',
        'firmante',
        'origen',
        'creado_en',
    )
    list_filter = ('estado', 'origen')
    search_fields = ('codigo_interno', 'titulo', 'firmante__nombre_funcionario')
