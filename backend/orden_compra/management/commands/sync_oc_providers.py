"""
Management command: sync_oc_providers
Reintenta obtener el proveedor de las OCs que quedaron sin esa información
(generalmente por Error 500 temporal en la API de Mercado Público).

Uso manual:
    python manage.py sync_oc_providers

Se lanza automáticamente desde apps.py al iniciar el servidor.
"""
import time
import requests
import urllib3
import logging

from django.core.management.base import BaseCommand
from orden_compra.models import OrdenCompraMP

urllib3.disable_warnings()
logger = logging.getLogger('oc_sync')

TICKET = "F23CBE04-6C9D-40C4-985C-7F5FCD6070B6"
TICKET_BACKUP = "F8537A18-6766-4DEF-9E59-426B4FEE2844"
BASE_URL = "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json"


def fetch_oc_detail(codigo: str) -> dict | None:
    """Obtiene el detalle de una OC por su código. Devuelve el dict o None."""
    for ticket in [TICKET, TICKET_BACKUP]:
        try:
            res = requests.get(
                BASE_URL,
                params={'codigo': codigo, 'ticket': ticket},
                timeout=15,
                verify=False
            )
            if res.status_code == 200:
                js = res.json()
                listado = js.get('Listado', [])
                if listado:
                    return listado[0]
            elif res.status_code == 429:
                time.sleep(5)
        except Exception:
            pass
    return None


def patch_oc_provider(oc: OrdenCompraMP, raw: dict) -> bool:
    """Actualiza el proveedor de una OC con los datos frescos de la API."""
    prov_raw = raw.get('Proveedor', {}) or {}
    nombre = prov_raw.get('Nombre') or prov_raw.get('NombreProveedor') or ''
    rut = prov_raw.get('RutSucursal') or prov_raw.get('Rut') or ''

    if not nombre and not rut:
        return False  # La API tampoco tiene el dato

    json_data = oc.json_data
    json_data['Proveedor'] = {
        'Nombre': nombre,
        'RazonSocial': prov_raw.get('NombreSucursal') or '',
        'Rut': rut,
        'Codigo': prov_raw.get('Codigo') or '',
        'Contacto': prov_raw.get('NombreContacto') or '',
        'Mail': prov_raw.get('MailContacto') or '',
        'Fono': prov_raw.get('FonoContacto') or '',
        'Actividad': prov_raw.get('Actividad') or '',
        'Direccion': prov_raw.get('Direccion') or '',
        'Comuna': prov_raw.get('Comuna') or '',
    }

    # Actualizar monto si estaba vacío
    if not json_data.get('MontoTotal'):
        json_data['MontoTotal'] = raw.get('TotalNeto') or raw.get('Total') or 0

    oc.json_data = json_data
    oc.save(update_fields=['json_data'])
    return True


def run_sync(verbose: bool = True) -> dict:
    """
    Función principal de sincronización.
    Busca OCs sin proveedor y reintenta obtenerlos de la API.
    Devuelve un resumen de resultados.
    """
    # Buscar OCs con proveedor vacío en la DB
    sin_proveedor = []
    for oc in OrdenCompraMP.objects.all():
        prov = oc.json_data.get('Proveedor', {})
        nombre = prov.get('Nombre', '') or prov.get('RazonSocial', '') or prov.get('Rut', '')
        if not nombre:
            sin_proveedor.append(oc)

    if not sin_proveedor:
        if verbose:
            logger.info("sync_oc_providers: Todas las OCs tienen proveedor ✓")
        return {'total': 0, 'updated': 0, 'failed': 0}

    if verbose:
        logger.info(f"sync_oc_providers: Encontradas {len(sin_proveedor)} OCs sin proveedor. Iniciando re-sincronización...")

    updated = 0
    failed = 0

    for oc in sin_proveedor:
        raw = fetch_oc_detail(oc.codigo_externo)
        if raw:
            ok = patch_oc_provider(oc, raw)
            if ok:
                updated += 1
                if verbose:
                    prov_nombre = oc.json_data.get('Proveedor', {}).get('Nombre', '?')
                    logger.info(f"  ✓ {oc.codigo_externo} -> {prov_nombre}")
            else:
                failed += 1
                if verbose:
                    logger.info(f"  ⏳ {oc.codigo_externo} -> API no tiene el dato aún")
        else:
            failed += 1
            if verbose:
                logger.info(f"  ✗ {oc.codigo_externo} -> API no disponible (Error 500 / timeout)")
        
        # Pausa entre peticiones para no saturar Mercado Público
        time.sleep(1)

    summary = {'total': len(sin_proveedor), 'updated': updated, 'failed': failed}
    if verbose:
        logger.info(f"sync_oc_providers: Fin → {updated} actualizados, {failed} pendientes.")
    return summary


class Command(BaseCommand):
    help = 'Reintenta obtener el proveedor de las OCs que quedaron sin información.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loop',
            action='store_true',
            help='Ejecutar en bucle infinito, reintentando cada hora.',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=3600,
            help='Intervalo en segundos entre cada intento (default: 3600 = 1 hora).',
        )

    def handle(self, *args, **options):
        loop = options.get('loop', False)
        interval = options.get('interval', 3600)

        self.stdout.write(self.style.SUCCESS('🔄 Iniciando sync_oc_providers...'))

        if loop:
            self.stdout.write(f'Modo bucle activo. Intervalo: {interval}s ({interval // 60} min)')
            while True:
                summary = run_sync(verbose=True)
                if summary['failed'] == 0:
                    self.stdout.write(self.style.SUCCESS(
                        f"✅ Todas las OCs actualizadas. Próxima verificación en {interval // 60} min."
                    ))
                else:
                    self.stdout.write(self.style.WARNING(
                        f"⏳ {summary['updated']} actualizados, {summary['failed']} aún pendientes. "
                        f"Reintento en {interval // 60} min."
                    ))
                time.sleep(interval)
        else:
            summary = run_sync(verbose=True)
            self.stdout.write(self.style.SUCCESS(
                f"Fin: {summary['updated']} actualizados, {summary['failed']} aún pendientes."
            ))
