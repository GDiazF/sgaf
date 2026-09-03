from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0037_volumen_dia_periodo'),
    ]

    operations = [
        migrations.AddField(
            model_name='contrato',
            name='es_borrador',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='Los borradores permiten guardar avances sin publicar el contrato.',
                verbose_name='Es borrador',
            ),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='codigo_mercado_publico',
            field=models.CharField(
                blank=True,
                max_length=100,
                null=True,
                verbose_name='Código Mercado Público',
            ),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='descripcion',
            field=models.TextField(blank=True, default='', verbose_name='Descripción'),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='proceso',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='contratos',
                to='contratos.procesocompra',
                verbose_name='Tipo de Proceso',
            ),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='estado',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='contratos',
                to='contratos.estadocontrato',
                verbose_name='Estado',
            ),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='categoria',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='contratos',
                to='contratos.categoriacontrato',
                verbose_name='Categoría',
            ),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='fecha_adjudicacion',
            field=models.DateField(blank=True, null=True, verbose_name='Fecha de Adjudicación'),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='fecha_inicio',
            field=models.DateField(blank=True, null=True, verbose_name='Fecha de Inicio'),
        ),
        migrations.AlterField(
            model_name='contrato',
            name='fecha_termino',
            field=models.DateField(blank=True, null=True, verbose_name='Fecha de Término'),
        ),
        migrations.AddConstraint(
            model_name='contrato',
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ('es_borrador', False),
                    ('codigo_mercado_publico__isnull', False),
                )
                & ~models.Q(codigo_mercado_publico=''),
                fields=('codigo_mercado_publico',),
                name='uniq_contrato_codigo_mp_publicado',
            ),
        ),
    ]
