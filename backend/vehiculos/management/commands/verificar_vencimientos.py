from django.core.management.base import BaseCommand
from django.utils import timezone

from notificaciones.handlers import handler_vehiculos_vencimientos


class Command(BaseCommand):
    help = 'Verifica documentos por vencer y dispara notificar() (campana y/o email según tipo)'

    def handle(self, *args, **options):
        hoy = timezone.localdate()
        self.stdout.write(self.style.SUCCESS(f'Iniciando verificación de vencimientos: {hoy}'))
        enviados = handler_vehiculos_vencimientos(stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS(f'Proceso terminado. Disparos: {enviados}'))
