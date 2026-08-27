"""Registro y consulta de documentos firmados (validador SGAF)."""
from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .models import DocumentoFirmado

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalizar_codigo(codigo: str) -> str:
    return (codigo or '').strip().upper()


def generar_codigo() -> str:
    """Genera código único SGAF-AAAA-NNNN (secuencia por año)."""
    year = timezone.localtime().year
    prefix = f'SGAF-{year}-'
    with transaction.atomic():
        last = (
            DocumentoFirmado.objects.select_for_update()
            .filter(codigo__startswith=prefix)
            .aggregate(m=Max('codigo'))
            .get('m')
        )
        seq = 1
        if last:
            try:
                seq = int(str(last).rsplit('-', 1)[-1]) + 1
            except ValueError:
                seq = DocumentoFirmado.objects.filter(codigo__startswith=prefix).count() + 1
        return f'{prefix}{seq:04d}'


def registrar_documento(
    *,
    pdf_bytes: bytes,
    nombre_archivo: str = '',
    origen: str = 'prueba',
    purpose: str = '',
    firmante_nombre: str = '',
    firmante_run: str = '',
    firmante_cargo: str = '',
    user: AbstractBaseUser | None = None,
) -> DocumentoFirmado:
    codigo = generar_codigo()
    return DocumentoFirmado.objects.create(
        codigo=codigo,
        hash_sha256=sha256_hex(pdf_bytes),
        nombre_archivo=(nombre_archivo or '')[:255],
        origen=(origen or 'prueba')[:64],
        purpose=(purpose or '')[:64],
        firmante_nombre=(firmante_nombre or '')[:200],
        firmante_run=(firmante_run or '')[:12],
        firmante_cargo=(firmante_cargo or '')[:200],
        firmado_por=user if getattr(user, 'is_authenticated', False) else None,
    )


def documento_a_dict(doc: DocumentoFirmado) -> dict:
    return {
        'codigo': doc.codigo,
        'valido': True,
        'firmado_en': doc.firmado_en.isoformat() if doc.firmado_en else None,
        'firmante_nombre': doc.firmante_nombre,
        'firmante_run': doc.firmante_run,
        'firmante_cargo': doc.firmante_cargo,
        'origen': doc.origen,
        'purpose': doc.purpose,
        'nombre_archivo': doc.nombre_archivo,
        'hash_sha256': doc.hash_sha256,
        'hash_corto': doc.hash_sha256[:12] if doc.hash_sha256 else '',
    }
