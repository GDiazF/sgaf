from django.db import migrations, models


def forwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    Plantilla.objects.filter(proposito='recepcion_adq').update(proposito='recepcion_roc')


def backwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    # No-op seguro: no revertimos el desglose ROC/RCF/RCA
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('documentos', '0002_plantilla_proposito'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
        migrations.AlterField(
            model_name='plantilladocumento',
            name='proposito',
            field=models.CharField(
                choices=[
                    ('general', 'General'),
                    ('recepcion_roc', 'ROC — Recepción con contrato / OC'),
                    ('recepcion_rcf', 'RCF — Recepción sin OC'),
                    ('recepcion_rca', 'RCA — Compra ágil'),
                    ('recepcion_rlb', 'RLB — Recepción conforme de pagos'),
                    ('recepcion_junji', 'RC Monto JUNJI'),
                ],
                db_index=True,
                default='general',
                help_text='Módulo / tipo de documento que usará esta plantilla',
                max_length=40,
            ),
        ),
    ]
