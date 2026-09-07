"""Registro y consulta de documentos firmados (validador SGAF)."""
from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone

from .models import DocumentoFirmado

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

# Hash temporal mientras se reserva el código para el footer/QR (antes de FirmaGob).
HASH_RESERVA_PREFIX = 'pending:'


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


def reservar_documento(
    *,
    nombre_archivo: str = '',
    origen: str = 'prueba',
    purpose: str = '',
    firmante_nombre: str = '',
    firmante_run: str = '',
    firmante_cargo: str = '',
    user: AbstractBaseUser | None = None,
) -> DocumentoFirmado:
    """
    Crea el registro SGAF-… antes de llamar a FirmaGob para poder incrustar
    la URL/QR correctas en el PDF. Si la firma falla, llamar a liberar_reserva.
    """
    last_error: Exception | None = None
    for _ in range(8):
        codigo = generar_codigo()
        try:
            return DocumentoFirmado.objects.create(
                codigo=codigo,
                hash_sha256=f'{HASH_RESERVA_PREFIX}{codigo}',
                nombre_archivo=(nombre_archivo or '')[:255],
                origen=(origen or 'prueba')[:64],
                purpose=(purpose or '')[:64],
                firmante_nombre=(firmante_nombre or '')[:200],
                firmante_run=(firmante_run or '')[:12],
                firmante_cargo=(firmante_cargo or '')[:200],
                firmado_por=user if getattr(user, 'is_authenticated', False) else None,
            )
        except IntegrityError as exc:
            last_error = exc
            continue
    raise RuntimeError('No se pudo reservar un código de validación SGAF.') from last_error


def liberar_reserva(doc: DocumentoFirmado | None) -> None:
    if not doc or not doc.pk:
        return
    if not str(doc.hash_sha256 or '').startswith(HASH_RESERVA_PREFIX):
        return
    DocumentoFirmado.objects.filter(pk=doc.pk).delete()


def completar_documento(doc: DocumentoFirmado, pdf_bytes: bytes, *, nombre_archivo: str = '') -> DocumentoFirmado:
    """Completa una reserva tras firma exitosa (hash real del PDF firmado)."""
    doc.hash_sha256 = sha256_hex(pdf_bytes)
    if nombre_archivo:
        doc.nombre_archivo = nombre_archivo[:255]
    doc.save(update_fields=['hash_sha256', 'nombre_archivo'])
    return doc


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
    codigo: str | None = None,
) -> DocumentoFirmado:
    """
    Registra un documento ya firmado.
    Si se pasa ``codigo`` (reserva previa), completa ese registro; si no, crea uno nuevo.
    """
    codigo_final = normalizar_codigo(codigo) if codigo else None
    if codigo_final:
        existing = DocumentoFirmado.objects.filter(codigo__iexact=codigo_final).first()
        if existing:
            return completar_documento(existing, pdf_bytes, nombre_archivo=nombre_archivo)

    return DocumentoFirmado.objects.create(
        codigo=codigo_final or generar_codigo(),
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
    pendiente = str(doc.hash_sha256 or '').startswith(HASH_RESERVA_PREFIX)
    return {
        'codigo': doc.codigo,
        'valido': not pendiente,
        'firmado_en': None if pendiente else (doc.firmado_en.isoformat() if doc.firmado_en else None),
        'firmante_nombre': doc.firmante_nombre,
        'firmante_run': doc.firmante_run,
        'firmante_cargo': doc.firmante_cargo,
        'origen': doc.origen,
        'purpose': doc.purpose,
        'nombre_archivo': doc.nombre_archivo,
        'hash_sha256': '' if pendiente else doc.hash_sha256,
        'hash_corto': '' if pendiente else (doc.hash_sha256[:12] if doc.hash_sha256 else ''),
    }
