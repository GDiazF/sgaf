"""Cola / bandeja: encolar, firmar y rechazar documentos."""
from __future__ import annotations

from typing import TYPE_CHECKING

from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from .client import PURPOSE_ATENDIDO, normalize_otp
from .models import DocumentoFirmado, FirmaPendiente
from .registry import registrar_documento
from .resolve import rut_to_firmagob_run

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser
    from funcionarios.models import Funcionario


def encolar_firma(
    *,
    firmante: Funcionario,
    titulo: str,
    origen: str,
    referencia_id: int,
    solicitado_por: AbstractBaseUser | None = None,
    grupo_firmante=None,
    meta: dict | None = None,
    pdf_bytes: bytes | None = None,
    nombre_archivo: str = 'documento.pdf',
) -> FirmaPendiente:
    """Crea (o actualiza) un ítem pendiente para el firmante. No firma."""
    if not firmante:
        raise ValueError('Se requiere firmante para encolar la firma.')

    existing = (
        FirmaPendiente.objects.filter(
            origen=origen,
            referencia_id=referencia_id,
            estado=FirmaPendiente.ESTADO_PENDIENTE,
        )
        .order_by('-creado_en')
        .first()
    )
    if existing:
        existing.firmante = firmante
        existing.grupo_firmante = grupo_firmante
        existing.titulo = titulo
        existing.meta = meta or existing.meta or {}
        existing.solicitado_por = solicitado_por
        existing.save()
        pendiente = existing
    else:
        pendiente = FirmaPendiente(
            titulo=titulo,
            origen=origen,
            referencia_id=referencia_id,
            firmante=firmante,
            grupo_firmante=grupo_firmante,
            solicitado_por=solicitado_por,
            meta=meta or {},
        )
        pendiente.save()

    if pdf_bytes:
        pendiente.archivo_origen.save(
            nombre_archivo or 'documento.pdf',
            ContentFile(pdf_bytes),
            save=True,
        )

    from .notify import notificar_documento_para_firmar

    notificar_documento_para_firmar(pendiente)
    return pendiente


def _get_funcionario_user(user):
    try:
        return user.funcionario_profile
    except Exception:
        return None


def usuario_es_firmante_de(pendiente: FirmaPendiente, user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    func = _get_funcionario_user(user)
    return bool(func and pendiente.firmante_id == func.id)


def rechazar_firma(pendiente: FirmaPendiente, user, motivo: str) -> FirmaPendiente:
    if pendiente.estado != FirmaPendiente.ESTADO_PENDIENTE:
        raise ValueError('Solo se pueden rechazar documentos pendientes.')
    if not usuario_es_firmante_de(pendiente, user):
        raise PermissionError('No está autorizado a rechazar este documento.')
    motivo = (motivo or '').strip()
    if len(motivo) < 5:
        raise ValueError('Indique un motivo de rechazo (mínimo 5 caracteres).')
    pendiente.estado = FirmaPendiente.ESTADO_RECHAZADO
    pendiente.motivo_rechazo = motivo
    pendiente.rechazado_en = timezone.now()
    pendiente.save(
        update_fields=['estado', 'motivo_rechazo', 'rechazado_en', 'actualizado_en']
    )
    _registrar_rechazo_origen(pendiente, user, motivo)
    from .notify import marcar_notificaciones_firma

    marcar_notificaciones_firma(pendiente)
    return pendiente


def _registrar_rechazo_origen(pendiente: FirmaPendiente, user, motivo: str) -> None:
    if pendiente.origen != 'rc':
        return
    from servicios.models import HistorialRecepcionConforme, RecepcionConforme

    try:
        rc = RecepcionConforme.objects.get(pk=pendiente.referencia_id)
    except RecepcionConforme.DoesNotExist:
        return

    firmante_nombre = (
        pendiente.firmante.nombre_funcionario if pendiente.firmante_id else None
    )
    usuario = firmante_nombre or getattr(user, 'username', None) or 'Sistema'
    HistorialRecepcionConforme.objects.create(
        recepcion_conforme=rc,
        accion='RECHAZO_FIRMA',
        detalle=(
            f'Firma rechazada ({pendiente.codigo_interno}). '
            f'Motivo: {motivo}'
        ),
        usuario=usuario,
    )


@transaction.atomic
def firmar_pendiente(
    pendiente: FirmaPendiente,
    user,
    *,
    otp: str,
    pdf_bytes: bytes,
    llx: int,
    lly: int,
    urx: int,
    ury: int,
    page: str = 'LAST',
) -> tuple[FirmaPendiente, DocumentoFirmado, bytes]:
    from django.conf import settings

    from .authz import user_puede_firmar
    from .dep_client import (
        get_pdf_page_size_pt,
        pdf_box_to_seal_margins_cm,
        seal_page_from_pdf_page,
        sign_pdf_atendida,
        validation_url_for,
    )

    if pendiente.estado != FirmaPendiente.ESTADO_PENDIENTE:
        raise ValueError('Este documento ya no está pendiente de firma.')
    if not usuario_es_firmante_de(pendiente, user):
        raise PermissionError('No está autorizado a firmar este documento.')
    if not user_puede_firmar(user) and not user.is_superuser:
        raise PermissionError('No tiene permiso para firmar digitalmente.')

    otp_code = normalize_otp(otp)
    if not pdf_bytes:
        raise ValueError('Falta el PDF a firmar.')
    if urx <= llx or ury <= lly:
        raise ValueError('Coordenadas de sello inválidas.')

    funcionario = pendiente.firmante
    rut = (funcionario.rut if funcionario else '') or ''
    if not rut and getattr(settings, 'FIRMAGOB_RUN', ''):
        rut = settings.FIRMAGOB_RUN
    if not rut:
        raise ValueError('No se pudo determinar el RUT del firmante.')

    signer_name = (funcionario.nombre_funcionario or '').strip() if funcionario else 'Firmante'
    role = (funcionario.cargo or '').strip() if funcionario else ''
    entity = getattr(settings, 'FIRMAGOB_ENTITY', '') or None

    # Márgenes reales desde coordenadas PDF (altura de la página del PDF, no A4 fijo).
    seal_page = seal_page_from_pdf_page(page)
    _w, page_h = get_pdf_page_size_pt(pdf_bytes, seal_page)
    seal_top_cm, seal_left_cm = pdf_box_to_seal_margins_cm(
        llx=llx,
        ury=ury,
        page_height_pt=page_h,
    )

    signed = sign_pdf_atendida(
        pdf_bytes,
        rut=rut,
        otp=otp_code,
        file_name=f'{pendiente.codigo_interno or "documento"}.pdf',
        entity=entity,
        validation_url=validation_url_for(pendiente.codigo_interno),
        document_id=pendiente.codigo_interno or None,
        visible_seal=True,
        seal_page=seal_page,
        seal_top_margin_cm=seal_top_cm,
        seal_left_margin_cm=seal_left_cm,
    )

    registro = registrar_documento(
        pdf_bytes=signed,
        nombre_archivo=f'{pendiente.codigo_interno}_firmado.pdf',
        origen=pendiente.origen,
        purpose=PURPOSE_ATENDIDO,
        firmante_nombre=signer_name,
        firmante_run=rut_to_firmagob_run(rut),
        firmante_cargo=role,
        user=user,
    )

    pendiente.archivo_firmado.save(
        f'{pendiente.codigo_interno}_firmado.pdf',
        ContentFile(signed),
        save=False,
    )
    pendiente.estado = FirmaPendiente.ESTADO_FIRMADO
    pendiente.documento_registro = registro
    pendiente.firmado_en = timezone.now()
    pendiente.save()

    _aplicar_efecto_origen(pendiente, signed)
    from .notify import marcar_notificaciones_firma

    marcar_notificaciones_firma(pendiente)
    return pendiente, registro, signed


def _aplicar_efecto_origen(pendiente: FirmaPendiente, signed: bytes) -> None:
    if pendiente.origen == 'rc':
        from servicios.models import HistorialRecepcionConforme, RecepcionConforme

        try:
            rc = RecepcionConforme.objects.get(pk=pendiente.referencia_id)
        except RecepcionConforme.DoesNotExist:
            return
        rc.archivo_escaneado.save(
            f'{rc.folio or pendiente.codigo_interno}_firmado.pdf',
            ContentFile(signed),
            save=False,
        )
        rc.estado = 'COMPLETADA'
        rc.save(update_fields=['archivo_escaneado', 'estado', 'updated_at'])
        HistorialRecepcionConforme.objects.create(
            recepcion_conforme=rc,
            accion='FIRMADO_DIGITAL',
            detalle=f'Firmado digitalmente ({pendiente.codigo_interno}).',
            usuario=pendiente.firmante.nombre_funcionario if pendiente.firmante else 'Sistema',
        )
