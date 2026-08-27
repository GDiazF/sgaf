from django.db import migrations


def seed_tipo_mensual(apps, schema_editor):
    Tipo = apps.get_model('contratos', 'TipoServicioOperativo')
    if Tipo.objects.filter(es_transporte=False).exists():
        return
    if Tipo.objects.filter(nombre__iexact='Otro').exists():
        Tipo.objects.filter(nombre__iexact='Otro').update(es_transporte=False)
        return
    Tipo.objects.create(nombre='Otro', icono='Layers', es_transporte=False)


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0018_modalidad_no_transporte'),
    ]

    operations = [
        migrations.RunPython(seed_tipo_mensual, migrations.RunPython.noop),
    ]
