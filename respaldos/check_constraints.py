import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from establecimientos.models import Establecimiento
from servicios.models import RegistroPago

total = Establecimiento.objects.count()
with_payments = RegistroPago.objects.values_list('establecimiento', flat=True).distinct()
linked_count = len(with_payments)

print(f"Total establecimientos: {total}")
print(f"Establecimientos con pagos asociados (PROTEGIDOS): {linked_count}")

# List first 5 protected ones for context
protected_list = Establecimiento.objects.filter(id__in=with_payments)[:5]
for e in protected_list:
    print(f" - {e.nombre} (ID: {e.id})")
