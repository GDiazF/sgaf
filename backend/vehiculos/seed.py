"""Semillas idempotentes de catálogos de flota."""

from .tipos_documento_sistema import TIPOS_DOCUMENTO_SISTEMA, alias_to_codigo, _norm


def seed_tipos_documento_sistema(TipoDocumento=None):
    """Asegura tipos fijos de flota (póliza, permiso, RT, SOAP, padrón, tarjeta)."""
    if TipoDocumento is None:
        from .models import VehiculoTipoDocumento as TipoDocumento

    aliases = alias_to_codigo()
    results = []

    for spec in TIPOS_DOCUMENTO_SISTEMA:
        codigo = spec['codigo']
        defaults = {
            'nombre': spec['nombre'],
            'icono': spec['icono'],
            'color': spec['color'],
            'requerido': spec['requerido'],
            'dias_aviso_defecto': spec['dias_aviso_defecto'],
            'es_sistema': True,
        }

        obj = TipoDocumento.objects.filter(codigo=codigo).first()
        if obj is None:
            for row in TipoDocumento.objects.all():
                if (row.codigo or '').strip():
                    continue
                if aliases.get(_norm(row.nombre)) == codigo:
                    obj = row
                    break

        if obj is None:
            TipoDocumento.objects.create(codigo=codigo, **defaults)
            results.append((codigo, 'created'))
            continue

        updates = []
        if obj.codigo != codigo:
            obj.codigo = codigo
            updates.append('codigo')
        if not obj.es_sistema:
            obj.es_sistema = True
            updates.append('es_sistema')
        if not (obj.nombre or '').strip():
            obj.nombre = spec['nombre']
            updates.append('nombre')
        # No pisar nombre custom si ya tiene texto distinto; solo marcar sistema.
        if obj.requerido != spec['requerido']:
            obj.requerido = spec['requerido']
            updates.append('requerido')
        if updates:
            obj.save(update_fields=updates)
            results.append((codigo, 'updated'))
        else:
            results.append((codigo, 'ok'))

    return results
