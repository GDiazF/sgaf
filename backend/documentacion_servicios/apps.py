from django.apps import AppConfig


class DocumentacionServiciosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'documentacion_servicios'
    verbose_name = 'Documentación de servicios'

    def ready(self):
        from django.db.models.signals import post_migrate

        def _seed(sender, **kwargs):
            if sender.name != 'documentacion_servicios':
                return
            try:
                from documentacion_servicios.seed import seed_tipos_iniciales

                seed_tipos_iniciales()
            except Exception:
                pass

        post_migrate.connect(_seed, sender=self)
