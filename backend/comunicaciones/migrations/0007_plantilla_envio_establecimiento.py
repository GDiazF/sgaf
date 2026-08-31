from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comunicaciones', '0006_plantillas_doc_servicios'),
    ]

    operations = [
        migrations.AlterField(
            model_name='destinatarioscorreooperativo',
            name='proposito',
            field=models.CharField(
                choices=[
                    ('MFA', 'Código MFA (2FA)'),
                    ('RESET_PASSWORD', 'Recuperación de Contraseña'),
                    ('RESERVA_SOLICITUD', 'Nueva Solicitud de Reserva (Usuario)'),
                    ('RESERVA_APROBACION', 'Reserva Aprobada/Rechazada'),
                    ('RESERVA_AVISO_ADMIN', 'Aviso a Admin de Nueva Reserva'),
                    ('RESERVA_RECORDATORIO', 'Recordatorio de Reserva (Automático)'),
                    ('ALERTA_VENCIMIENTO_VEHICULO', 'Alerta de Vencimiento de Documento Vehicular'),
                    ('DOC_SERVICIOS_NUEVO', 'Documentación de servicios: nuevo registro'),
                    ('DOC_SERVICIOS_AVISO', 'Documentación de servicios: aviso por fecha'),
                    (
                        'DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO',
                        'Documentación de servicios: envío al establecimiento',
                    ),
                    ('TEST', 'Correo de Prueba'),
                ],
                max_length=50,
                unique=True,
                verbose_name='Propósito',
            ),
        ),
        migrations.AlterField(
            model_name='plantillacorreo',
            name='proposito',
            field=models.CharField(
                choices=[
                    ('MFA', 'Código MFA (2FA)'),
                    ('RESET_PASSWORD', 'Recuperación de Contraseña'),
                    ('RESERVA_SOLICITUD', 'Nueva Solicitud de Reserva (Usuario)'),
                    ('RESERVA_APROBACION', 'Reserva Aprobada/Rechazada'),
                    ('RESERVA_AVISO_ADMIN', 'Aviso a Admin de Nueva Reserva'),
                    ('RESERVA_RECORDATORIO', 'Recordatorio de Reserva (Automático)'),
                    ('ALERTA_VENCIMIENTO_VEHICULO', 'Alerta de Vencimiento de Documento Vehicular'),
                    ('DOC_SERVICIOS_NUEVO', 'Documentación de servicios: nuevo registro'),
                    ('DOC_SERVICIOS_AVISO', 'Documentación de servicios: aviso por fecha'),
                    (
                        'DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO',
                        'Documentación de servicios: envío al establecimiento',
                    ),
                    ('TEST', 'Correo de Prueba'),
                ],
                max_length=50,
                unique=True,
                verbose_name='Propósito',
            ),
        ),
    ]
