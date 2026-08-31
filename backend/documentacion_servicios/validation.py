CORE_CLAVES = frozenset(
    {'folio', 'proveedor', 'establecimiento', 'fecha_servicio', 'archivo'}
)


def _is_empty(value):
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if value == '':
        return True
    return False


def coerce_pk(value):
    """Acepta id int/str o instancia con .pk (FK ya resuelta por DRF)."""
    if _is_empty(value):
        return None
    if hasattr(value, 'pk'):
        return value.pk
    if isinstance(value, (list, tuple)) and value:
        return coerce_pk(value[0])
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def validate_payload_against_campos(
    tipo,
    data,
    *,
    has_existing_archivo=False,
    archivo_in_request=False,
    partial=False,
):
    """
    Valida data (dict) contra CampoDefinicion activos del tipo.
    archivo_in_request: True si llega un File en el request.
    has_existing_archivo: True si el registro ya tiene archivo (update).
    """
    errors = {}
    campos = list(tipo.campos.filter(activo=True).order_by('orden'))

    for campo in campos:
        clave = campo.clave
        if partial and clave not in data and clave != 'archivo':
            continue

        if clave == 'archivo':
            ok = archivo_in_request or has_existing_archivo
            if campo.obligatorio and not ok:
                errors[clave] = 'Este archivo es obligatorio.'
            continue

        if clave not in data and partial:
            continue

        raw = data.get(clave)
        if campo.obligatorio and _is_empty(raw):
            errors[clave] = f'{campo.etiqueta} es obligatorio.'
            continue

        if _is_empty(raw):
            continue

        if campo.tipo_dato == 'number':
            try:
                float(raw)
            except (TypeError, ValueError):
                errors[clave] = 'Debe ser un número.'
        elif campo.tipo_dato in ('proveedor', 'establecimiento'):
            if coerce_pk(raw) is None:
                errors[clave] = 'Selección inválida.'

    if tipo.usa_folio:
        folio_campo = next((c for c in campos if c.clave == 'folio'), None)
        if folio_campo and folio_campo.obligatorio:
            folio = data.get('folio')
            if not partial or 'folio' in data:
                if _is_empty(folio):
                    errors['folio'] = 'El folio es obligatorio.'

    return errors


def split_core_and_valores(data):
    """Separa columnas fijas vs JSON valores."""
    core = {}
    valores = {}
    for key, value in (data or {}).items():
        if key in CORE_CLAVES:
            core[key] = value
        elif key in ('tipo', 'tipo_id', 'id', 'archivo'):
            continue
        else:
            valores[key] = value
    return core, valores
