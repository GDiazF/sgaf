"""Helpers de periodos de cobro."""


def crear_periodo_cobro(ruta, fecha_inicio, fecha_fin, mes, anio):
    """Crea PeriodoCobro; en modalidad mixto siembra monto_fijo desde valor_mensual."""
    from .models import PeriodoCobro

    kwargs = {
        'ruta': ruta,
        'fecha_inicio': fecha_inicio,
        'fecha_fin': fecha_fin,
        'mes_referencia': mes,
        'anio_referencia': anio,
    }
    servicio = ruta.servicio
    if servicio and getattr(servicio, 'es_mensual_mixto', False):
        kwargs['monto_fijo'] = int(ruta.valor_mensual or servicio.monto_mensual or 0)
        kwargs['monto_variable'] = 0
    return PeriodoCobro.objects.create(**kwargs)
