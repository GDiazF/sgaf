from django.core.management.base import BaseCommand
from django.utils import timezone
from solicitudes_reservas.models import SolicitudReserva


class Command(BaseCommand):
    help = 'Elimina físicamente las solicitudes PENDIENTES cuya fecha_fin ya ha expirado.'

    def handle(self, *args, **options):
        now = timezone.now()
        expired = SolicitudReserva.objects.filter(estado='PENDIENTE', fecha_fin__lt=now)
        count = expired.count()
        expired.delete()
        self.stdout.write(
            self.style.SUCCESS(f'[cleanup_reservas] {count} reservas pendientes expiradas eliminadas.')
        )
