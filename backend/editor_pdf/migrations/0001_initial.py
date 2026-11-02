from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='CertificadoFuncionario',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rut', models.CharField(max_length=12, unique=True, verbose_name='RUT')),
                ('password_cifrada', models.TextField(verbose_name='Clave cifrada')),
                ('valido_hasta', models.DateTimeField(verbose_name='Válido hasta')),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Certificado de editor PDF',
                'verbose_name_plural': 'Certificados de editor PDF',
            },
        ),
        migrations.CreateModel(
            name='HerramientaPdf',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=80, unique=True, verbose_name='Identificador')),
                ('nombre', models.CharField(max_length=120, verbose_name='Nombre')),
                ('categoria', models.CharField(max_length=80, verbose_name='Categoría')),
                ('descripcion', models.CharField(max_length=280, verbose_name='Descripción')),
                ('orden', models.PositiveIntegerField(default=0, verbose_name='Orden')),
                ('visible', models.BooleanField(default=True, verbose_name='Visible para funcionarios')),
            ],
            options={
                'verbose_name': 'Herramienta PDF',
                'verbose_name_plural': 'Herramientas PDF',
                'ordering': ['orden', 'nombre'],
            },
        ),
    ]
