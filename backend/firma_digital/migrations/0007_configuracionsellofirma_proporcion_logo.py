from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firma_digital', '0006_configuracion_sello_firma'),
    ]

    operations = [
        migrations.AddField(
            model_name='configuracionsellofirma',
            name='proporcion_logo_pct',
            field=models.PositiveIntegerField(
                default=40,
                help_text=(
                    'Porcentaje del ancho del sello reservado a logo e imagen de firma (izquierda). '
                    'El resto (~texto) queda en blanco para FirmaGob. Ej.: 35 = logo 35% / texto 65%. '
                    'Rango 15–70. Default 40.'
                ),
                verbose_name='% ancho para logo / imágenes',
            ),
        ),
    ]
