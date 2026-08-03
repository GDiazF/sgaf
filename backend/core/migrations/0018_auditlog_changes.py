# Generated manually for AuditLog.changes JSONField

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_auditlog_user_agent'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditlog',
            name='changes',
            field=models.JSONField(blank=True, default=dict, verbose_name='Cambios'),
        ),
    ]
