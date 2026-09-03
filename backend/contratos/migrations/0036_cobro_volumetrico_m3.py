from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('contratos', '0035_contrato_plantilla_recepcion_servicio'),
    ]

    operations = [
        migrations.AddField(
            model_name='periodocobro',
            name='volumen_m3',
            field=models.DecimalField(
                blank=True,
                decimal_places=3,
                help_text='Volumen en m³ (modalidad volumétrica).',
                max_digits=12,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='rutatransporte',
            name='precio_m3',
            field=models.IntegerField(
                blank=True,
                help_text='Tarifa en pesos por metro cúbico (gestión volumétrica).',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='plantilla_cobro',
            field=models.CharField(
                blank=True,
                choices=[
                    ('TRANSPORTE', 'Transporte (valor diario)'),
                    ('OTRO', 'Otro (monto mensual)'),
                    ('VOLUMETRICO', 'Volumétrico ($/m³)'),
                ],
                db_index=True,
                help_text='Define si la gestión operativa usa valor diario, monto mensual o cobro por m³.',
                max_length=20,
                null=True,
                verbose_name='Plantilla de cobro',
            ),
        ),
        migrations.AlterField(
            model_name='serviciocontrato',
            name='modalidad_cobro',
            field=models.CharField(
                choices=[
                    ('DIARIO', 'Valor diario (transporte)'),
                    ('MENSUAL_UNICO', 'Monto mensual igual en todos los colegios'),
                    ('MENSUAL_POR_EST', 'Monto mensual distinto por colegio'),
                    ('MENSUAL_FIJO_VARIABLE', 'Mensual fijo y/o variable (por periodo)'),
                    ('POR_M3', 'Cobro por volumen (m³)'),
                ],
                db_index=True,
                default='DIARIO',
                max_length=30,
            ),
        ),
    ]
