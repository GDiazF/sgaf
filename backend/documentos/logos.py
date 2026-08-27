import os

from django.conf import settings


def resolve_logo_path(key):
    from core.utils.report_utils import get_report_assets

    assets = get_report_assets('RC_ADQ')
    static_map = {
        'logo_slep': assets.get('logo_derecho') or assets.get('logo_izquierdo'),
        'logo_izquierdo': assets.get('logo_izquierdo'),
        'logo_derecho': assets.get('logo_derecho'),
        'logo_pie': assets.get('logo_pie'),
    }
    if key in static_map:
        return static_map[key]

    if key and key.startswith('logo_asset_'):
        try:
            from core.models import DocumentAsset
            asset_id = int(key.replace('logo_asset_', '', 1))
            asset = DocumentAsset.objects.filter(pk=asset_id).first()
            if asset and asset.archivo:
                return asset.archivo.path
        except (ValueError, Exception):
            return None
    return None


def path_to_media_url(file_path):
    if not file_path:
        return ''
    media_root = os.path.abspath(str(settings.MEDIA_ROOT or ''))
    abs_path = os.path.abspath(file_path)
    try:
        rel = os.path.relpath(abs_path, media_root)
    except ValueError:
        return ''
    if rel.startswith('..'):
        return ''
    return f"{settings.MEDIA_URL.rstrip('/')}/{rel.replace(os.sep, '/')}"


def logo_preview_url(key):
    if key and key.startswith('logo_asset_'):
        try:
            from core.models import DocumentAsset
            asset_id = int(key.replace('logo_asset_', '', 1))
            asset = DocumentAsset.objects.filter(pk=asset_id).first()
            if asset and asset.archivo:
                return asset.archivo.url
        except (ValueError, Exception):
            pass
    return path_to_media_url(resolve_logo_path(key))
