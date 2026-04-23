from django.apps import AppConfig


class SolicitudesReservasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'solicitudes_reservas'

    def ready(self):
        """Al iniciar la app, elimina las reservas pendientes expiradas."""
        try:
            from django.utils import timezone
            from .models import SolicitudReserva
            expired = SolicitudReserva.objects.filter(
                estado='PENDIENTE', fecha_fin__lt=timezone.now()
            )
            count = expired.count()
            if count:
                expired.delete()
                import sys
                print(f'[SGAF] cleanup_reservas: {count} reservas pendientes expiradas eliminadas.', file=sys.stdout)
        except Exception:
            # Evitar fallos en migraciones/tests donde las tablas aún no existen
            pass

