from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documentacion_servicios', '0003_aviso_solo_ultimo_por_establecimiento'),
    ]

    operations = [
        migrations.AddField(
            model_name='registroserviciodoc',
            name='correo_enviado_en',
            field=models.DateTimeField(
                blank=True,
                help_text='Última vez que se envió el documento al correo del establecimiento.',
                null=True,
            ),
        ),
    ]
