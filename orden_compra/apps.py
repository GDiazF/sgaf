import threading
import time
from django.apps import AppConfig


class OrdenCompraConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orden_compra'

    def ready(self):
        # Lanzar el sync automático en un hilo al iniciar el servidor
        # Solo se activa una vez (evita doble arranque en modo autoreload)
        import os
        if os.environ.get('RUN_MAIN') != 'true':
            return  # En modo dev con autoreload, solo corre en el proceso hijo

        def background_sync_loop():
            # Esperar 30 segundos al inicio para que el servidor esté completamente listo
            time.sleep(30)
            from orden_compra.management.commands.sync_oc_providers import run_sync
            import logging
            logger = logging.getLogger('oc_sync')

            while True:
                try:
                    summary = run_sync(verbose=True)
                    if summary.get('total', 0) > 0:
                        logger.info(
                            f"[AUTO-SYNC OC] {summary['updated']} proveedores actualizados, "
                            f"{summary['failed']} aún pendientes."
                        )
                except Exception as e:
                    logger.warning(f"[AUTO-SYNC OC] Error en sync: {e}")
                
                # Repetir cada 1 hora (3600 segundos)
                time.sleep(3600)

        thread = threading.Thread(target=background_sync_loop, daemon=True, name='oc-provider-sync')
        thread.start()
