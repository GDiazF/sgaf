from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('editor_pdf', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlantillaFirmaPdf',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('texto', models.TextField(verbose_name='Texto de la firma')),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Plantilla de firma PDF',
                'verbose_name_plural': 'Plantillas de firma PDF',
            },
        ),
    ]
