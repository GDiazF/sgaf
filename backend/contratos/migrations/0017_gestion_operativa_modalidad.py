from django.db import migrations, models


def seed_and_dedupe(apps, schema_editor):
    Tipo = apps.get_model('contratos', 'TipoServicioOperativo')
    Tipo.objects.filter(nombre__icontains='transporte').update(es_transporte=True)

    ServicioContrato = apps.get_model('contratos', 'ServicioContrato')
    seen = set()
    for servicio in ServicioContrato.objects.select_related('tipo_servicio').order_by('id'):
        if servicio.contrato_id in seen:
            servicio.delete()
            continue
        seen.add(servicio.contrato_id)
        tipo = servicio.tipo_servicio
        es_trans = bool(
            tipo
            and (
                getattr(tipo, 'es_transporte', False)
                or 'transporte' in (tipo.nombre or '').lower()
            )
        )
        if es_trans:
            continue
        if servicio.modalidad_cobro == 'DIARIO':
            servicio.modalidad_cobro = 'MENSUAL_POR_EST'
            servicio.save(update_fields=['modalidad_cobro'])


class Migration(migrations.Migration):

    dependencies = [
        ('contratos', '0016_alter_grupopresetrutas_unique_together_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='tiposerviciooperativo',
            name='es_transporte',
            field=models.BooleanField(
                default=False,
                help_text='Si es verdadero, la gestión usa valor diario, rutas y asistencia.',
            ),
        ),
        migrations.AddField(
            model_name='serviciocontrato',
            name='modalidad_cobro',
            field=models.CharField(
                choices=[
                    ('DIARIO', 'Valor diario (transporte)'),
                    ('MENSUAL_UNICO', 'Monto mensual igual en todos los colegios'),
                    ('MENSUAL_POR_EST', 'Monto mensual distinto por colegio'),
                ],
                db_index=True,
                default='DIARIO',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='serviciocontrato',
            name='monto_mensual',
            field=models.IntegerField(
                blank=True,
                help_text='Obligatorio si la modalidad es monto mensual único.',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='rutatransporte',
            name='valor_diario',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='rutatransporte',
            name='valor_mensual',
            field=models.IntegerField(
                blank=True,
                help_text='Monto mensual de la línea (gestiones no transporte).',
                null=True,
            ),
        ),
        migrations.RunPython(seed_and_dedupe, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='serviciocontrato',
            constraint=models.UniqueConstraint(
                fields=('contrato',),
                name='unique_gestion_por_contrato',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='rutatransporte',
            unique_together={('servicio', 'proveedor', 'nombre')},
        ),
    ]
