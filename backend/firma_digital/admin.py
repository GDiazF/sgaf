from django.contrib import admin
from django.shortcuts import redirect
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe
import base64

from .models import ConfiguracionSelloFirma, DocumentoFirmado, FirmaPendiente, SelloFirma


def _thumb(file_field):
    if not file_field:
        return '—'
    return format_html(
        '<img src="{}" alt="" style="max-height:48px;max-width:96px;object-fit:contain;" />',
        file_field.url,
    )


def _file_meta(file_field):
    """Nombre, tamaño, dimensiones px y formato del archivo actual."""
    if not file_field:
        return None

    name = (getattr(file_field, 'name', '') or '').rsplit('/', 1)[-1]
    size_b = None
    try:
        size_b = file_field.size
    except Exception:
        pass

    width = height = None
    fmt = None
    try:
        from .sello_fondo import _image_from_field

        img = _image_from_field(file_field)
        if img is not None:
            width, height = img.size
            fmt = (img.format or '').upper() or None
    except Exception:
        pass

    if not fmt:
        ext = (name.rsplit('.', 1)[-1] if '.' in name else '').upper()
        fmt = ext or '—'

    size_label = '—'
    if size_b is not None:
        if size_b < 1024:
            size_label = f'{size_b} B'
        elif size_b < 1024 * 1024:
            size_label = f'{size_b / 1024:.1f} KB'
        else:
            size_label = f'{size_b / (1024 * 1024):.2f} MB'

    dims = '—'
    ratio = '—'
    if width and height:
        dims = f'{width} × {height} px'
        ratio = f'{width / height:.3f}' if height else '—'

    return {
        'name': name or 'archivo',
        'url': file_field.url,
        'size_label': size_label,
        'dims': dims,
        'ratio': ratio,
        'fmt': fmt,
        'width': width,
        'height': height,
    }


def _preview_panel(title, file_field, box_hint='', seal_hint=''):
    meta = _file_meta(file_field)
    if not meta:
        return format_html(
            '<div style="padding:12px;border:1px dashed #cbd5e1;border-radius:8px;color:#64748b;">'
            '<strong>{}</strong><br/>Sin archivo actual. Al guardar se usará el logo por defecto de firma-dep.'
            '</div>',
            title,
        )

    img_html = format_html(
        '<img src="{}" alt="{}" style="max-width:280px;max-height:160px;object-fit:contain;'
        'background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;" />',
        meta['url'],
        meta['name'],
    )
    rows = [
        ('Archivo fuente', meta['name']),
        ('Formato', meta['fmt']),
        ('Dimensiones del archivo', meta['dims']),
        ('Proporción (ancho/alto)', meta['ratio']),
        ('Peso', meta['size_label']),
    ]
    if box_hint:
        rows.append(('Uso en el sello', box_hint))
    if seal_hint:
        rows.append(('Al firmar', seal_hint))

    table = format_html_join(
        '',
        '<tr><th style="text-align:left;padding:2px 12px 2px 0;color:#64748b;font-weight:500;">{}</th>'
        '<td style="padding:2px 0;">{}</td></tr>',
        ((k, v) for k, v in rows),
    )
    return format_html(
        '<div style="padding:12px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;'
        'margin-bottom:8px;max-width:520px;">'
        '<div style="font-weight:600;margin-bottom:10px;color:#0f172a;">{}</div>'
        '<div style="margin-bottom:10px;">{}</div>'
        '<table style="font-size:13px;line-height:1.45;">{}</table>'
        '<p style="margin:10px 0 0;font-size:12px;color:#64748b;">'
        'Las dimensiones de arriba son del <em>archivo subido</em>. '
        'No se envían a FirmaGob tal cual: se redimensionan al alto del sello.'
        '</p></div>',
        title,
        img_html,
        table,
    )


@admin.register(SelloFirma)
class SelloFirmaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nivel_label', 'organo_nombre', 'activo', 'actualizado_en')
    list_filter = ('activo',)
    search_fields = ('nombre',)


@admin.register(ConfiguracionSelloFirma)
class ConfiguracionSelloFirmaAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'logo_thumb',
        'firma_thumb',
        'ancho_pt',
        'alto_pt',
        'proporcion_logo_pct',
        'actualizado_en',
    )
    fieldsets = (
        (
            'Vista previa del sello completo',
            {
                'description': (
                    'Simulación local del fondo + texto de ejemplo. '
                    'El texto real lo pinta FirmaGob al firmar; el tamaño de caja y la proporción '
                    'logo/texto del fondo sí son los que se usarán. '
                    'Guarde para actualizar la vista previa tras cambiar medidas o proporción.'
                ),
                'fields': ('preview_sello_completo',),
            },
        ),
        (
            'Imágenes actuales',
            {
                'description': (
                    'Revise logo e imagen de firma. Se encajan sin deformar (letterbox) '
                    'en la zona izquierda según el % configurado abajo.'
                ),
                'fields': (
                    'preview_logo',
                    'preview_imagen_firma',
                ),
            },
        ),
        (
            'Reemplazar archivos',
            {
                'description': 'Suba un archivo nuevo solo si desea cambiarlo. Dejar vacío conserva el actual.',
                'fields': ('logo', 'imagen_firma'),
            },
        ),
        (
            'Tamaño del sello y tamaño del logo',
            {
                'description': (
                    '1) Tamaño total de la caja (sealWidthPt / sealHeightPt). '
                    '2) % máximo del ancho para el logo (izquierda). '
                    'Importante: FirmaGob decide dónde dibuja “Firmado por…”; el % no mueve ese texto. '
                    'Con logo cuadrado, el lado máximo ≈ min(alto_pt, ancho_pt × %). '
                    'Ej.: 280×84 y 20% → logo ~56×56 (se ve chico y queda hueco). Pruebe 40% (~112 pt).'
                ),
                'fields': ('ancho_pt', 'alto_pt', 'proporcion_logo_pct', 'actualizado_en'),
            },
        ),
    )
    readonly_fields = (
        'preview_sello_completo',
        'preview_logo',
        'preview_imagen_firma',
        'actualizado_en',
    )

    @admin.display(description='Logo')
    def logo_thumb(self, obj):
        return _thumb(obj.logo)

    @admin.display(description='Imagen de firma')
    def firma_thumb(self, obj):
        return _thumb(obj.imagen_firma)

    @admin.display(description='Sello completo (simulación)')
    def preview_sello_completo(self, obj):
        if not obj:
            return '—'
        w_pt = int(obj.ancho_pt or 205)
        h_pt = int(obj.alto_pt or 84)
        logo_pct = int(obj.proporcion_logo_pct or 40)
        # Preformatear: format_html no admite especificadores tipo {:.1f} sobre floats.
        w_mm = f'{w_pt * 0.352777778:.1f}'
        h_mm = f'{h_pt * 0.352777778:.1f}'
        w_px = w_pt * 3
        h_px = h_pt * 3

        try:
            from .sello_fondo import build_sello_preview_png

            png = build_sello_preview_png(obj)
            data_url = 'data:image/png;base64,' + base64.b64encode(png).decode('ascii')
            # mark_safe: data URLs largas no deben pasar por format_html (rompe / escapa).
            img = mark_safe(
                f'<img src="{data_url}" alt="Vista previa del sello" '
                f'style="width:{w_px}px;height:{h_px}px;max-width:100%;'
                f'height:auto;background:#fff;border:1px solid #cbd5e1;border-radius:6px;" />'
            )
        except Exception as exc:
            img = format_html(
                '<div style="color:#b91c1c;padding:12px;">No se pudo generar la previsualización: {}</div>',
                str(exc),
            )

        return format_html(
            '<div style="max-width:640px;">'
            '<div style="margin-bottom:10px;">{}</div>'
            '<table style="font-size:13px;line-height:1.45;">'
            '<tr><th style="text-align:left;padding:2px 12px 2px 0;color:#64748b;font-weight:500;">'
            'Sello completo</th><td>{} × {} pt</td></tr>'
            '<tr><th style="text-align:left;padding:2px 12px 2px 0;color:#64748b;font-weight:500;">'
            'Tope logo</th><td>{}% del ancho (~{} pt de lado si es cuadrado)</td></tr>'
            '<tr><th style="text-align:left;padding:2px 12px 2px 0;color:#64748b;font-weight:500;">'
            'Equiv. aproximado</th><td>{} × {} mm</td></tr>'
            '<tr><th style="text-align:left;padding:2px 12px 2px 0;color:#64748b;font-weight:500;">'
            'PNG a escala 3×</th><td>{} × {} px</td></tr>'
            '</table>'
            '<p style="margin:10px 0 0;font-size:12px;color:#64748b;max-width:520px;">'
            'Simulación local. FirmaGob coloca el texto real con su propio layout '
            '(no respeta un reparto 20/80). El % solo limita el tamaño del logo a la izquierda.'
            '</p></div>',
            img,
            w_pt,
            h_pt,
            logo_pct,
            min(h_pt, int(w_pt * logo_pct / 100)),
            w_mm,
            h_mm,
            w_px,
            h_px,
        )

    @admin.display(description='Logo institucional (actual)')
    def preview_logo(self, obj):
        pct = int(getattr(obj, 'proporcion_logo_pct', None) or 40) if obj else 40
        h_pt = int(getattr(obj, 'alto_pt', None) or 84) if obj else 84
        w_pt = int(getattr(obj, 'ancho_pt', None) or 205) if obj else 205
        side = min(h_pt, int(w_pt * pct / 100))
        return _preview_panel(
            'Logo institucional',
            obj.logo if obj else None,
            box_hint=f'Tope {pct}% del ancho del sello',
            seal_hint=f'Se redimensiona a ~{side}×{side} pt (escala 3× en PNG). El 400×400 del archivo no se envía.',
        )

    @admin.display(description='Imagen de firma (actual)')
    def preview_imagen_firma(self, obj):
        pct = int(getattr(obj, 'proporcion_logo_pct', None) or 40) if obj else 40
        return _preview_panel(
            'Imagen de firma',
            obj.imagen_firma if obj else None,
            box_hint=f'Comparte la zona del logo (~{pct}%)',
            seal_hint='También se redimensiona; no se envía a resolución original.',
        )

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
