from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notificaciones', '0003_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificacion',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('INFO', 'Información'),
                    ('SUCCESS', 'Éxito'),
                    ('WARNING', 'Advertencia'),
                    ('ERROR', 'Error'),
                    ('TICKET', 'Ticket de Soporte'),
                    ('FIRMA', 'Firma digital'),
                ],
                default='INFO',
                max_length=20,
            ),
        ),
    ]
