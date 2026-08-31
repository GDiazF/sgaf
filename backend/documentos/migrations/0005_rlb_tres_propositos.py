from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('documentos', '0004_borrador_uniq_proposito'),
    ]

    operations = [
        migrations.AlterField(
            model_name='plantilladocumento',
            name='proposito',
            field=models.CharField(
                choices=[
                    ('borrador', 'Sin asignación (borrador)'),
                    ('recepcion_roc', 'ROC — Recepción con contrato / OC'),
                    ('recepcion_rcf', 'RCF — Recepción sin OC'),
                    ('recepcion_rca', 'RCA — Compra ágil'),
                    ('recepcion_rlb_unitario', 'RLB — Un registro (enviar a pago)'),
                    ('recepcion_rlb', 'RLB — Recepción conforme (1 o más pagos)'),
                    ('recepcion_rlb_junji', 'RLB — Monto JUNJI'),
                ],
                db_index=True,
                default='borrador',
                help_text='Módulo / tipo de documento. «Sin asignación» = borrador.',
                max_length=40,
            ),
        ),
    ]
