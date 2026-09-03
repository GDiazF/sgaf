"""Cliente HTTP hacia el sidecar firma-dep (NestJS :4010).

Las credenciales FirmaGob viven solo en firma-dep.
Django envía PDF + RUT + OTP (atendida) y recibe el PDF firmado.
"""
from __future__ import annotations

import base64
import logging
import re
from typing import Any

import requests
from django.conf import settings

from .client import FirmaGobError, firmagob_http_status, normalize_otp

logger = logging.getLogger(__name__)

MODE_ATENDIDA = 'atendida'
MODE_DESATENDIDA = 'desatendida'


def _dep_url(path: str) -> str:
    base = (getattr(settings, 'FIRMA_DEP_URL', None) or 'http://127.0.0.1:4010/api/v1').rstrip(
        '/'
    )
    return f'{base}/{path.lstrip("/")}'


def _dep_headers() -> dict[str, str]:
    return {
        'Content-Type': 'application/json',
        'x-client-id': getattr(settings, 'FIRMA_DEP_CLIENT_ID', 'sgaf-backend') or 'sgaf-backend',
        'x-api-key': getattr(settings, 'FIRMA_DEP_API_KEY', 'dev-key') or 'dev-key',
    }


def format_rut_chile(rut: str) -> str:
    """Normaliza a formato con puntos y guión (ej. 17.798.248-2) para firma-dep."""
    raw = (rut or '').strip().upper().replace('.', '').replace(' ', '')
    if not raw:
        return ''
    if '-' in raw:
        cuerpo, dv = raw.split('-', 1)
    else:
        cuerpo, dv = raw[:-1], raw[-1]
    cuerpo = ''.join(c for c in cuerpo if c.isdigit())
    if not cuerpo:
        return ''
    # Miles: 17798248 -> 17.798.248
    parts = []
    while cuerpo:
        parts.append(cuerpo[-3:])
        cuerpo = cuerpo[:-3]
    cuerpo_fmt = '.'.join(reversed(parts))
    return f'{cuerpo_fmt}-{dv}'


def _raise_from_dep(payload: Any, http_status: int | None) -> None:
    if isinstance(payload, dict):
        raw_msg = payload.get('message') or payload.get('error')
        if isinstance(raw_msg, list):
            msg = ' '.join(str(m) for m in raw_msg)
        else:
            msg = str(raw_msg or 'Error en firma-dep.')
        detail = payload.get('detail') or payload.get('rawResponse')
        raise FirmaGobError(str(msg), status_code=http_status, payload=detail or payload)
    raise FirmaGobError(
        f'Error en firma-dep (HTTP {http_status}).',
        status_code=http_status,
        payload=payload,
    )


def capabilities() -> dict:
    """GET /signatures/capabilities."""
    try:
        response = requests.get(
            _dep_url('signatures/capabilities'),
            headers=_dep_headers(),
            timeout=15,
        )
    except requests.RequestException as exc:
        raise FirmaGobError(f'No se pudo conectar con firma-dep: {exc}') from exc
    try:
        data = response.json()
    except ValueError as exc:
        raise FirmaGobError(
            f'Respuesta no JSON de firma-dep (HTTP {response.status_code}).',
            status_code=response.status_code,
        ) from exc
    if response.status_code >= 400:
        _raise_from_dep(data, response.status_code)
    return data if isinstance(data, dict) else {'raw': data}


def health() -> dict:
    try:
        response = requests.get(_dep_url('health'), timeout=10)
        return response.json() if response.content else {'ok': response.ok}
    except requests.RequestException as exc:
        raise FirmaGobError(f'firma-dep no responde: {exc}') from exc


def _build_sign_body(
    *,
    pdf_bytes: bytes,
    rut: str,
    mode: str,
    otp: str | None,
    file_name: str,
    entity: str | None,
    validation_url: str | None,
    document_id: str | None,
    visible_seal: bool,
    seal_page: int | None,
    seal_top_margin_cm: float,
    seal_left_margin_cm: float,
) -> dict:
    rut_fmt = format_rut_chile(rut)
    if not rut_fmt:
        raise FirmaGobError('RUT del firmante inválido o vacío.')

    signature: dict[str, Any] = {
        'mode': mode,
        'rut': rut_fmt,
        'visibleSeal': visible_seal,
        'sealTopMarginCm': seal_top_margin_cm,
        'sealLeftMarginCm': seal_left_margin_cm,
    }
    if seal_page is not None:
        signature['sealPage'] = seal_page
    if entity:
        signature['entity'] = entity
    if mode == MODE_ATENDIDA:
        signature['otp'] = normalize_otp(otp)

    if visible_seal:
        try:
            from .sello_fondo import seal_image_base64_from_config

            seal_b64 = seal_image_base64_from_config()
            if seal_b64:
                signature['sealImageBase64'] = seal_b64
        except Exception:
            logger.exception('No se pudo componer el fondo del sello; se usará el logo por defecto de firma-dep.')

    body: dict[str, Any] = {
        'pdfBase64': base64.b64encode(pdf_bytes).decode('ascii'),
        'fileName': file_name or 'documento.pdf',
        'signature': signature,
        'options': {
            'returnSignedPdfBase64': True,
            'verboseError': bool(getattr(settings, 'DEBUG', False)),
        },
    }

    if validation_url:
        body['validation'] = {
            'enabled': True,
            'url': validation_url,
            'documentId': document_id or '',
        }
    else:
        body['validation'] = {'enabled': False}

    return body


def _sign(body: dict) -> bytes:
    try:
        response = requests.post(
            _dep_url('signatures/sign-pdf'),
            json=body,
            headers=_dep_headers(),
            timeout=int(getattr(settings, 'FIRMA_DEP_TIMEOUT_MS', 120000) / 1000) or 120,
        )
    except requests.RequestException as exc:
        logger.exception('Error de red al llamar firma-dep')
        raise FirmaGobError(f'No se pudo conectar con firma-dep: {exc}') from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise FirmaGobError(
            f'Respuesta no JSON de firma-dep (HTTP {response.status_code}).',
            status_code=response.status_code,
            payload=response.text[:500],
        ) from exc

    if response.status_code >= 400 or (
        isinstance(payload, dict) and payload.get('ok') is False
    ):
        _raise_from_dep(payload, response.status_code)

    result = (payload or {}).get('result') or {}
    b64 = result.get('signedPdfBase64') or result.get('content')
    if not b64:
        raise FirmaGobError(
            'firma-dep no devolvió el PDF firmado.',
            status_code=response.status_code,
            payload=payload,
        )
    try:
        return base64.b64decode(b64)
    except Exception as exc:
        raise FirmaGobError('PDF firmado inválido (base64).') from exc


def sign_pdf_atendida(
    pdf_bytes: bytes,
    *,
    rut: str,
    otp: str,
    file_name: str = 'documento.pdf',
    entity: str | None = None,
    validation_url: str | None = None,
    document_id: str | None = None,
    visible_seal: bool = True,
    seal_page: int | None = None,
    seal_top_margin_cm: float = 2.0,
    seal_left_margin_cm: float = 1.5,
) -> bytes:
    body = _build_sign_body(
        pdf_bytes=pdf_bytes,
        rut=rut,
        mode=MODE_ATENDIDA,
        otp=otp,
        file_name=file_name,
        entity=entity,
        validation_url=validation_url,
        document_id=document_id,
        visible_seal=visible_seal,
        seal_page=seal_page,
        seal_top_margin_cm=seal_top_margin_cm,
        seal_left_margin_cm=seal_left_margin_cm,
    )
    return _sign(body)


def sign_pdf_desatendida(
    pdf_bytes: bytes,
    *,
    rut: str,
    file_name: str = 'documento.pdf',
    entity: str | None = None,
    validation_url: str | None = None,
    document_id: str | None = None,
    visible_seal: bool = True,
    seal_page: int | None = None,
    seal_top_margin_cm: float = 2.0,
    seal_left_margin_cm: float = 1.5,
) -> bytes:
    body = _build_sign_body(
        pdf_bytes=pdf_bytes,
        rut=rut,
        mode=MODE_DESATENDIDA,
        otp=None,
        file_name=file_name,
        entity=entity,
        validation_url=validation_url,
        document_id=document_id,
        visible_seal=visible_seal,
        seal_page=seal_page,
        seal_top_margin_cm=seal_top_margin_cm,
        seal_left_margin_cm=seal_left_margin_cm,
    )
    return _sign(body)


def seal_page_from_pdf_page(page: str | int | None) -> int | None:
    """Convierte 'LAST' u omitido → None (firma-dep usa última); número → int."""
    if page is None or page == '' or str(page).upper() == 'LAST':
        return None
    try:
        n = int(page)
        return n if n >= 1 else None
    except (TypeError, ValueError):
        return None


PT_PER_CM = 28.346456693
# Tamaño fijo del sello que dibuja firma-dep (signatures.service.ts).
FIRMA_DEP_SEAL_WIDTH_PT = 205.0
FIRMA_DEP_SEAL_HEIGHT_PT = 84.0
# Espacio reservado al pie de validación/QR en firma-dep.
FIRMA_DEP_FOOTER_RESERVED_PT = 88.0


def get_pdf_page_size_pt(
    pdf_bytes: bytes,
    page_1based: int | None = None,
) -> tuple[float, float]:
    """Ancho/alto en puntos de la página (1-based). None → última."""
    import pypdfium2 as pdfium

    doc = pdfium.PdfDocument(pdf_bytes)
    try:
        if not len(doc):
            return 595.0, 842.0
        if page_1based is None:
            idx = len(doc) - 1
        else:
            idx = max(0, min(int(page_1based) - 1, len(doc) - 1))
        page = doc[idx]
        return float(page.get_width()), float(page.get_height())
    finally:
        doc.close()


def pdf_box_to_seal_margins_cm(
    *,
    llx: float,
    ury: float,
    page_height_pt: float,
    clamp_above_footer: bool = True,
) -> tuple[float, float]:
    """Caja PDF (origen abajo-izq) → (sealTopMarginCm, sealLeftMarginCm) de firma-dep.

    firma-dep coloca el sello así:
      x = leftCm * pt/cm
      y = pageHeight - topCm * pt/cm - sealHeight
    """
    left_cm = max(0.0, min(30.0, float(llx) / PT_PER_CM))
    top_cm = max(0.0, min(30.0, (float(page_height_pt) - float(ury)) / PT_PER_CM))
    if clamp_above_footer and page_height_pt > 0:
        # Evita que firma-dep mueva el sello a una página nueva por el pie de validación.
        max_top_pt = (
            float(page_height_pt) - FIRMA_DEP_SEAL_HEIGHT_PT - FIRMA_DEP_FOOTER_RESERVED_PT
        )
        if max_top_pt > 0:
            top_cm = min(top_cm, max_top_pt / PT_PER_CM)
    return round(top_cm, 2), round(left_cm, 2)


def validation_url_for(codigo: str | None = None) -> str | None:
    base = (getattr(settings, 'FRONTEND_URL', None) or '').rstrip('/')
    if not base:
        return None
    if codigo:
        return f'{base}/validar/{codigo}'
    return f'{base}/validar'
