from django.db import migrations


def rename_tipos(apps, schema_editor):
    Tipo = apps.get_model('contratos', 'TipoServicioOperativo')
    Tipo.objects.filter(nombre__iexact='Servicio mensual').update(nombre='Otro')
    Tipo.objects.filter(nombre='TRANSPORTE').update(nombre='Transporte')


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0019_tipo_servicio_mensual'),
    ]

    operations = [
        migrations.RunPython(rename_tipos, migrations.RunPython.noop),
    ]
