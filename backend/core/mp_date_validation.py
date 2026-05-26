"""Validación de rangos de fecha para consultas a Mercado Público (escaneo día a día)."""

from datetime import datetime, timedelta

MP_MAX_RANGE_DAYS = 31
MP_MAX_YEARS_BACK = 2


def validate_mp_date_range(fecha_inicio: str, fecha_fin: str) -> dict:
    """
    Returns:
        dict con keys: valid (bool), error (str|None), day_count (int|None)
    """
    if not fecha_inicio or not fecha_fin:
        return {'valid': False, 'error': 'Debe indicar fecha_inicio y fecha_fin.'}

    try:
        start_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        end_dt = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
    except ValueError:
        return {'valid': False, 'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}

    today = datetime.now().date()

    if end_dt < start_dt:
        return {'valid': False, 'error': 'fecha_fin debe ser igual o posterior a fecha_inicio.'}

    if end_dt > today:
        return {'valid': False, 'error': 'fecha_fin no puede ser posterior a hoy.'}

    min_start = today - timedelta(days=MP_MAX_YEARS_BACK * 365)
    if start_dt < min_start:
        return {
            'valid': False,
            'error': f'fecha_inicio no puede ser anterior a {MP_MAX_YEARS_BACK} años.',
        }

    day_count = (end_dt - start_dt).days + 1

    if day_count > MP_MAX_RANGE_DAYS:
        return {
            'valid': False,
            'error': (
                f'El período máximo es {MP_MAX_RANGE_DAYS} días '
                f'({day_count} solicitados). Use un rango menor o búsqueda por código.'
            ),
            'day_count': day_count,
        }

    return {'valid': True, 'day_count': day_count, 'error': None}
