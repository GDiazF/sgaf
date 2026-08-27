from django.db import migrations, models


def forwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    Plantilla.objects.filter(proposito='general').update(proposito='borrador')
    if Plantilla.objects.filter(proposito='recepcion_rlb').exists():
        Plantilla.objects.filter(proposito='recepcion_junji').update(proposito='borrador')
    else:
        Plantilla.objects.filter(proposito='recepcion_junji').update(proposito='recepcion_rlb')


def backwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    Plantilla.objects.filter(proposito='borrador').update(proposito='general')


class Migration(migrations.Migration):
    dependencies = [
        ('documentos', '0003_split_propositos_recepcion'),
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
                    ('recepcion_rlb', 'RLB — Recepción conforme de pagos'),
                ],
                db_index=True,
                default='borrador',
                help_text='Módulo / tipo de documento. «Sin asignación» = borrador.',
                max_length=40,
            ),
        ),
        migrations.AddConstraint(
            model_name='plantilladocumento',
            constraint=models.UniqueConstraint(
                condition=~models.Q(proposito='borrador'),
                fields=('proposito',),
                name='uniq_plantilla_proposito_asignado',
            ),
        ),
    ]
