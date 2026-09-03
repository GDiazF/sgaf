from django.db import migrations, models


def forwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    for row in Plantilla.objects.exclude(proposito='borrador'):
        row.es_default = True
        row.save(update_fields=['es_default'])


def backwards(apps, schema_editor):
    Plantilla = apps.get_model('documentos', 'PlantillaDocumento')
    Plantilla.objects.update(es_default=False)


class Migration(migrations.Migration):
    dependencies = [
        ('documentos', '0007_una_recepcion_servicio'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='plantilladocumento',
            name='uniq_plantilla_proposito_asignado',
        ),
        migrations.AddField(
            model_name='plantilladocumento',
            name='es_default',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'Plantilla usada cuando ningún contrato elige otra. '
                    'Solo una predeterminada por propósito.'
                ),
                verbose_name='Predeterminada del sistema',
            ),
        ),
        migrations.RunPython(forwards, backwards),
        migrations.AddConstraint(
            model_name='plantilladocumento',
            constraint=models.UniqueConstraint(
                condition=models.Q(es_default=True) & ~models.Q(proposito='borrador'),
                fields=('proposito',),
                name='uniq_plantilla_proposito_default',
            ),
        ),
    ]
