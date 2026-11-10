from django.apps import AppConfig


class VehiculosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vehiculos'

    def ready(self):
        from django.db.models.signals import post_migrate

        def _seed(sender, **kwargs):
            try:
                from vehiculos.seed import seed_tipos_documento_sistema

                seed_tipos_documento_sistema()
            except Exception:
                # Migraciones parciales / DB vacía: no tumbar el arranque.
                pass

        post_migrate.connect(_seed, sender=self)
