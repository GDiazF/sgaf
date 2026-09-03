from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('documentos', '0008_plantillas_multiples_recepcion_servicio'),
        ('contratos', '0034_merge_20260831_1037'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrato',
            name='plantilla_recepcion_servicio',
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    'PDF sin folio descargado desde gestión operativa por colegio. '
                    'Si está vacío, se usa la plantilla predeterminada del sistema.'
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='contratos_recepcion_servicio',
                to='documentos.plantilladocumento',
                verbose_name='Plantilla recepción de servicio',
            ),
        ),
    ]
