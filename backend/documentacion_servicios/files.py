"""Utilidades de archivo / folio para documentación de servicios."""

from pathlib import Path


def safe_folio_stem(folio: str) -> str:
    raw = (folio or '').strip()
    if not raw:
        return ''
    return ''.join(c if c.isalnum() or c in '-_' else '_' for c in raw)


def folio_match_key(value: str) -> str:
    """Clave comparable entre folio de fila y nombre de PDF."""
    return safe_folio_stem(value).upper()


def filename_for_folio(folio: str, original_name: str | None = None) -> str:
    """Nombre de archivo a guardar: {folio}{ext}."""
    stem = safe_folio_stem(folio)
    if not stem:
        return Path(original_name or 'documento.pdf').name
    ext = Path(original_name or 'documento.pdf').suffix.lower() or '.pdf'
    return f'{stem}{ext}'


def assign_archivo_con_folio(registro, uploaded_file, folio: str) -> None:
    """
    Guarda el archivo en el FileField con nombre {folio}{ext}.
    No llama a registro.save(); usa storage con save=False.
    """
    from django.core.files.base import ContentFile

    if not uploaded_file:
        return
    folio = (folio or '').strip()
    original = getattr(uploaded_file, 'name', None) or 'documento.pdf'
    new_name = filename_for_folio(folio, original) if folio else Path(original).name

    if hasattr(uploaded_file, 'seek'):
        try:
            uploaded_file.seek(0)
        except Exception:
            pass
    data = uploaded_file.read()
    if hasattr(uploaded_file, 'seek'):
        try:
            uploaded_file.seek(0)
        except Exception:
            pass

    registro.archivo.save(new_name, ContentFile(data), save=False)
