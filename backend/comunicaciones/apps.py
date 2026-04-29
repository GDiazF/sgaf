from django.apps import AppConfig

class ComunicacionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'comunicaciones'

    def ready(self):
        # Ejecutar migración de datos al iniciar el servidor
        import sys
        if 'runserver' in sys.argv:
            try:
                from .utils import migrar_configuracion_antigua
                migrar_configuracion_antigua()
            except:
                pass
