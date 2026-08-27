"""
Scheduler integrado de notificaciones (NO es el cron de respaldos BDD).

Uso (proceso aparte junto al API):
  python manage.py run_scheduler
  python manage.py run_scheduler --once
  python manage.py run_scheduler --force
"""

from __future__ import annotations

import time

from django.core.management.base import BaseCommand
from django.utils import timezone

from notificaciones.services import ejecutar_jobs_vencidos


class Command(BaseCommand):
    help = (
        'Ejecuta jobs programados de notificaciones a su hora local. '
        'No relaciona con scripts de respaldo BDD/media.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Una sola pasada y salir (útil en tests o Task Scheduler que solo dispara este comando).',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Ejecuta todos los jobs activos ignorando hora y marca del día.',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=30,
            help='Segundos entre chequeos en modo daemon (default 30).',
        )

    def handle(self, *args, **options):
        once = options['once']
        force = options['force']
        interval = max(5, options['interval'])

        self.stdout.write(
            self.style.SUCCESS(
                f'Scheduler notificaciones iniciado (tz={timezone.get_current_timezone_name()}, '
                f'interval={interval}s). Respaldos BDD no se tocan.'
            )
        )

        while True:
            try:
                corridos = ejecutar_jobs_vencidos(force=force)
                if corridos:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'{timezone.localtime():%Y-%m-%d %H:%M:%S} ejecutados: {", ".join(corridos)}'
                        )
                    )
                force = False  # force solo la primera pasada
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f'Error en scheduler: {exc}'))

            if once:
                break
            time.sleep(interval)
