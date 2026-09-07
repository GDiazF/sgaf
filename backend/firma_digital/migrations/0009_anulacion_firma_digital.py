# Generated manually for anulación de firma digital

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('firma_digital', '0008_alter_configuracionsellofirma_alto_pt_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='documentofirmado',
            name='anulado',
            field=models.BooleanField(db_index=True, default=False, verbose_name='Anulado'),
        ),
        migrations.AddField(
            model_name='documentofirmado',
            name='anulado_en',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Anulado en'),
        ),
        migrations.AddField(
            model_name='documentofirmado',
            name='motivo_anulacion',
            field=models.TextField(blank=True, default='', verbose_name='Motivo anulación'),
        ),
        migrations.AddField(
            model_name='firmapendiente',
            name='anulado_en',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='firmapendiente',
            name='motivo_anulacion',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='firmapendiente',
            name='estado',
            field=models.CharField(
                choices=[
                    ('pendiente', 'Pendiente'),
                    ('firmado', 'Firmado'),
                    ('rechazado', 'Rechazado'),
                    ('anulado', 'Anulado'),
                ],
                db_index=True,
                default='pendiente',
                max_length=20,
            ),
        ),
    ]
