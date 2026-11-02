from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('editor_pdf', '0002_plantillafirmadigital'),
    ]

    operations = [
        migrations.AddField(
            model_name='plantillafirmapdf',
            name='imagen',
            field=models.BinaryField(blank=True, null=True, verbose_name='Imagen'),
        ),
        migrations.AddField(
            model_name='plantillafirmapdf',
            name='imagen_tipo',
            field=models.CharField(blank=True, default='', max_length=4, verbose_name='Tipo de imagen'),
        ),
    ]
