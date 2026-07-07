from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from vehiculos.models import VehiculoDocumento
from comunicaciones.utils import enviar_correo_maestro, obtener_destinatarios_correo_operativo
import logging

logger = logging.getLogger(__name__)
PROPOSITO_ALERTA = 'ALERTA_VENCIMIENTO_VEHICULO'

class Command(BaseCommand):
    help = 'Verifica documentos por vencer y envía notificaciones por correo'

    def handle(self, *args, **options):
        hoy = timezone.now().date()
        self.stdout.write(self.style.SUCCESS(f'Iniciando verificación de vencimientos: {hoy}'))

        # Buscar todos los documentos activos que tengan fecha de vencimiento
        documentos = VehiculoDocumento.objects.filter(
            fecha_vencimiento__isnull=False,
            vehiculo__activo=True
        )

        enviados = 0
        destinatarios = obtener_destinatarios_correo_operativo(PROPOSITO_ALERTA)
        if not destinatarios:
            mensaje = 'No hay destinatarios configurados para alertas de vencimiento vehicular.'
            logger.warning(mensaje)
            self.stdout.write(self.style.WARNING(mensaje))
            return

        for doc in documentos:
            # Determinar cuántos días de aviso se usan
            dias_aviso = doc.dias_aviso if doc.dias_aviso is not None else doc.tipo.dias_aviso_defecto
            
            # Fecha en la que debería avisar
            fecha_aviso = doc.fecha_vencimiento - timedelta(days=dias_aviso)

            # Si hoy es el día de aviso (o posterior) y aún no ha vencido totalmente
            # Y no hemos enviado una notificación hoy (para evitar spam diario)
            if hoy >= fecha_aviso and doc.ultima_notificacion != hoy:
                
                # Solo enviar si el documento aún no está vencido (opcional, podrías avisar incluso si ya venció)
                # Pero la lógica es "Avisar X días antes"
                
                # Contexto para el correo
                contexto = {
                    'patente': doc.vehiculo.patente,
                    'vehiculo': f"{doc.vehiculo.marca} {doc.vehiculo.modelo}",
                    'documento': doc.tipo.nombre,
                    'fecha_vencimiento': doc.fecha_vencimiento.strftime('%d/%m/%Y'),
                    'dias_restantes': (doc.fecha_vencimiento - hoy).days
                }

                success = enviar_correo_maestro(
                    proposito=PROPOSITO_ALERTA,
                    destinatarios=destinatarios,
                    contexto=contexto
                )
                
                if success:
                    doc.ultima_notificacion = hoy
                    doc.save()
                    enviados += 1
                    self.stdout.write(f'Notificación enviada para {doc.vehiculo.patente} - {doc.tipo.nombre}')

        self.stdout.write(self.style.SUCCESS(f'Proceso terminado. Notificaciones enviadas: {enviados}'))
