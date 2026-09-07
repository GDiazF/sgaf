"""Armar PDF de RC para firma digital y metadatos del expediente (comprobantes)."""
from __future__ import annotations

import logging

from firma_digital.models import FirmaPendiente
from firma_digital.queue import FIRMAGOB_MAX_PDF_BYTES, encolar_firma

from .models import HistorialRecepcionConforme, RecepcionConforme, RegistroPago

logger = logging.getLogger(__name__)


def _pdf_rc_desde_recepcion(rc, user, tipo: str = 'PAGO') -> bytes:
    """PDF de la RC completa (propósito RLB 1 o más pagos), no el unitario de un pago."""
    from servicios.pdf import build_recepcion_conforme_pdf

    response = build_recepcion_conforme_pdf(rc, user=user, tipo=tipo or None)

    from rest_framework.response import Response as DRFResponse

    if isinstance(response, DRFResponse):
        data = response.data
        err = data.get('error', str(data)) if isinstance(data, dict) else str(data)
        raise ValueError(err or 'No se pudo generar el PDF de la recepción conforme.')

    if hasattr(response, 'file') and response.file is not None:
        response.file.seek(0)
        return response.file.read()

    if hasattr(response, 'streaming_content'):
        return b''.join(response.streaming_content)

    content = getattr(response, 'content', b'')
    if content:
        return content
    raise ValueError('No se pudo generar el PDF de la recepción conforme.')


def _anexo_meta_from_pago(pago: RegistroPago) -> dict | None:
    if not pago.comprobante:
        return None
    nombre = pago.comprobante.name.split('/')[-1]
    size = None
    try:
        size = pago.comprobante.size
    except Exception:
        pass
    url = ''
    try:
        url = pago.comprobante.url
    except Exception:
        pass

    try:
        pago.comprobante.open('rb')
        head = pago.comprobante.read(5)
        pago.comprobante.close()
    except Exception:
        logger.exception('No se pudo leer comprobante del pago %s', pago.pk)
        return {
            'pago_id': pago.id,
            'nro_documento': pago.nro_documento,
            'nombre': nombre,
            'url': url,
            'size_bytes': size,
            'omitido': True,
            'motivo': 'No se pudo leer el archivo.',
        }

    meta = {
        'pago_id': pago.id,
        'nro_documento': pago.nro_documento,
        'nombre': nombre,
        'url': url,
        'size_bytes': size,
    }
    if not head.startswith(b'%PDF'):
        meta['omitido'] = True
        meta['motivo'] = 'No es PDF; queda como anexo del expediente (no se firma).'
    return meta


def construir_paquete_rc(rc: RecepcionConforme, user, tipo: str = 'PAGO') -> tuple[bytes, dict]:
    """
    PDF a firmar: solo la recepción conforme.
    Los comprobantes se listan en meta.anexos como soporte del expediente (no se fusionan).
    """
    pagos = list(
        rc.registros.select_related('establecimiento', 'servicio', 'servicio__proveedor').all()
    )
    if not pagos:
        raise ValueError('La recepción conforme no tiene pagos asociados.')

    rc_pdf = _pdf_rc_desde_recepcion(rc, user, tipo=tipo)
    if len(rc_pdf) > FIRMAGOB_MAX_PDF_BYTES:
        raise ValueError(
            'El PDF de la recepción conforme supera el tamaño máximo de FirmaGob '
            f'(~{FIRMAGOB_MAX_PDF_BYTES / (1024 * 1024):.1f} MB). '
            'Reduzca el documento antes de enviarlo a firmar.'
        )

    anexos_meta = []
    for pago in pagos:
        item = _anexo_meta_from_pago(pago)
        if item:
            anexos_meta.append(item)

    meta = {
        'folio': rc.folio,
        'pago_id': pagos[0].id,
        'tipo_pdf': tipo,
        'proveedor': str(rc.proveedor) if rc.proveedor_id else '',
        'anexos': anexos_meta,
        'paginas_paquete': 'rc',
        'anexos_en_pdf_firmado': False,
    }
    return rc_pdf, meta


def expediente_comprobantes_rc(rc: RecepcionConforme) -> list[dict]:
    """Comprobantes agrupados a nivel RC (origen: pagos asociados)."""
    out = []
    pagos = rc.registros.all()
    for pago in pagos:
        if not pago.comprobante:
            continue
        nombre = pago.comprobante.name.split('/')[-1]
        size = None
        try:
            size = pago.comprobante.size
        except Exception:
            pass
        url = ''
        try:
            url = pago.comprobante.url
        except Exception:
            pass
        out.append(
            {
                'pago_id': pago.id,
                'nro_documento': pago.nro_documento,
                'nombre': nombre,
                'url': url,
                'size_bytes': size,
            }
        )
    return out


def enviar_rc_a_firmar(rc: RecepcionConforme, user, *, tipo: str = 'PAGO') -> FirmaPendiente:
    """Encola o reenvía la RC a la bandeja (PDF de la RC; anexos solo en meta/expediente)."""
    if rc.estado == 'ANULADA':
        raise ValueError('No se puede enviar a firmar una RC anulada.')
    if rc.estado == 'HISTORICA':
        raise ValueError('No se puede enviar a firmar una RC histórica.')
    if rc.estado == 'COMPLETADA' or rc.archivo_escaneado:
        raise ValueError('La RC ya está firmada o completada.')
    if not rc.firmante_id:
        raise ValueError('Debe asignar un firmante a la RC antes de enviarla.')

    pdf_bytes, meta = construir_paquete_rc(rc, user, tipo=tipo)
    pendiente = encolar_firma(
        firmante=rc.firmante,
        grupo_firmante=rc.grupo_firmante,
        titulo=f'Recepción conforme {rc.folio}',
        origen='rc',
        referencia_id=rc.id,
        solicitado_por=user,
        meta=meta,
        pdf_bytes=pdf_bytes,
        nombre_archivo=f'RC_{rc.folio}.pdf',
    )

    n_anexos = len(meta.get('anexos') or [])
    HistorialRecepcionConforme.objects.create(
        recepcion_conforme=rc,
        accion='ENVIO_FIRMA',
        detalle=(
            f'Enviada a bandeja de firmas ({pendiente.codigo_interno}). '
            f'Se firma solo la RC; comprobantes de soporte: {n_anexos} '
            f'(no incluidos en el PDF a firmar).'
        ),
        usuario=getattr(user, 'username', None) or 'Sistema',
    )
    return pendiente


def firma_info_rc(rc: RecepcionConforme) -> dict:
    """Resumen de firma para listado de RC."""
    qs = FirmaPendiente.objects.filter(origen='rc', referencia_id=rc.id).order_by('-creado_en')
    latest = qs.first()
    expediente = expediente_comprobantes_rc(rc)

    def _paquete_modo(pendiente: FirmaPendiente | None) -> str | None:
        if not pendiente:
            return None
        meta = pendiente.meta or {}
        modo = meta.get('paginas_paquete')
        if modo in ('rc', 'rc+anexos'):
            return modo
        if meta.get('anexos_en_pdf_firmado') is False:
            return 'rc'
        if meta.get('anexos'):
            # Históricos sin flag: si se fusionaban anexos en el PDF.
            return 'rc+anexos'
        return 'rc'

    base_sin = {
        'firma_estado': 'sin_envio',
        'firma_estado_label': 'Sin envío',
        'firma_motivo_rechazo': '',
        'firma_pendiente_id': None,
        'firma_codigo_interno': None,
        'firma_codigo_validacion': None,
        'firma_paquete_modo': None,
        'expediente_comprobantes': expediente,
        'puede_enviar_firma': bool(
            rc.firmante_id and rc.estado == 'EMITIDA' and not rc.archivo_escaneado
        ),
        'puede_reenviar_firma': False,
    }
    if not latest:
        return base_sin

    modo = _paquete_modo(latest)

    if latest.estado == FirmaPendiente.ESTADO_PENDIENTE:
        return {
            'firma_estado': 'pendiente',
            'firma_estado_label': 'En bandeja',
            'firma_motivo_rechazo': '',
            'firma_pendiente_id': latest.id,
            'firma_codigo_interno': latest.codigo_interno,
            'firma_codigo_validacion': None,
            'firma_paquete_modo': modo,
            'expediente_comprobantes': expediente,
            'puede_enviar_firma': False,
            'puede_reenviar_firma': False,
        }
    if latest.estado == FirmaPendiente.ESTADO_FIRMADO:
        return {
            'firma_estado': 'firmado',
            'firma_estado_label': 'Firmada',
            'firma_motivo_rechazo': '',
            'firma_pendiente_id': latest.id,
            'firma_codigo_interno': latest.codigo_interno,
            'firma_codigo_validacion': (
                latest.documento_registro.codigo if latest.documento_registro_id else None
            ),
            'firma_paquete_modo': modo,
            'expediente_comprobantes': expediente,
            'puede_enviar_firma': False,
            'puede_reenviar_firma': False,
        }
    if latest.estado == FirmaPendiente.ESTADO_RECHAZADO:
        return {
            'firma_estado': 'rechazado',
            'firma_estado_label': 'Firma rechazada',
            'firma_motivo_rechazo': latest.motivo_rechazo or '',
            'firma_pendiente_id': latest.id,
            'firma_codigo_interno': latest.codigo_interno,
            'firma_codigo_validacion': None,
            'firma_paquete_modo': modo,
            'expediente_comprobantes': expediente,
            'puede_enviar_firma': False,
            'puede_reenviar_firma': bool(rc.firmante_id and rc.estado == 'EMITIDA'),
        }
    return base_sin
