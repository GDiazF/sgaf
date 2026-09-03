from django.db import migrations, models


def normalize_tipo_oc(apps, schema_editor):
    Contrato = apps.get_model('contratos', 'Contrato')
    Contrato.objects.filter(tipo_oc='AGREEMENT').update(tipo_oc='UNICA')


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0038_contrato_borradores'),
    ]

    operations = [
        migrations.RunPython(normalize_tipo_oc, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='contrato',
            name='tipo_oc',
            field=models.CharField(
                choices=[('UNICA', 'OC Única'), ('MULTIPLE', 'OC Múltiple')],
                default='UNICA',
                max_length=10,
                verbose_name='Tipo de OC',
            ),
        ),
    ]
