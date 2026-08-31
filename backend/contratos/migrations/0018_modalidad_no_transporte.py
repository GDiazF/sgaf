from django.db import migrations


def set_modalidad_no_transporte(apps, schema_editor):
    Tipo = apps.get_model('contratos', 'TipoServicioOperativo')
    Tipo.objects.filter(nombre__icontains='transporte').update(es_transporte=True)

    ServicioContrato = apps.get_model('contratos', 'ServicioContrato')
    for servicio in ServicioContrato.objects.select_related('tipo_servicio'):
        tipo = servicio.tipo_servicio
        es_trans = bool(
            tipo
            and (
                getattr(tipo, 'es_transporte', False)
                or 'transporte' in (tipo.nombre or '').lower()
            )
        )
        if es_trans:
            continue
        if servicio.modalidad_cobro == 'DIARIO':
            servicio.modalidad_cobro = 'MENSUAL_POR_EST'
            servicio.save(update_fields=['modalidad_cobro'])


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0017_gestion_operativa_modalidad'),
    ]

    operations = [
        migrations.RunPython(set_modalidad_no_transporte, migrations.RunPython.noop),
    ]
