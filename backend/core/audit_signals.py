"""
Auditoría global ORM: CREACION / MODIFICACION / ELIMINACION (sin lecturas).
"""
from decimal import Decimal
from datetime import date, datetime, time
from uuid import UUID

from django.apps import apps
from django.db import connection, models
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver

from core.utils.audit import log_audit

# app_label.ModelName
EXCLUDED_LABELS = {
    'core.AuditLog',
    'core.EmailOTP',
    'core.MFASession',
    'core.TrustedDevice',
    'sessions.Session',
    'admin.LogEntry',
    'contenttypes.ContentType',
    'auth.Permission',
    'otp_totp.TOTPDevice',
    'contratos.HistorialContrato',
    'servicios.HistorialRecepcionConforme',
    'ejecutivos.HistorialGestion',
    'tickets.TicketHistory',
    'tickets.TicketUserActivity',
    'orden_compra.OrdenCompraMP',
    'licitaciones.LicitacionMP',
    'insights.DashboardMetric',
}

SENSITIVE_FIELD_FRAGMENTS = (
    'password',
    'secret',
    'token',
    'otp',
    'api_key',
    'apikey',
    'private_key',
)

_ATTR_OLD = '_audit_old_snapshot'
_audit_table_ready = False


def _label(sender):
    return f'{sender._meta.app_label}.{sender.__name__}'


def _audit_log_table_columns(cursor):
    """Columnas reales de core_auditlog (no el modelo ORM, que puede ir adelantado al esquema)."""
    table = apps.get_model('core', 'AuditLog')._meta.db_table
    if table not in connection.introspection.table_names(cursor):
        return None
    description = connection.introspection.get_table_description(cursor, table)
    return {col.name for col in description}


def _can_write_audit():
    """Evita escribir durante migrate/test setup cuando el esquema de auditoría no está listo."""
    global _audit_table_ready
    if _audit_table_ready:
        return True
    if not apps.ready:
        return False
    try:
        with connection.cursor() as cursor:
            columns = _audit_log_table_columns(cursor)
            if not columns:
                return False
            # core.0018_auditlog_changes: sin esta columna migrate falla al auditar saves.
            if 'changes' not in columns:
                return False
            _audit_table_ready = True
            return True
    except Exception:
        return False
    return False


def should_audit(sender):
    if not isinstance(sender, type) or not issubclass(sender, models.Model):
        return False
    # Modelos históricos de RunPython (apps.get_model en migraciones).
    if sender.__module__.startswith('__fake__'):
        return False
    if sender._meta.abstract or sender._meta.proxy:
        return False
    if sender.__name__ == 'Migration':
        return False
    if _label(sender) in EXCLUDED_LABELS:
        return False
    if sender._meta.app_label in (
        'sessions',
        'admin',
        'contenttypes',
        'django_otp',
        'otp_totp',
        'otp_static',
    ):
        return False
    if not _can_write_audit():
        return False
    return True


def _is_sensitive(field_name):
    lower = field_name.lower()
    return any(frag in lower for frag in SENSITIVE_FIELD_FRAGMENTS)


def _serialize_value(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float, str)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, (list, dict)):
        return value
    if hasattr(value, 'name') and not isinstance(value, models.Model):
        try:
            return value.name or None
        except Exception:
            return str(value)
    return str(value)


def _is_null_like(val):
    return val is None or val == '' or val == 'None' or val == 'null'


def instance_snapshot(instance):
    """Snapshot de campos concretos (sin M2M). Valores sensibles redactados."""
    data = {}
    for field in instance._meta.concrete_fields:
        name = field.name
        if _is_sensitive(name):
            data[name] = '***'
            continue
        try:
            if field.is_relation and (field.many_to_one or field.one_to_one):
                raw = getattr(instance, field.attname)
                data[name] = _serialize_value(raw)
            else:
                raw = field.value_from_object(instance)
                data[name] = _serialize_value(raw)
        except Exception:
            continue
    return data


def compute_diff(old, new):
    """Formato UI: { campo: [antes, despues] }."""
    changes = {}
    keys = set(old or {}) | set(new or {})
    for key in keys:
        before = (old or {}).get(key)
        after = (new or {}).get(key)
        if before == after:
            continue
        if _is_null_like(before) and _is_null_like(after):
            continue
        changes[key] = [before, after]
    return changes


def _details_for(instance, model_name):
    try:
        text = str(instance)
    except Exception:
        text = ''
    text = (text or '').strip()
    if not text or text == model_name:
        pk = getattr(instance, 'pk', None)
        text = f'{model_name} #{pk}' if pk is not None else model_name
    return text[:500]


@receiver(pre_save)
def audit_pre_save(sender, instance, **kwargs):
    if not should_audit(sender) or kwargs.get('raw'):
        return
    if not instance.pk:
        return
    try:
        old = sender.objects.filter(pk=instance.pk).first()
    except Exception:
        old = None
    if old is not None:
        setattr(instance, _ATTR_OLD, instance_snapshot(old))


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    if not should_audit(sender) or kwargs.get('raw'):
        return

    model_name = sender.__name__
    new_snap = instance_snapshot(instance)
    details = _details_for(instance, model_name)

    if created:
        changes = {k: [None, v] for k, v in new_snap.items() if not _is_null_like(v)}
        log_audit(
            action='CREACION',
            model_name=model_name,
            object_id=instance.pk,
            details=details,
            changes=changes,
        )
        return

    old_snap = getattr(instance, _ATTR_OLD, None)
    if old_snap is None:
        changes = {}
    else:
        changes = compute_diff(old_snap, new_snap)

    if hasattr(instance, _ATTR_OLD):
        try:
            delattr(instance, _ATTR_OLD)
        except Exception:
            pass

    if not changes:
        return

    log_audit(
        action='MODIFICACION',
        model_name=model_name,
        object_id=instance.pk,
        details=details,
        changes=changes,
    )


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    if not should_audit(sender) or kwargs.get('raw'):
        return

    model_name = sender.__name__
    snap = instance_snapshot(instance)
    changes = {k: [v, None] for k, v in snap.items() if not _is_null_like(v)}
    log_audit(
        action='ELIMINACION',
        model_name=model_name,
        object_id=getattr(instance, 'pk', None),
        details=_details_for(instance, model_name),
        changes=changes,
    )
