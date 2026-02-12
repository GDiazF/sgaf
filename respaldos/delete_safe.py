import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from establecimientos.models import Establecimiento
from servicios.models import RegistroPago

# Get IDs with payments
with_payments = set(RegistroPago.objects.values_list('establecimiento', flat=True).distinct())

# Filter those without payments
to_delete = Establecimiento.objects.exclude(id__in=with_payments)
deleted_count = to_delete.count()
to_delete.delete()

remaining_count = Establecimiento.objects.count()

print(f"Borrados: {deleted_count}")
print(f"Restantes (Protegidos): {remaining_count}")
if remaining_count > 0:
    print("Los siguientes establecimientos no se pudieron borrar porque tienen Pagos registrados:")
    for e in Establecimiento.objects.all():
        print(f" - {e.nombre}")
