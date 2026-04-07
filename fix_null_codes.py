from solicitudes_reservas.models import SolicitudReserva
import random, string

res = SolicitudReserva.objects.filter(codigo_reserva__isnull=True)
print(f"Encontradas {res.count()} reservas sin código. Generando...")
chars = string.ascii_uppercase + string.digits
for r in res:
    while True:
        code = ''.join(random.choices(chars, k=6))
        if not SolicitudReserva.objects.filter(codigo_reserva=code).exists():
            r.codigo_reserva = code
            r.save()
            print(f"ID {r.id}: {code}")
            break
print("Proceso completado.")
