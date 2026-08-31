from django.db import migrations


def backfill_tickets_modulo(apps, schema_editor):
    Notificacion = apps.get_model('notificaciones', 'Notificacion')
    Notificacion.objects.filter(modulo='').filter(tipo='TICKET').update(
        modulo='TICKETS', evento='LEGACY'
    )
    Notificacion.objects.filter(modulo='').update(modulo='LEGACY', evento='LEGACY')


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('notificaciones', '0004_tiponotificacion_and_notif_fields'),
    ]

    operations = [
        migrations.RunPython(backfill_tickets_modulo, noop),
    ]
