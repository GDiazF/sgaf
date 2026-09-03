from django.contrib import admin
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.html import format_html

from .models import ConfiguracionSelloFirma, DocumentoFirmado, FirmaPendiente, SelloFirma


def _thumb(file_field):
    if not file_field:
        return '—'
    return format_html(
        '<img src="{}" alt="" style="max-height:48px;max-width:96px;object-fit:contain;" />',
        file_field.url,
    )


@admin.register(SelloFirma)
class SelloFirmaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nivel_label', 'organo_nombre', 'activo', 'actualizado_en')
    list_filter = ('activo',)
    search_fields = ('nombre',)


@admin.register(ConfiguracionSelloFirma)
class ConfiguracionSelloFirmaAdmin(admin.ModelAdmin):
    list_display = ('id', 'logo_thumb', 'firma_thumb', 'ancho_pt', 'alto_pt', 'actualizado_en')
    fields = ('logo', 'imagen_firma', 'ancho_pt', 'alto_pt', 'actualizado_en')
    readonly_fields = ('actualizado_en',)

    @admin.display(description='Logo')
    def logo_thumb(self, obj):
        return _thumb(obj.logo)

    @admin.display(description='Imagen de firma')
    def firma_thumb(self, obj):
        return _thumb(obj.imagen_firma)

    def has_add_permission(self, request):
        if ConfiguracionSelloFirma.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def changelist_view(self, request, extra_context=None):
        obj = ConfiguracionSelloFirma.objects.first()
        if obj:
            return redirect(
                reverse(
                    'admin:firma_digital_configuracionsellofirma_change',
                    args=[obj.pk],
                )
            )
        return super().changelist_view(request, extra_context=extra_context)


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
