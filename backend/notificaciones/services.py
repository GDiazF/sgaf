"""Motor unificado de notificaciones: campana y/o correo según TipoNotificacion."""

from __future__ import annotations

import logging
import re
import threading

from django.contrib.auth.models import Group, User
from django.db import IntegrityError

from comunicaciones.utils import enviar_correo_maestro
from notificaciones.models import Notificacion, TipoNotificacion

logger = logging.getLogger(__name__)


def _as_user_list(usuarios) -> list[User]:
    if usuarios is None:
        return []
    if isinstance(usuarios, User):
        return [usuarios]
    return [u for u in usuarios if u is not None]


def _users_from_funcionario_grupos(grupos) -> set[User]:
    users: set[User] = set()
    if not grupos:
        return users
    for grupo in grupos:
        qs = (
            grupo.funcionarios.filter(estado=True, user__isnull=False, user__is_active=True)
            .select_related('user')
        )
        for func in qs:
            if func.user_id:
                users.add(func.user)
    return users


def _users_from_roles(roles) -> set[User]:
    users: set[User] = set()
    if not roles:
        return users
    role_ids = [r.pk if isinstance(r, Group) else r for r in roles]
    return set(User.objects.filter(is_active=True, groups__id__in=role_ids).distinct())


def _parse_extra_emails(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [e.strip() for e in re.split(r'[,;\n]+', raw) if e.strip()]


def resolver_destinatarios_tipo(
    tipo: TipoNotificacion,
    *,
    usuarios=None,
    grupos=None,
    roles=None,
    email_destinatarios: list[str] | None = None,
) -> tuple[list[User], list[str]]:
    """Une destinatarios del tipo + overrides dinámicos. Retorna (users, emails_extra)."""
    user_set: set[User] = set()

    user_set.update(tipo.usuarios.filter(is_active=True))
    user_set.update(_users_from_funcionario_grupos(tipo.grupos.all()))
    user_set.update(_users_from_roles(tipo.roles.all()))

    user_set.update(u for u in _as_user_list(usuarios) if getattr(u, 'is_active', True))
    user_set.update(_users_from_funcionario_grupos(grupos or []))
    user_set.update(_users_from_roles(roles or []))

    emails = _parse_extra_emails(tipo.emails_adicionales)
    if email_destinatarios:
        emails.extend(email_destinatarios)

    # Dedup emails case-insensitive
    email_map: dict[str, str] = {}
    for email in emails:
        email_map[email.lower()] = email

    # Emails de users (para canal email)
    for user in user_set:
        if user.email:
            email_map[user.email.lower()] = user.email

    return list(user_set), list(email_map.values())


def puede_ver_reservas_pendientes_campana(user: User) -> bool:
    """Quién ve el bloque en vivo de reservas: destinatarios de RESERVAS.AVISO_ADMIN."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if usuario_en_destinatarios_tipo(user, 'RESERVAS', 'AVISO_ADMIN'):
        return True
    # Fallback si el tipo aún no tiene destinatarios configurados
    tipo = TipoNotificacion.objects.filter(
        modulo='RESERVAS', evento='AVISO_ADMIN', activo=True
    ).first()
    if tipo and (
        tipo.usuarios.exists() or tipo.grupos.exists() or tipo.roles.exists()
        or (tipo.emails_adicionales or '').strip()
    ):
        return False
    return user.has_perm('solicitudes_reservas.can_approve_reserva') or user.has_perm(
        'solicitudes_reservas.change_solicitudreserva'
    )


def _enviar_email_async(proposito, destinatarios, contexto, cuenta_smtp=None, plantilla=None):
    def _run():
        try:
            enviar_correo_maestro(
                proposito,
                destinatarios,
                contexto or {},
                cuenta_smtp=cuenta_smtp,
                plantilla=plantilla,
            )
        except Exception:
            logger.exception('Error enviando email de notificación')

    threading.Thread(target=_run, daemon=True).start()


def notificar(
    *,
    modulo: str,
    evento: str,
    titulo: str,
    mensaje: str,
    link: str | None = None,
    tipo: str = 'INFO',
    usuarios=None,
    grupos=None,
    roles=None,
    email_destinatarios: list[str] | None = None,
    email_contexto: dict | None = None,
    contexto: dict | None = None,
    async_email: bool = True,
    dedupe_key: str | None = None,
    force_channels: list[str] | None = None,
) -> list[Notificacion]:
    """
    Crea avisos de campana y/o envía correo según TipoNotificacion.
    Destinatarios = config admin del tipo ∪ overrides dinámicos.
    """
    tipo_cfg = (
        TipoNotificacion.objects.filter(modulo=modulo, evento=evento, activo=True)
        .prefetch_related('usuarios', 'grupos', 'roles')
        .select_related('cuenta_smtp', 'plantilla')
        .first()
    )
    if not tipo_cfg:
        logger.warning('TipoNotificacion inactivo o inexistente: %s.%s', modulo, evento)
        return []

    if force_channels is not None:
        do_campana = 'campana' in force_channels
        do_email = 'email' in force_channels
    else:
        do_campana = tipo_cfg.enviar_campana
        do_email = tipo_cfg.enviar_email

    users, emails = resolver_destinatarios_tipo(
        tipo_cfg,
        usuarios=usuarios,
        grupos=grupos,
        roles=roles,
        email_destinatarios=email_destinatarios,
    )

    creadas: list[Notificacion] = []
    if do_campana:
        for user in users:
            if dedupe_key:
                exists = Notificacion.objects.filter(usuario=user, dedupe_key=dedupe_key).exists()
                if exists:
                    continue
            try:
                n = Notificacion.objects.create(
                    usuario=user,
                    titulo=titulo,
                    mensaje=mensaje,
                    tipo=tipo,
                    modulo=modulo,
                    evento=evento,
                    link=link,
                    contexto=contexto or {},
                    dedupe_key=dedupe_key or None,
                )
                creadas.append(n)
            except IntegrityError:
                continue

    if do_email and emails:
        from comunicaciones.models import PlantillaCorreo

        plantilla = tipo_cfg.plantilla
        proposito = plantilla.proposito if plantilla else None
        if not proposito:
            proposito = _proposito_plantilla_sugerido(modulo, evento)
        if not plantilla and proposito:
            plantilla = PlantillaCorreo.objects.filter(proposito=proposito).first()
            if plantilla and not tipo_cfg.plantilla_id:
                tipo_cfg.plantilla = plantilla
                tipo_cfg.save(update_fields=['plantilla'])

        cuenta = tipo_cfg.cuenta_smtp or (plantilla.cuenta_smtp if plantilla else None)

        if not proposito and not plantilla:
            logger.warning(
                'Tipo %s.%s tiene email ON pero sin plantilla ni propósito por defecto; no se envía correo',
                modulo,
                evento,
            )
        else:
            ctx = {
                **(email_contexto or {}),
                'titulo': titulo,
                'mensaje': mensaje,
                'link': link or '',
                'modulo': modulo,
                'evento': evento,
            }
            # Sin fila PlantillaCorreo: igual se puede enviar con HTML mínimo
            if plantilla is None and proposito:
                from comunicaciones.utils import enviar_correo_simple

                enviar_correo_simple(
                    emails,
                    ctx,
                    cuenta_smtp=cuenta,
                    asunto_tpl='{{ titulo }}',
                    cuerpo_tpl='<h2>{{ titulo }}</h2><p>{{ mensaje }}</p>',
                )
            elif async_email:
                _enviar_email_async(proposito, emails, ctx, cuenta_smtp=cuenta, plantilla=plantilla)
            else:
                enviar_correo_maestro(
                    proposito,
                    emails,
                    ctx,
                    cuenta_smtp=cuenta,
                    plantilla=plantilla,
                )

    return creadas


def _proposito_plantilla_sugerido(modulo: str, evento: str) -> str | None:
    """Plantilla compartida por familia de evento (no una por código de negocio)."""
    mod = (modulo or '').upper()
    ev = (evento or '').upper()
    if mod == 'DOC_SERVICIOS':
        if ev.endswith('_AVISO'):
            return 'DOC_SERVICIOS_AVISO'
        if ev.endswith('_NUEVO'):
            return 'DOC_SERVICIOS_NUEVO'
    if mod == 'VEHICULOS' and ev == 'VENCIMIENTO_DOC':
        return 'ALERTA_VENCIMIENTO_VEHICULO'
    if mod == 'RESERVAS' and ev == 'AVISO_ADMIN':
        return 'RESERVA_AVISO_ADMIN'
    return None


def seed_tipos_notificacion() -> None:
    """Crea tipos base si no existen (idempotente)."""
    from comunicaciones.models import PlantillaCorreo

    seeds = [
        {
            'codigo': 'TICKETS.NUEVO',
            'modulo': 'TICKETS',
            'evento': 'NUEVO',
            'nombre': 'Nuevo ticket',
            'descripcion': 'Aviso a agentes cuando se crea un ticket.',
            'enviar_campana': True,
            'enviar_email': False,
            'plantilla_proposito': None,
        },
        {
            'codigo': 'TICKETS.CAMBIO_ESTADO',
            'modulo': 'TICKETS',
            'evento': 'CAMBIO_ESTADO',
            'nombre': 'Cambio de estado de ticket',
            'enviar_campana': True,
            'enviar_email': False,
            'plantilla_proposito': None,
        },
        {
            'codigo': 'TICKETS.NUEVO_MENSAJE',
            'modulo': 'TICKETS',
            'evento': 'NUEVO_MENSAJE',
            'nombre': 'Nuevo mensaje en ticket',
            'enviar_campana': True,
            'enviar_email': False,
            'plantilla_proposito': None,
        },
        {
            'codigo': 'VEHICULOS.VENCIMIENTO_DOC',
            'modulo': 'VEHICULOS',
            'evento': 'VENCIMIENTO_DOC',
            'nombre': 'Vencimiento de documento vehicular',
            'descripcion': 'Canales y destinatarios en este tipo (ya no en Destinatarios operativos).',
            'enviar_campana': True,
            'enviar_email': True,
            'plantilla_proposito': 'ALERTA_VENCIMIENTO_VEHICULO',
        },
        {
            'codigo': 'RESERVAS.AVISO_ADMIN',
            'modulo': 'RESERVAS',
            'evento': 'AVISO_ADMIN',
            'nombre': 'Nueva solicitud de reserva (admins)',
            'descripcion': 'Campana en vivo + correo a quienes gestionan reservas.',
            'enviar_campana': True,
            'enviar_email': True,
            'plantilla_proposito': 'RESERVA_AVISO_ADMIN',
        },
    ]
    for data in seeds:
        plantilla = None
        if data.get('plantilla_proposito'):
            plantilla = PlantillaCorreo.objects.filter(
                proposito=data['plantilla_proposito']
            ).first()
        # Clave de negocio = modulo+evento (el código es etiqueta editable en admin)
        obj = TipoNotificacion.objects.filter(
            modulo=data['modulo'], evento=data['evento']
        ).first()
        if obj is None:
            obj = TipoNotificacion.objects.filter(codigo=data['codigo']).first()
        if obj is None:
            TipoNotificacion.objects.create(
                codigo=data['codigo'],
                modulo=data['modulo'],
                evento=data['evento'],
                nombre=data['nombre'],
                descripcion=data.get('descripcion', ''),
                enviar_campana=data['enviar_campana'],
                enviar_email=data['enviar_email'],
                activo=True,
                plantilla=plantilla,
            )
        elif plantilla and not obj.plantilla_id:
            obj.plantilla = plantilla
            obj.save(update_fields=['plantilla'])


# Mapa legado DestinatariosCorreoOperativo.proposito → TipoNotificacion
PROPOSITO_OPERATIVO_A_TIPO = {
    'RESERVA_AVISO_ADMIN': ('RESERVAS', 'AVISO_ADMIN'),
    'ALERTA_VENCIMIENTO_VEHICULO': ('VEHICULOS', 'VENCIMIENTO_DOC'),
}


def migrar_destinatarios_operativos_a_tipos() -> None:
    """
    Copia grupos/usuarios/emails de DestinatariosCorreoOperativo hacia TipoNotificacion.
    Idempotente: solo añade, no borra. También rellena M2M de FuenteViva RESERVAS_PENDIENTES.
    """
    from comunicaciones.models import DestinatariosCorreoOperativo
    from notificaciones.models import FuenteViva

    for proposito, (modulo, evento) in PROPOSITO_OPERATIVO_A_TIPO.items():
        cfg = (
            DestinatariosCorreoOperativo.objects.filter(proposito=proposito, activo=True)
            .prefetch_related('grupos', 'usuarios')
            .first()
        )
        if not cfg:
            continue
        tipo = TipoNotificacion.objects.filter(
            modulo=modulo, evento=evento, activo=True
        ).first()
        if not tipo:
            continue
        tipo.grupos.add(*cfg.grupos.all())
        tipo.usuarios.add(*cfg.usuarios.all())
        extras = (cfg.emails_adicionales or '').strip()
        if extras:
            actual = (tipo.emails_adicionales or '').strip()
            if not actual:
                tipo.emails_adicionales = extras
                tipo.save(update_fields=['emails_adicionales'])
            elif extras not in actual:
                tipo.emails_adicionales = f'{actual}\n{extras}'
                tipo.save(update_fields=['emails_adicionales'])

        if proposito == 'RESERVA_AVISO_ADMIN':
            fuente = FuenteViva.objects.filter(codigo='RESERVAS_PENDIENTES').first()
            if fuente:
                fuente.grupos.add(*cfg.grupos.all())
                fuente.usuarios.add(*cfg.usuarios.all())
                # Deja de depender del propósito operativo
                if fuente.proposito_operativo:
                    fuente.proposito_operativo = ''
                    fuente.save(update_fields=['proposito_operativo'])


def seed_fuentes_y_jobs() -> None:
    from datetime import time

    from notificaciones.models import FuenteViva, JobProgramado

    FuenteViva.objects.get_or_create(
        codigo='RESERVAS_PENDIENTES',
        defaults={
            'nombre': 'Reservas pendientes de aprobación',
            'titulo_bloque': '',
            'handler_key': 'reservas_pendientes',
            'activo': True,
            'orden': 0,
            'proposito_operativo': '',
        },
    )
    JobProgramado.objects.get_or_create(
        codigo='VEHICULOS_VENCIMIENTOS',
        defaults={
            'nombre': 'Vencimientos de documentos vehiculares',
            'handler_key': 'vehiculos_vencimientos',
            'hora': time(8, 0),
            'activo': True,
        },
    )
    JobProgramado.objects.get_or_create(
        codigo='DOC_SERVICIOS_AVISOS',
        defaults={
            'nombre': 'Avisos por fecha — documentación de servicios',
            'handler_key': 'doc_servicios_avisos',
            'hora': time(8, 15),
            'activo': True,
        },
    )


def seed_notificaciones_catalogos() -> None:
    seed_tipos_notificacion()
    seed_fuentes_y_jobs()
    migrar_destinatarios_operativos_a_tipos()


def usuario_en_destinatarios_tipo(user: User, modulo: str, evento: str) -> bool:
    """True si el usuario está entre destinatarios del TipoNotificacion."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    tipo = (
        TipoNotificacion.objects.filter(modulo=modulo, evento=evento, activo=True)
        .prefetch_related('usuarios', 'grupos', 'roles')
        .first()
    )
    if not tipo:
        return False
    users, _emails = resolver_destinatarios_tipo(tipo)
    return any(u.pk == user.pk for u in users)


def _usuario_en_m2m_fuente(user: User, fuente) -> bool:
    if fuente.usuarios.filter(pk=user.pk).exists():
        return True
    if fuente.roles.filter(user=user).exists():
        return True
    for grupo in fuente.grupos.all():
        if grupo.funcionarios.filter(user=user, estado=True).exists():
            return True
    return False


def usuario_puede_ver_fuente_viva(user: User, fuente) -> bool:
    if not user or not user.is_authenticated or not fuente.activo:
        return False
    if user.is_superuser:
        return True

    tiene_m2m = (
        fuente.usuarios.exists() or fuente.grupos.exists() or fuente.roles.exists()
    )
    if tiene_m2m:
        return _usuario_en_m2m_fuente(user, fuente)

    # Preferir TipoNotificacion si el propósito legado mapea a un tipo
    if fuente.proposito_operativo:
        mapped = PROPOSITO_OPERATIVO_A_TIPO.get(fuente.proposito_operativo)
        if mapped:
            return usuario_en_destinatarios_tipo(user, mapped[0], mapped[1])

    if fuente.codigo == 'RESERVAS_PENDIENTES':
        return puede_ver_reservas_pendientes_campana(user)

    return False


def construir_fuentes_vivas_para(user: User) -> list[dict]:
    from notificaciones.handlers import LIVE_HANDLERS
    from notificaciones.models import FuenteViva

    resultado = []
    fuentes = FuenteViva.objects.filter(activo=True).prefetch_related(
        'usuarios', 'grupos', 'roles'
    )
    for fuente in fuentes:
        if not usuario_puede_ver_fuente_viva(user, fuente):
            continue
        handler = LIVE_HANDLERS.get(fuente.handler_key)
        if not handler:
            logger.warning('Fuente viva sin handler: %s', fuente.handler_key)
            continue
        try:
            items = handler(user) or []
        except Exception:
            logger.exception('Error en fuente viva %s', fuente.codigo)
            items = []
        resultado.append(
            {
                'codigo': fuente.codigo,
                'nombre': fuente.nombre,
                'titulo_bloque': fuente.titulo_bloque or '',
                'items': items,
            }
        )
    return resultado


def ejecutar_jobs_vencidos(*, force: bool = False) -> list[str]:
    """
    Ejecuta jobs cuya hora local ya pasó hoy y aún no corrieron.
    Retorna lista de códigos ejecutados.
    """
    from django.db import transaction
    from django.utils import timezone

    from notificaciones.handlers import JOB_HANDLERS
    from notificaciones.models import JobProgramado

    ahora = timezone.localtime()
    hoy = ahora.date()
    hora_actual = ahora.time().replace(second=0, microsecond=0)
    corridos = []

    with transaction.atomic():
        jobs = (
            JobProgramado.objects.select_for_update()
            .filter(activo=True)
            .order_by('hora')
        )
        for job in jobs:
            if not force:
                if job.ultima_fecha_corrida == hoy:
                    continue
                if hora_actual < job.hora.replace(second=0, microsecond=0):
                    continue
            handler = JOB_HANDLERS.get(job.handler_key)
            if not handler:
                logger.warning('Job sin handler: %s', job.handler_key)
                continue
            try:
                handler()
            except Exception:
                logger.exception('Fallo job %s', job.codigo)
                continue
            job.ultima_ejecucion = timezone.now()
            job.ultima_fecha_corrida = hoy
            job.save(update_fields=['ultima_ejecucion', 'ultima_fecha_corrida'])
            corridos.append(job.codigo)

    return corridos
