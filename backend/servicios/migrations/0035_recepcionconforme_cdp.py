# Generated manually: CDP opcional en RecepcionConforme

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0034_registropago_orden_en_rc'),
    ]

    operations = [
        migrations.AddField(
            model_name='recepcionconforme',
            name='cdp',
            field=models.ForeignKey(
                blank=True,
                help_text='Certificado de disponibilidad presupuestaria del repositorio (opcional).',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='recepciones_conformes',
                to='servicios.cdp',
                verbose_name='CDP',
            ),
        ),
    ]
