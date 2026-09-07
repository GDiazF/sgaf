# Generated manually for auditoría de descargas de documentos firmados

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('firma_digital', '0009_anulacion_firma_digital'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccesoDocumentoFirma',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('origen', models.CharField(blank=True, default='', max_length=64)),
                ('referencia_id', models.PositiveIntegerField(blank=True, db_index=True, null=True)),
                (
                    'tipo',
                    models.CharField(
                        choices=[
                            ('documento', 'Documento PDF'),
                            ('comprobantes', 'Comprobantes'),
                            ('archivo_escaneado', 'Archivo escaneado / firmado RC'),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ('estado_firma', models.CharField(blank=True, default='', max_length=20)),
                ('usuario_nombre', models.CharField(blank=True, default='', max_length=150)),
                ('ip', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True, default='')),
                ('detalle', models.TextField(blank=True, default='')),
                ('creado_en', models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    'documento_registro',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='accesos',
                        to='firma_digital.documentofirmado',
                    ),
                ),
                (
                    'pendiente',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='accesos',
                        to='firma_digital.firmapendiente',
                    ),
                ),
                (
                    'usuario',
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='accesos_documento_firma',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                'verbose_name': 'Acceso a documento firmado',
                'verbose_name_plural': 'Accesos a documentos firmados',
                'ordering': ['-creado_en'],
            },
        ),
        migrations.AddIndex(
            model_name='accesodocumentofirma',
            index=models.Index(fields=['origen', 'referencia_id', 'creado_en'], name='firma_digit_origen_c5a1e2_idx'),
        ),
        migrations.AddIndex(
            model_name='accesodocumentofirma',
            index=models.Index(fields=['pendiente', 'creado_en'], name='firma_digit_pendien_8f3b4a_idx'),
        ),
    ]
