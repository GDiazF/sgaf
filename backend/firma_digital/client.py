"""
Cliente HTTP para la API FirmaGob (Chile).

Protocolo basado en el manual de integración v2 y en la librería firma-gob (Node):
JWT HS256 + POST a /firma/v2/files/tickets.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

PURPOSE_DESATENDIDO = 'Desatendido'
PURPOSE_ATENDIDO = 'Propósito General'
CHILE_TZ = ZoneInfo('America/Santiago')
OTP_RE = re.compile(r'^\d{6}$')


class FirmaGobError(Exception):
    """Error controlado al llamar a FirmaGob."""

    def __init__(self, message: str, status_code: int | None = None, payload: Any = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.payload = payload


@dataclass
class FirmaGobConfig:
    api_url: str
    api_token: str
    secret: str
    entity: str
    run: str
    purpose: str

    @classmethod
    def from_settings(cls) -> 'FirmaGobConfig':
        return cls(
            api_url=getattr(
                settings,
                'FIRMAGOB_API_URL',
                'https://api.firma.digital.gob.cl/firma/v2/files/tickets',
            ),
            api_token=getattr(settings, 'FIRMAGOB_API_TOKEN', ''),
            secret=getattr(settings, 'FIRMAGOB_SECRET', ''),
            entity=getattr(settings, 'FIRMAGOB_ENTITY', ''),
            run=getattr(settings, 'FIRMAGOB_RUN', ''),
            # SGAF siempre firma con Propósito General (OTP obligatorio).
            purpose=PURPOSE_ATENDIDO,
        )

    def validate(self) -> None:
        missing = [
            name
            for name, value in (
                ('FIRMAGOB_API_TOKEN', self.api_token),
                ('FIRMAGOB_SECRET', self.secret),
                ('FIRMAGOB_ENTITY', self.entity),
                ('FIRMAGOB_RUN', self.run),
            )
            if not value
        ]
        if missing:
            raise FirmaGobError(
                f'Configuración FirmaGob incompleta: falta {", ".join(missing)} en settings/.env.'
            )
        if self.purpose != PURPOSE_ATENDIDO:
            raise FirmaGobError(
                f'SGAF solo firma con "{PURPOSE_ATENDIDO}". '
                f'Valor recibido: "{self.purpose}".'
            )


def normalize_otp(otp: str | None) -> str:
    """Valida y normaliza el OTP de 6 dígitos del certificado FirmaGob."""
    raw = (otp or '').strip()
    if not OTP_RE.fullmatch(raw):
        raise FirmaGobError(
            'Debe ingresar un código OTP de exactamente 6 dígitos '
            '(Google Authenticator del certificado FirmaGob en la RA; '
            'no es el código MFA de inicio de sesión de SGAF).'
        )
    return raw


def _b64_standard(data: bytes, *, strip_padding: bool = True) -> str:
    """Base64 estándar (como Buffer.toString('base64') en Node)."""
    encoded = base64.b64encode(data).decode('ascii')
    return encoded.rstrip('=') if strip_padding else encoded


def build_jwt(config: FirmaGobConfig) -> str:
    """
    Construye el JWT HS256 requerido por FirmaGob.

    Compatible con firma-gob: header con padding; payload y firma sin '='.
    """
    header = {'alg': 'HS256', 'typ': 'JWT'}
    expiration = datetime.now(CHILE_TZ) + timedelta(minutes=29)
    payload = {
        'entity': config.entity,
        'run': config.run,
        'purpose': config.purpose,
        'expiration': expiration.strftime('%Y-%m-%dT%H:%M:%S'),
    }

    header_enc = _b64_standard(
        json.dumps(header, separators=(',', ':')).encode('utf-8'),
        strip_padding=False,
    )
    payload_enc = _b64_standard(
        json.dumps(payload, separators=(',', ':'), ensure_ascii=False).encode('utf-8'),
        strip_padding=True,
    )
    unsigned = f'{header_enc}.{payload_enc}'
    signature = hmac.new(
        config.secret.encode('utf-8'),
        unsigned.encode('utf-8'),
        hashlib.sha256,
    ).digest()
    signature_enc = _b64_standard(signature, strip_padding=True)
    return f'{unsigned}.{signature_enc}'


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def pdf_to_base64(data: bytes) -> str:
    return base64.b64encode(data).decode('ascii')


def base64_to_bytes(content: str) -> bytes:
    return base64.b64decode(content)


def _message_from_firmagob_payload(payload: Any, fallback: str) -> str:
    if not isinstance(payload, dict):
        return _clarify_firmagob_message(str(fallback))
    metadata = payload.get('metadata') or {}
    if metadata.get('OTP_expired') is True:
        return (
            'El código OTP expiró o es inválido. '
            'Genere uno nuevo en Google Authenticator (certificado FirmaGob) e intente de nuevo.'
        )
    files = payload.get('files') or []
    if files:
        first = files[0] if isinstance(files[0], dict) else {}
        for key in ('documentStatus', 'status', 'error', 'message'):
            value = first.get(key)
            if value:
                return _clarify_firmagob_message(str(value))
    for key in ('error', 'message'):
        value = payload.get(key)
        if value:
            return _clarify_firmagob_message(str(value))
    return _clarify_firmagob_message(str(fallback))


def _clarify_firmagob_message(message: str) -> str:
    """Traduce errores frecuentes de FirmaGob a indicaciones accionables en SGAF."""
    raw = (message or '').strip()
    low = raw.lower()

    # Orden importa: el error de certificado también dice «aplicación» / «no existe».
    if 'certificado' in low and (
        'no es válido' in low
        or 'no es valido' in low
        or 'expirado' in low
        or 'no tiene permisos' in low
        or 'no existe' in low
    ):
        return (
            'FirmaGob no aceptó el certificado del firmante '
            '(inválido, expirado, inexistente o sin permiso para esta aplicación). '
            'Verifique en https://firma.digital.gob.cl/ que su certificado '
            'Propósito General esté vigente, asociado al RUT del funcionario '
            'en SGAF, y habilitado para la aplicación SGAF. '
            'El OTP debe ser el de ese certificado (Google Authenticator).'
        )
    if 'aplicaci' in low and 'no existe' in low and ' en la ra' in low:
        return (
            'FirmaGob rechazó las credenciales de la aplicación '
            '(«aplicación no existe en la RA»). '
            'Esto no es el OTP del firmante: revise en el .env que '
            'FIRMAGOB_API_TOKEN, FIRMAGOB_SECRET y FIRMAGOB_ENTITY '
            'sean exactamente los de la aplicación registrada para SGAF '
            'en la RA (ambiente productivo), y reinicie el backend.'
        )
    if 'token' in low and ('secret' in low or 'no valido' in low or 'no válido' in low):
        return (
            f'{raw} Revise FIRMAGOB_SECRET / FIRMAGOB_API_TOKEN en el .env '
            '(deben coincidir con la app registrada en la RA).'
        )
    if 'servicio' in low and 'prop' in low:
        return (
            f'{raw} Verifique que FIRMAGOB_ENTITY coincida carácter por carácter '
            'con el nombre institucional registrado y que el propósito sea '
            '«Propósito General».'
        )
    return raw


def firmagob_http_status(exc: FirmaGobError) -> int:
    """
    Mapea errores de FirmaGob a HTTP de SGAF.
    No reenvía 404 de FirmaGob (confunde con «ruta no existe» en el frontend).
    """
    code = exc.status_code
    msg = (exc.message or '').lower()
    if code == 404 or ('aplicaci' in msg and 'ra' in msg):
        return 502
    if code and 400 <= code < 600:
        return code
    return 502


class FirmaGobClient:
    def __init__(self, config: FirmaGobConfig | None = None):
        self.config = config or FirmaGobConfig.from_settings()

    def sign_pdf(
        self,
        pdf_bytes: bytes,
        *,
        otp: str | None = None,
        description: str = 'documento',
        layout: str | None = None,
    ) -> bytes:
        """Firma un PDF completo vía FirmaGob y retorna los bytes del PDF firmado."""
        self.config.purpose = PURPOSE_ATENDIDO
        self.config.validate()
        otp_code = normalize_otp(otp)

        token = build_jwt(self.config)
        file_entry: dict[str, Any] = {
            'content-type': 'application/pdf',
            'content': pdf_to_base64(pdf_bytes),
            'description': description,
            'checksum': sha256_hex(pdf_bytes),
        }
        if layout:
            file_entry['layout'] = layout

        body = {
            'api_token_key': self.config.api_token,
            'token': token,
            'files': [file_entry],
        }

        headers = {
            'Content-Type': 'application/json',
            'OTP': otp_code,
        }

        try:
            response = requests.post(
                self.config.api_url,
                json=body,
                headers=headers,
                timeout=120,
            )
        except requests.RequestException as exc:
            logger.exception('Error de red al llamar FirmaGob')
            raise FirmaGobError(f'No se pudo conectar con FirmaGob: {exc}') from exc

        try:
            payload = response.json()
        except ValueError:
            raise FirmaGobError(
                f'Respuesta no JSON de FirmaGob (HTTP {response.status_code}).',
                status_code=response.status_code,
                payload=response.text[:500],
            )

        files = payload.get('files') or []

        def _raise(msg_fallback: str) -> None:
            msg = _message_from_firmagob_payload(payload, msg_fallback)
            run = (self.config.run or '').strip()
            if run and (
                'certificado' in msg.lower()
                or 'certificado' in str(payload).lower()
            ):
                msg = f'{msg} RUN usado: {run}.'
            raise FirmaGobError(msg, status_code=response.status_code, payload=payload)

        # Preferir mensaje por archivo cuando FirmaGob marca ERROR en files[]
        if files:
            first = files[0]
            file_status = str(first.get('status') or '')
            if file_status.upper().startswith('ERROR') or file_status.lower() == 'error':
                _raise(
                    first.get('documentStatus')
                    or first.get('status')
                    or 'La firma del documento falló.'
                )

        if response.status_code >= 400:
            _raise(f'Error HTTP {response.status_code} de FirmaGob')

        if isinstance(payload, dict):
            metadata = payload.get('metadata') or {}
            if metadata.get('OTP_expired') is True:
                raise FirmaGobError(
                    _message_from_firmagob_payload(payload, 'OTP inválido o expirado.'),
                    status_code=response.status_code or 400,
                    payload=payload,
                )

        if not files:
            raise FirmaGobError(
                _message_from_firmagob_payload(
                    payload,
                    'FirmaGob no devolvió archivos firmados.',
                ),
                status_code=response.status_code,
                payload=payload,
            )

        signed = files[0]
        if signed.get('status') and str(signed.get('status')).upper() not in ('OK',):
            raise FirmaGobError(
                _message_from_firmagob_payload(
                    payload,
                    signed.get('documentStatus')
                    or signed.get('status')
                    or 'La firma del documento falló.',
                ),
                status_code=response.status_code,
                payload=payload,
            )

        content = signed.get('content')
        if not content:
            raise FirmaGobError(
                'La respuesta de FirmaGob no incluye el PDF firmado (content).',
                status_code=response.status_code,
                payload=payload,
            )

        return base64_to_bytes(content)
