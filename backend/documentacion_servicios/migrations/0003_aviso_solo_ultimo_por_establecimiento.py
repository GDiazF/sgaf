from django.db import migrations, models


def enable_sanitizacion_flag(apps, schema_editor):
    Tipo = apps.get_model('documentacion_servicios', 'TipoRegistroServicio')
    Tipo.objects.filter(codigo='SANITIZACION_ESTANQUES').update(
        aviso_solo_ultimo_por_establecimiento=True
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('documentacion_servicios', '0002_notificaciones_doc_servicios'),
    ]

    operations = [
        migrations.AddField(
            model_name='tiporegistroservicio',
            name='aviso_solo_ultimo_por_establecimiento',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'Si está activo, los avisos por fecha solo consideran el registro más reciente '
                    'por establecimiento (historial se conserva). Útil p. ej. sanitización de estanques.'
                ),
            ),
        ),
        migrations.RunPython(enable_sanitizacion_flag, noop_reverse),
    ]
