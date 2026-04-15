from django.apps import AppConfig

class SolicitudesReservasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'solicitudes_reservas'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import RecursoReservable, BloqueoHorario, SolicitudReserva, ReservaSetting
        auditlog.register(RecursoReservable)
        auditlog.register(BloqueoHorario)
        auditlog.register(SolicitudReserva)
        auditlog.register(ReservaSetting)
