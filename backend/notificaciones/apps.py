from django.apps import AppConfig


class NotificacionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notificaciones'

    def ready(self):
        from django.db.models.signals import post_migrate

        def _seed(sender, **kwargs):
            if sender.name != 'notificaciones':
                return
            try:
                from notificaciones.services import seed_notificaciones_catalogos

                seed_notificaciones_catalogos()
            except Exception:
                pass

        post_migrate.connect(_seed, sender=self)
