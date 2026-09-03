"""Armar paquete PDF de RC (documento + anexos/boletas) y enviar a bandeja de firmas."""
from __future__ import annotations

import io
import logging

import pypdfium2 as pdfium
from django.test import RequestFactory
from rest_framework.request import Request

from firma_digital.models import FirmaPendiente
from firma_digital.queue import encolar_firma

from .models import HistorialRecepcionConforme, RecepcionConforme, RegistroPago

logger = logging.getLogger(__name__)


def _pdf_rc_desde_pago(pago, user, tipo: str = 'PAGO') -> bytes:
    """Genera el PDF de RC reutilizando la acción generate_pdf del ViewSet."""
    from .views import RegistroPagoViewSet

    factory = RequestFactory()
    django_request = factory.get(
        f'/api/registros-pagos/{pago.pk}/generate_pdf/',
        {'tipo': tipo},
    )
    django_request.user = user
    drf_request = Request(django_request)

    viewset = RegistroPagoViewSet()
    viewset.request = drf_request
    viewset.format_kwarg = None
    viewset.args = ()
    viewset.kwargs = {'pk': str(pago.pk)}
    viewset.action_map = {'get': 'generate_pdf'}
    viewset.action = 'generate_pdf'

    def _qs():
        return RegistroPago.objects.filter(pk=pago.pk)

    viewset.get_queryset = _qs
    response = viewset.generate_pdf(drf_request, pk=pago.pk)

    if hasattr(response, 'render'):
        response.render()

    if hasattr(response, 'file') and response.file is not None:
        response.file.seek(0)
        return response.file.read()

    if hasattr(response, 'streaming_content'):
        return b''.join(response.streaming_content)

    content = getattr(response, 'content', b'')
    if content:
        return content
    raise ValueError('No se pudo generar el PDF de la recepción conforme.')


def _merge_pdfs(parts: list[bytes]) -> bytes:
    dest = pdfium.PdfDocument.new()
    try:
        for data in parts:
            if not data or not data.startswith(b'%PDF'):
                continue
            src = pdfium.PdfDocument(data)
            try:
                dest.import_pages(src)
            finally:
                src.close()
        out = io.BytesIO()
        dest.save(out)
        return out.getvalue()
    finally:
        dest.close()


def construir_paquete_rc(rc: RecepcionConforme, user, tipo: str = 'PAGO') -> tuple[bytes, dict]:
    """
    PDF unificado: RC generado + comprobantes/boletas PDF de los pagos asociados.
    """
    pagos = list(
        rc.registros.select_related('establecimiento', 'servicio', 'servicio__proveedor').all()
    )
    if not pagos:
        raise ValueError('La recepción conforme no tiene pagos asociados.')

    parts: list[bytes] = []
    anexos_meta = []

    rc_pdf = _pdf_rc_desde_pago(pagos[0], user, tipo=tipo)
    parts.append(rc_pdf)

    for pago in pagos:
        if not pago.comprobante:
            continue
        try:
            pago.comprobante.open('rb')
            data = pago.comprobante.read()
            pago.comprobante.close()
        except Exception:
            logger.exception('No se pudo leer comprobante del pago %s', pago.pk)
            continue
        if data.startswith(b'%PDF'):
            parts.append(data)
            anexos_meta.append(
                {
                    'pago_id': pago.id,
                    'nro_documento': pago.nro_documento,
                    'nombre': pago.comprobante.name.split('/')[-1],
                }
            )
        else:
            anexos_meta.append(
                {
                    'pago_id': pago.id,
                    'nro_documento': pago.nro_documento,
                    'nombre': pago.comprobante.name.split('/')[-1],
                    'omitido': True,
                    'motivo': 'No es PDF; no se anexó al paquete de firma.',
                }
            )

    if len(parts) == 1:
        merged = parts[0]
    else:
        merged = _merge_pdfs(parts)

    meta = {
        'folio': rc.folio,
        'pago_id': pagos[0].id,
        'tipo_pdf': tipo,
        'proveedor': str(rc.proveedor) if rc.proveedor_id else '',
        'anexos': anexos_meta,
        'paginas_paquete': 'rc+anexos' if anexos_meta else 'rc',
    }
    return merged, meta


def enviar_rc_a_firmar(rc: RecepcionConforme, user, *, tipo: str = 'PAGO') -> FirmaPendiente:
    """Encola o reenvía la RC a la bandeja del firmante (paquete PDF completo)."""
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
        nombre_archivo=f'RC_{rc.folio}_paquete.pdf',
    )

    HistorialRecepcionConforme.objects.create(
        recepcion_conforme=rc,
        accion='ENVIO_FIRMA',
        detalle=(
            f'Enviada a bandeja de firmas ({pendiente.codigo_interno}). '
            f'Anexos PDF: {len(meta.get("anexos") or [])}.'
        ),
        usuario=getattr(user, 'username', None) or 'Sistema',
    )
    return pendiente


def firma_map_for_rc_ids(rc_ids):
    """Última FirmaPendiente por RC en una sola consulta (evita N+1 en listados)."""
    if not rc_ids:
        return {}
    from firma_digital.models import FirmaPendiente

    firmas = (
        FirmaPendiente.objects.filter(origen='rc', referencia_id__in=rc_ids)
        .select_related('documento_registro')
        .order_by('referencia_id', '-creado_en')
    )
    result = {}
    for fp in firmas:
        if fp.referencia_id not in result:
            result[fp.referencia_id] = fp
    return result


def firma_info_rc(rc: RecepcionConforme, latest=None, *, allow_query=True) -> dict:
    """Resumen de firma para listado de RC."""
    if latest is None and allow_query:
        latest = (
            FirmaPendiente.objects.filter(origen='rc', referencia_id=rc.id)
            .select_related('documento_registro')
            .order_by('-creado_en')
            .first()
        )

    base_sin = {
        'firma_estado': 'sin_envio',
        'firma_estado_label': 'Sin envío',
        'firma_motivo_rechazo': '',
        'firma_pendiente_id': None,
        'firma_codigo_interno': None,
        'firma_codigo_validacion': None,
        'puede_enviar_firma': bool(
            rc.firmante_id and rc.estado == 'EMITIDA' and not rc.archivo_escaneado
        ),
        'puede_reenviar_firma': False,
    }
    if not latest:
        return base_sin

    if latest.estado == FirmaPendiente.ESTADO_PENDIENTE:
        return {
            'firma_estado': 'pendiente',
            'firma_estado_label': 'En bandeja',
            'firma_motivo_rechazo': '',
            'firma_pendiente_id': latest.id,
            'firma_codigo_interno': latest.codigo_interno,
            'firma_codigo_validacion': None,
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
            'puede_enviar_firma': False,
            'puede_reenviar_firma': bool(rc.firmante_id and rc.estado == 'EMITIDA'),
        }
    return base_sin
