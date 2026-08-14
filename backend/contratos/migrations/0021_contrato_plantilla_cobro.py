from django.db import migrations, models


def backfill_plantilla(apps, schema_editor):
    Contrato = apps.get_model('contratos', 'Contrato')
    ServicioContrato = apps.get_model('contratos', 'ServicioContrato')
    for servicio in ServicioContrato.objects.select_related('tipo_servicio'):
        tipo = servicio.tipo_servicio
        es_transporte = bool(
            tipo
            and (
                getattr(tipo, 'es_transporte', False)
                or 'transporte' in (tipo.nombre or '').lower()
            )
        )
        Contrato.objects.filter(pk=servicio.contrato_id).update(
            plantilla_cobro='TRANSPORTE' if es_transporte else 'OTRO'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0020_renombrar_tipo_otro'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrato',
            name='plantilla_cobro',
            field=models.CharField(
                blank=True,
                choices=[
                    ('TRANSPORTE', 'Transporte (valor diario)'),
                    ('OTRO', 'Otro (monto mensual)'),
                ],
                db_index=True,
                help_text='Define si la gestión operativa usa valor diario (transporte) o monto mensual.',
                max_length=20,
                null=True,
                verbose_name='Plantilla de cobro',
            ),
        ),
        migrations.RunPython(backfill_plantilla, migrations.RunPython.noop),
    ]
