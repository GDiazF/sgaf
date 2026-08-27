# Revierte asignación automática de aplica_iva=False en transporte (0028).
# La decisión queda manual al crear/editar el contrato.

from django.db import migrations


def restaurar_iva_transporte(apps, schema_editor):
    Contrato = apps.get_model('contratos', 'Contrato')
    Contrato.objects.filter(plantilla_cobro='TRANSPORTE', aplica_iva=False).update(aplica_iva=True)


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0028_contrato_aplica_iva'),
    ]

    operations = [
        migrations.RunPython(restaurar_iva_transporte, migrations.RunPython.noop),
    ]
