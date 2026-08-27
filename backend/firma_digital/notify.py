"""Notificaciones de campana para documentos en bandeja de firmas."""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import FirmaPendiente


def link_firma_pendiente(pendiente_id: int) -> str:
    return f'/firma?pendiente={pendiente_id}'


def notificar_documento_para_firmar(pendiente: FirmaPendiente) -> None:
    """
    Avisa al firmante en la campana. La notificación permanece no leída al
    abrirse; se marca leída al firmar o rechazar el documento.
    """
    from notificaciones.models import Notificacion

    firmante = pendiente.firmante
    user = getattr(firmante, 'user', None) if firmante else None
    if not user:
        return

    link = link_firma_pendiente(pendiente.id)
    # Evitar apilar no leídas del mismo ítem (p. ej. reenvíos)
    Notificacion.objects.filter(usuario=user, link=link, leida=False).update(leida=True)

    titulo = pendiente.titulo or 'Documento por firmar'
    codigo = pendiente.codigo_interno or ''
    mensaje = (
        f'Tiene un documento pendiente de firma digital'
        f'{f" ({codigo})" if codigo else ""}. '
        f'Ábralo en la bandeja de firmas.'
    )
    Notificacion.objects.create(
        usuario=user,
        titulo=f'Firma pendiente: {titulo}',
        mensaje=mensaje,
        tipo='FIRMA',
        link=link,
    )


def marcar_notificaciones_firma(pendiente: FirmaPendiente) -> None:
    """Marca como leídas las notificaciones asociadas al pendiente (sin borrarlas)."""
    from notificaciones.models import Notificacion

    firmante = pendiente.firmante
    user = getattr(firmante, 'user', None) if firmante else None
    if not user:
        return
    Notificacion.objects.filter(
        usuario=user,
        link=link_firma_pendiente(pendiente.id),
        leida=False,
    ).update(leida=True)


def eliminar_notificaciones_firma(*pendiente_ids: int) -> int:
    """Elimina de la campana las notificaciones FIRMA de esos pendientes."""
    from notificaciones.models import Notificacion

    ids = [i for i in pendiente_ids if i]
    if not ids:
        return 0
    links = [link_firma_pendiente(i) for i in ids]
    deleted, _ = Notificacion.objects.filter(tipo='FIRMA', link__in=links).delete()
    return deleted


def cancelar_firmas_origen(*, origen: str, referencia_id: int) -> int:
    """
    Quita de la bandeja las firmas pendientes/rechazadas de un documento de origen
    y elimina sus notificaciones al firmante. No toca las ya firmadas.
    """
    from .models import FirmaPendiente

    qs = FirmaPendiente.objects.filter(
        origen=origen,
        referencia_id=referencia_id,
        estado__in=[
            FirmaPendiente.ESTADO_PENDIENTE,
            FirmaPendiente.ESTADO_RECHAZADO,
        ],
    )
    ids = list(qs.values_list('id', flat=True))
    if not ids:
        return 0
    eliminar_notificaciones_firma(*ids)
    qs.delete()
    return len(ids)
