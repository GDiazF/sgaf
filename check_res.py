from solicitudes_reservas.models import SolicitudReserva
res = SolicitudReserva.objects.all().order_by('-id')[:10]
for r in res:
    print(f"ID: {r.id} | Código: {r.codigo_reserva} | Email: {r.email_contacto}")
