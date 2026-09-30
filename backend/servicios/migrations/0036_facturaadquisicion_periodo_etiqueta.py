from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0035_recepcionconforme_cdp'),
    ]

    operations = [
        migrations.AddField(
            model_name='facturaadquisicion',
            name='periodo_etiqueta',
            field=models.CharField(
                blank=True,
                default='',
                help_text=(
                    'Texto elegido al emitir la RC para glosa/PDF: '
                    '«Agosto 2026» o «21/08/2026 AL 20/09/2026».'
                ),
                max_length=200,
                verbose_name='Etiqueta de periodo',
            ),
        ),
    ]
