import django.core.validators
import firma_digital.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firma_digital', '0005_can_probar_firma_perm'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfiguracionSelloFirma',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('logo', models.FileField(blank=True, help_text='SVG, PNG o JPG. Se coloca a la izquierda del recuadro, sin deformar.', upload_to=firma_digital.models.sello_fondo_upload_to, validators=[django.core.validators.FileExtensionValidator(allowed_extensions=('svg', 'png', 'jpg', 'jpeg'))], verbose_name='Logo institucional')),
                ('imagen_firma', models.FileField(blank=True, help_text='SVG, PNG o JPG. Se coloca a la derecha del recuadro, sin deformar.', upload_to=firma_digital.models.sello_fondo_upload_to, validators=[django.core.validators.FileExtensionValidator(allowed_extensions=('svg', 'png', 'jpg', 'jpeg'))], verbose_name='Imagen de firma')),
                ('ancho_pt', models.PositiveIntegerField(default=205, help_text='Caja que recibe FirmaGob. Por defecto 205 (oficial firma-dep).', verbose_name='Ancho del recuadro (pt)')),
                ('alto_pt', models.PositiveIntegerField(default=84, help_text='Caja que recibe FirmaGob. Por defecto 84 (oficial firma-dep).', verbose_name='Alto del recuadro (pt)')),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Configuración de sello (FirmaGob)',
                'verbose_name_plural': 'Configuración de sello (FirmaGob)',
            },
        ),
    ]
