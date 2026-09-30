# Generated manually for AmpliacionMontoProveedor

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0035_recepcionconforme_cdp'),
        ('contratos', '0039_fix_tipo_oc_default'),
    ]

    operations = [
        migrations.CreateModel(
            name='AmpliacionMontoProveedor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monto', models.IntegerField(default=0, verbose_name='Monto')),
                ('ampliacion', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='montos_proveedor',
                    to='contratos.ampliacioncontrato',
                    verbose_name='Ampliación',
                )),
                ('proveedor', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='montos_ampliacion',
                    to='servicios.proveedor',
                    verbose_name='Proveedor',
                )),
            ],
            options={
                'verbose_name': 'Monto de ampliación por proveedor',
                'verbose_name_plural': 'Montos de ampliación por proveedor',
                'ordering': ['proveedor__nombre', 'id'],
                'unique_together': {('ampliacion', 'proveedor')},
            },
        ),
    ]
