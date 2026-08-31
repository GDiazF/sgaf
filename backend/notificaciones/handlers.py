"""Handlers de fuentes en vivo (polling) y jobs programados."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.utils import timezone

logger = logging.getLogger(__name__)


def handler_reservas_pendientes(user):
    """Cola en vivo: solicitudes PENDIENTE → items de campana."""
    from solicitudes_reservas.models import SolicitudReserva

    qs = (
        SolicitudReserva.objects.filter(estado='PENDIENTE')
        .select_related('recurso')
        .order_by('fecha_inicio')[:50]
    )
    items = []
    for res in qs:
        start = res.fecha_inicio
        date_key = start.strftime('%Y-%m-%d') if start else ''
        link = (
            f'/reservas?date={date_key}&highlight={res.id}'
            if date_key
            else f'/reservas?highlight={res.id}'
        )
        time_label = start.strftime('%H:%M') if start else ''
        date_label = ''
        if start:
            date_label = start.strftime('%d/%m')
        desc_parts = [
            res.nombre_funcionario or 'Solicitante',
            time_label,
            getattr(res.recurso, 'nombre', None) or '',
        ]
        items.append(
            {
                'id': res.id,
                'titulo': f'Reserva: {res.titulo or "Sin título"}',
                'descripcion': ' · '.join(p for p in desc_parts if p),
                'link': link,
                'tiempo': date_label,
            }
        )
    return items


def handler_vehiculos_vencimientos(*, stdout=None):
    """
    Detecta documentos por vencer y dispara notificar().
    Destinatarios solo desde TipoNotificacion VEHICULOS.VENCIMIENTO_DOC.
    """
    from comunicaciones.models import PlantillaCorreo
    from notificaciones.models import TipoNotificacion
    from notificaciones.services import notificar, resolver_destinatarios_tipo
    from vehiculos.models import VehiculoDocumento

    def _log(msg, style=None):
        if stdout is not None:
            stdout.write(msg)
        else:
            logger.info(msg)

    hoy = timezone.localdate()

    tipo = TipoNotificacion.objects.filter(
        modulo='VEHICULOS', evento='VENCIMIENTO_DOC', activo=True
    ).first()
    if not tipo:
        _log('Tipo VEHICULOS.VENCIMIENTO_DOC no existe o inactivo.')
        return 0

    if tipo.enviar_email and not tipo.plantilla_id:
        plantilla = PlantillaCorreo.objects.filter(
            proposito='ALERTA_VENCIMIENTO_VEHICULO'
        ).first()
        if plantilla:
            tipo.plantilla = plantilla
            tipo.save(update_fields=['plantilla'])

    documentos = VehiculoDocumento.objects.filter(
        fecha_vencimiento__isnull=False,
        vehiculo__activo=True,
    ).select_related('vehiculo', 'tipo')

    enviados = 0
    for doc in documentos:
        dias_aviso = doc.dias_aviso if doc.dias_aviso is not None else doc.tipo.dias_aviso_defecto
        fecha_aviso = doc.fecha_vencimiento - timedelta(days=dias_aviso)

        if hoy >= fecha_aviso and doc.ultima_notificacion != hoy:
            contexto = {
                'patente': doc.vehiculo.patente,
                'vehiculo': f'{doc.vehiculo.marca} {doc.vehiculo.modelo}',
                'documento': doc.tipo.nombre,
                'fecha_vencimiento': doc.fecha_vencimiento.strftime('%d/%m/%Y'),
                'dias_restantes': (doc.fecha_vencimiento - hoy).days,
            }
            users, emails = resolver_destinatarios_tipo(tipo)
            creadas = notificar(
                modulo='VEHICULOS',
                evento='VENCIMIENTO_DOC',
                titulo=f'Vencimiento: {doc.vehiculo.patente} — {doc.tipo.nombre}',
                mensaje=(
                    f'El documento {doc.tipo.nombre} del vehículo {doc.vehiculo.patente} '
                    f'vence el {contexto["fecha_vencimiento"]} '
                    f'({contexto["dias_restantes"]} días).'
                ),
                tipo='WARNING',
                link='/vehiculos',
                email_contexto=contexto,
                contexto={
                    'vehiculo_id': doc.vehiculo_id,
                    'documento_id': doc.id,
                },
                dedupe_key=f'vehiculo:{doc.vehiculo_id}:doc:{doc.id}:{hoy.isoformat()}',
                async_email=False,
            )
            if creadas or (tipo.enviar_email and (users or emails)):
                doc.ultima_notificacion = hoy
                doc.save(update_fields=['ultima_notificacion'])
                enviados += 1
                _log(f'Notificación disparada: {doc.vehiculo.patente} - {doc.tipo.nombre}')

    _log(f'Vencimientos: {enviados} disparo(s).')
    return enviados


def handler_doc_servicios_avisos(*, stdout=None):
    from documentacion_servicios.notify import handler_doc_servicios_avisos as _run

    return _run(stdout=stdout)


LIVE_HANDLERS = {
    'reservas_pendientes': handler_reservas_pendientes,
}

JOB_HANDLERS = {
    'vehiculos_vencimientos': handler_vehiculos_vencimientos,
    'doc_servicios_avisos': handler_doc_servicios_avisos,
}
