"""Registro de accesos/descargas de PDFs firmados y expediente."""

from __future__ import annotations

from .models import AccesoDocumentoFirma, FirmaPendiente


def _client_meta(request):
    ip = None
    user_agent = ''
    if not request:
        return ip, user_agent
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        ip = xff.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    user_agent = (request.META.get('HTTP_USER_AGENT') or '')[:2000]
    return ip, user_agent


def _usuario_nombre(user) -> str:
    if not user or not getattr(user, 'is_authenticated', False):
        return 'Anónimo'
    name = f'{getattr(user, "first_name", "") or ""} {getattr(user, "last_name", "") or ""}'.strip()
    return name or getattr(user, 'username', '') or 'Usuario'


def _estado_firma_snapshot(pendiente: FirmaPendiente | None) -> str:
    if not pendiente:
        return AccesoDocumentoFirma.ESTADO_SIN_PENDIENTE
    return pendiente.estado or AccesoDocumentoFirma.ESTADO_SIN_PENDIENTE


def _historial_accion(tipo: str) -> str:
    if tipo == AccesoDocumentoFirma.TIPO_COMPROBANTES:
        return 'DESCARGA_COMPROBANTES'
    return 'DESCARGA_PDF_FIRMADO'


def _build_detalle(
    *,
    tipo: str,
    pendiente: FirmaPendiente | None,
    estado_firma: str,
    via: str,
) -> str:
    tipo_label = {
        AccesoDocumentoFirma.TIPO_DOCUMENTO: 'PDF documento',
        AccesoDocumentoFirma.TIPO_COMPROBANTES: 'PDF comprobantes',
        AccesoDocumentoFirma.TIPO_ARCHIVO_ESCANEADO: 'PDF firmado / escaneado',
    }.get(tipo, tipo)

    parts = [tipo_label]
    if pendiente:
        codes = [pendiente.codigo_interno or f'#{pendiente.pk}']
        if pendiente.documento_registro_id:
            doc = getattr(pendiente, 'documento_registro', None)
            if doc and doc.codigo:
                codes.append(doc.codigo)
        parts.append(f'({ " / ".join(codes) })')
    parts.append(f'· estado firma: {estado_firma}')
    if via:
        parts.append(f'· vía {via}')
    return ' '.join(parts)


def registrar_acceso_documento(
    *,
    request,
    tipo: str,
    pendiente: FirmaPendiente | None = None,
    origen: str = '',
    referencia_id: int | None = None,
    via: str = '',
    espejo_historial_rc: bool = True,
) -> AccesoDocumentoFirma:
    """
    Crea AccesoDocumentoFirma y, si origen es RC, un evento en HistorialRecepcionConforme.
    """
    user = getattr(request, 'user', None)
    if user and not getattr(user, 'is_authenticated', False):
        user = None

    if pendiente is not None:
        origen = origen or (pendiente.origen or '')
        if referencia_id is None:
            referencia_id = pendiente.referencia_id

    estado_firma = _estado_firma_snapshot(pendiente)
    ip, user_agent = _client_meta(request)
    detalle = _build_detalle(
        tipo=tipo,
        pendiente=pendiente,
        estado_firma=estado_firma,
        via=via,
    )

    acceso = AccesoDocumentoFirma.objects.create(
        pendiente=pendiente,
        documento_registro=pendiente.documento_registro if pendiente else None,
        origen=(origen or '')[:64],
        referencia_id=referencia_id,
        tipo=tipo,
        estado_firma=estado_firma,
        usuario=user,
        usuario_nombre=_usuario_nombre(user)[:150],
        ip=ip,
        user_agent=user_agent,
        detalle=detalle,
    )

    if (
        espejo_historial_rc
        and (origen or '') == 'rc'
        and referencia_id
    ):
        try:
            from servicios.models import HistorialRecepcionConforme, RecepcionConforme

            rc = RecepcionConforme.objects.filter(pk=referencia_id).first()
            if rc:
                HistorialRecepcionConforme.objects.create(
                    recepcion_conforme=rc,
                    accion=_historial_accion(tipo),
                    detalle=detalle,
                    usuario=acceso.usuario_nombre or 'Sistema',
                )
        except Exception:
            # No bloquear la descarga si falla el espejo de historial.
            import logging

            logging.getLogger(__name__).exception(
                'No se pudo espejar acceso firma en historial RC %s', referencia_id
            )

    return acceso


def resolver_pendiente_rc(rc_id: int) -> FirmaPendiente | None:
    return (
        FirmaPendiente.objects.filter(origen='rc', referencia_id=rc_id)
        .select_related('documento_registro')
        .order_by('-creado_en')
        .first()
    )
