"""Integración con motor unificado de notificaciones."""

from __future__ import annotations

import logging
from datetime import date, datetime

logger = logging.getLogger(__name__)

MODULO = 'DOC_SERVICIOS'


def _evento_nuevo(codigo: str) -> str:
    suffix = '_NUEVO'
    return f'{codigo[: 40 - len(suffix)]}{suffix}'


def _evento_aviso(codigo: str) -> str:
    suffix = '_AVISO'
    return f'{codigo[: 40 - len(suffix)]}{suffix}'


def ensure_tipo_notificacion(*, evento: str, nombre: str, descripcion: str = '') -> None:
    from comunicaciones.models import PlantillaCorreo
    from notificaciones.models import TipoNotificacion

    full = f'{MODULO}.{evento}'
    plantilla = None
    if evento.endswith('_NUEVO'):
        plantilla = PlantillaCorreo.objects.filter(proposito='DOC_SERVICIOS_NUEVO').first()
    elif evento.endswith('_AVISO'):
        plantilla = PlantillaCorreo.objects.filter(proposito='DOC_SERVICIOS_AVISO').first()

    obj, created = TipoNotificacion.objects.get_or_create(
        codigo=full,
        defaults={
            'modulo': MODULO,
            'evento': evento,
            'nombre': nombre,
            'descripcion': descripcion,
            'enviar_campana': True,
            'enviar_email': False,
            'activo': True,
            'plantilla': plantilla,
        },
    )
    if not created and plantilla and not obj.plantilla_id:
        obj.plantilla = plantilla
        obj.save(update_fields=['plantilla'])


def sync_tipos_notificacion_para_tipo(tipo) -> None:
    """Crea entradas en el catálogo admin según flags del tipo/campos."""
    if tipo.notificar_al_crear:
        ensure_tipo_notificacion(
            evento=_evento_nuevo(tipo.codigo),
            nombre=f'{tipo.nombre}: nuevo registro',
            descripcion=f'Al crear un registro de {tipo.nombre}.',
        )
    date_campos = [
        c
        for c in tipo.campos.filter(activo=True)
        if c.dias_aviso and (c.tipo_dato == 'date' or c.clave == 'fecha_servicio')
    ]
    if date_campos:
        ensure_tipo_notificacion(
            evento=_evento_aviso(tipo.codigo),
            nombre=f'{tipo.nombre}: aviso por fecha',
            descripcion='Recordatorio N días antes de una fecha configurada en el tipo.',
        )


def notificar_registro_creado(registro) -> None:
    tipo = registro.tipo
    if not tipo.notificar_al_crear:
        return
    from notificaciones.services import notificar

    ev = _evento_nuevo(tipo.codigo)
    ensure_tipo_notificacion(
        evento=ev,
        nombre=f'{tipo.nombre}: nuevo registro',
    )
    label = registro.folio or f'#{registro.pk}'
    est = registro.establecimiento.nombre if registro.establecimiento_id else '—'
    try:
        notificar(
            modulo=MODULO,
            evento=ev,
            titulo=f'{tipo.nombre}: {label}',
            mensaje=f'Se registró {tipo.nombre} ({label}) — {est}.',
            tipo='INFO',
            link='/services/documentacion',
            contexto={
                'registro_id': registro.pk,
                'tipo_codigo': tipo.codigo,
            },
            dedupe_key=f'docserv:nuevo:{registro.pk}',
        )
    except Exception:
        logger.exception('No se pudo notificar creación doc-servicios #%s', registro.pk)


def _parse_fecha(value):
    if value is None or value == '':
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raw = str(value)[:10]
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def valor_fecha_registro(registro, campo) -> date | None:
    if campo.clave == 'fecha_servicio':
        return registro.fecha_servicio
    return _parse_fecha((registro.valores or {}).get(campo.clave))


def iter_registros_para_aviso(tipo, qs):
    """
    Si aviso_solo_ultimo_por_establecimiento: solo el más reciente por establecimiento
    (fecha_servicio, luego creado_en). Sin establecimiento → se incluye cada registro.
    Historial no se borra; solo se filtra para avisos.
    """
    from django.db.models import F

    if not getattr(tipo, 'aviso_solo_ultimo_por_establecimiento', False):
        yield from qs
        return

    seen_est = set()
    ordered = qs.order_by(
        F('fecha_servicio').desc(nulls_last=True),
        '-creado_en',
        '-pk',
    )
    for reg in ordered:
        if reg.establecimiento_id is None:
            yield reg
            continue
        if reg.establecimiento_id in seen_est:
            continue
        seen_est.add(reg.establecimiento_id)
        yield reg


# Hitos fijos adicionales (solo si quedan por debajo del umbral configurado).
HITOS_EXTRA = (60, 45, 30, 20, 10, 5, 1)


def hitos_aviso(dias_aviso: int) -> list[int]:
    """
    Si configuran 60 → avisa a los 60, 45, 30, 20, 10, 5 y 1 día(s) restantes.
    Si configuran 30 → 30, 20, 10, 5, 1.
    Una vez cada hito (no todos los días).
    """
    if not dias_aviso or dias_aviso < 1:
        return []
    hitos = {int(dias_aviso)}
    for h in HITOS_EXTRA:
        if 1 <= h < dias_aviso:
            hitos.add(h)
    return sorted(hitos, reverse=True)


def _texto_dias_restantes(dias_rest: int) -> str:
    if dias_rest <= 0:
        return 'vence hoy'
    if dias_rest == 1:
        return 'vence mañana'
    return f'faltan {dias_rest} días'


def _titulo_aviso(*, tipo, establecimiento_nombre: str, dias_rest: int) -> str:
    urgencia = _texto_dias_restantes(dias_rest)
    if establecimiento_nombre and establecimiento_nombre != '—':
        return f'{urgencia.capitalize()}: {establecimiento_nombre}'
    return f'{urgencia.capitalize()} — {tipo.nombre}'


def _mensaje_aviso(*, tipo, campo, fecha: date, dias_rest: int, establecimiento_nombre: str) -> str:
    fecha_fmt = fecha.strftime('%d/%m/%Y')
    urgencia = _texto_dias_restantes(dias_rest)
    # Colegio va en el título; el cuerpo aporta tipo + fecha
    return f'{tipo.nombre} · {campo.etiqueta} {fecha_fmt} ({urgencia}).'


def handler_doc_servicios_avisos(*, stdout=None):
    """Job diario: avisos en hitos (N + 60/45/30/20/10/5/1 si aplican), no todos los días."""
    from django.utils import timezone

    from documentacion_servicios.models import CampoDefinicion, RegistroServicioDoc
    from notificaciones.services import notificar

    def _log(msg):
        if stdout is not None:
            stdout.write(msg)
        else:
            logger.info(msg)

    hoy = timezone.localdate()
    campos_qs = CampoDefinicion.objects.filter(
        activo=True, dias_aviso__isnull=False, tipo__activo=True
    ).exclude(dias_aviso=0).select_related('tipo')
    campos = [
        c for c in campos_qs if c.tipo_dato == 'date' or c.clave == 'fecha_servicio'
    ]
    if not campos:
        _log('DOC_SERVICIOS avisos: sin campos configurados.')
        return 0

    enviados = 0
    for campo in campos:
        tipo = campo.tipo
        hitos = hitos_aviso(campo.dias_aviso)
        if not hitos:
            continue
        ev = _evento_aviso(tipo.codigo)
        ensure_tipo_notificacion(
            evento=ev,
            nombre=f'{tipo.nombre}: aviso por fecha',
        )
        qs = RegistroServicioDoc.objects.filter(tipo=tipo).select_related(
            'proveedor', 'establecimiento', 'tipo'
        )
        for reg in iter_registros_para_aviso(tipo, qs):
            fecha = valor_fecha_registro(reg, campo)
            if not fecha:
                continue
            dias_rest = (fecha - hoy).days
            if dias_rest < 0 or dias_rest not in hitos:
                continue

            avisos = dict(reg.avisos_enviados or {})
            prev = avisos.get(campo.clave)
            # Compat: valor viejo era string fecha; ahora dict hito→fecha
            if isinstance(prev, str):
                enviados_hitos = {}
            elif isinstance(prev, dict):
                enviados_hitos = dict(prev)
            else:
                enviados_hitos = {}

            hito_key = str(dias_rest)
            if hito_key in enviados_hitos:
                continue

            label = reg.folio or ''
            est = reg.establecimiento.nombre if reg.establecimiento_id else '—'
            titulo = _titulo_aviso(
                tipo=tipo, establecimiento_nombre=est, dias_rest=dias_rest
            )
            mensaje = _mensaje_aviso(
                tipo=tipo,
                campo=campo,
                fecha=fecha,
                dias_rest=dias_rest,
                establecimiento_nombre=est,
            )
            if label:
                mensaje = f'{mensaje} · Folio {label}'
            try:
                notificar(
                    modulo=MODULO,
                    evento=ev,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo='WARNING',
                    link='/services/documentacion',
                    contexto={
                        'registro_id': reg.pk,
                        'tipo_codigo': tipo.codigo,
                        'campo': campo.clave,
                        'fecha': fecha.isoformat(),
                        'hito_dias': dias_rest,
                    },
                    dedupe_key=f'docserv:aviso:{reg.pk}:{campo.clave}:h{dias_rest}',
                )
                enviados_hitos[hito_key] = hoy.isoformat()
                avisos[campo.clave] = enviados_hitos
                reg.avisos_enviados = avisos
                reg.save(update_fields=['avisos_enviados'])
                enviados += 1
            except Exception:
                logger.exception(
                    'Aviso doc-servicios falló reg=%s campo=%s', reg.pk, campo.clave
                )

    _log(f'DOC_SERVICIOS avisos: {enviados} disparo(s).')
    return enviados
