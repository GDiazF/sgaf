from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from solicitudes_reservas.models import SolicitudReserva
from solicitudes_reservas.emails import enviar_correo_recordatorio

class Command(BaseCommand):
    help = 'Envía correos de recordatorio para las reservas del día siguiente'

    def handle(self, *args, **options):
        # 1. Definir el rango de "mañana"
        hoy = timezone.localtime(timezone.now()).date()
        manana = hoy + timedelta(days=1)
        
        self.stdout.write(f"Buscando reservas para el {manana}...")

        # 2. Buscar solicitudes aprobadas que inician mañana
        reservas_manana = SolicitudReserva.objects.filter(
            fecha_inicio__date=manana,
            estado='APROBADA'
        )

        total = reservas_manana.count()
        self.stdout.write(f"Se encontraron {total} reservas para notificar.")

        # 3. Enviar correos
        exitos = 0
        for reserva in reservas_manana:
            try:
                enviado = enviar_correo_recordatorio(reserva)
                if enviado:
                    exitos += 1
                    self.stdout.write(self.style.SUCCESS(f"Recordatorio enviado a: {reserva.solicitante or reserva.nombre_funcionario}"))
                else:
                    self.stdout.write(self.style.WARNING(f"No se pudo enviar correo para la reserva {reserva.id}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error procesando reserva {reserva.id}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(f"Proceso finalizado. Total enviados: {exitos}/{total}"))
