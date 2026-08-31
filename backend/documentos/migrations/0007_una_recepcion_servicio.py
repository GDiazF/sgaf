from django.db import migrations, models


LEGACY_RECEPCION = (
    'recepcion_servicio_colegio',
    'recepcion_servicio_jardin',
)
LEGACY_COBRO = (
    'cobro_transporte_diario',
    'cobro_transporte_mensual',
    'cobro_transporte_mensual_mixto',
)


def forwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    # Una sola recepción de servicio: conservar la primera (preferir activa)
    kept = None
    for p in Plantilla.objects.filter(proposito__in=LEGACY_RECEPCION).order_by(
        '-activa', 'id'
    ):
        if kept is None:
            p.proposito = 'recepcion_servicio'
            p.save(update_fields=['proposito'])
            kept = p
        else:
            p.proposito = 'borrador'
            p.save(update_fields=['proposito'])
    # Cobros ya no son propósitos asignables
    Plantilla.objects.filter(proposito__in=LEGACY_COBRO).update(proposito='borrador')


def backwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    Plantilla.objects.filter(proposito='recepcion_servicio').update(
        proposito='recepcion_servicio_colegio'
    )


class Migration(migrations.Migration):
    dependencies = [
        ('documentos', '0006_recepcion_servicio_y_cobros'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name='plantilladocumento',
            name='proposito',
            field=models.CharField(
                choices=[
                    ('borrador', 'Sin asignación (borrador)'),
                    ('recepcion_roc', 'ROC — Recepción con contrato / OC'),
                    ('recepcion_rcf', 'RCF — Recepción sin OC'),
                    ('recepcion_rca', 'RCA — Compra ágil'),
                    ('recepcion_rlb_unitario', 'RLB — Un registro (enviar a pago)'),
                    ('recepcion_rlb', 'RLB — Recepción conforme (1 o más pagos)'),
                    ('recepcion_rlb_junji', 'RLB — Monto JUNJI'),
                    ('recepcion_servicio', 'Recepción de servicio'),
                ],
                db_index=True,
                default='borrador',
                help_text='Módulo / tipo de documento. «Sin asignación» = borrador.',
                max_length=40,
            ),
        ),
    ]
