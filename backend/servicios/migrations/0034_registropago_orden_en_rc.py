# Generated manually: orden de pagos dentro de la RC

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0033_merge_20260831_1037'),
    ]

    operations = [
        migrations.AddField(
            model_name='registropago',
            name='orden_en_rc',
            field=models.PositiveIntegerField(
                blank=True,
                db_index=True,
                help_text='Posición del pago dentro de la recepción conforme (orden de selección).',
                null=True,
                verbose_name='Orden en RC',
            ),
        ),
    ]
