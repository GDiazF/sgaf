from django.utils import timezone
from datetime import timedelta
from .models import TicketHistory, TicketMessage, SupportAgent, TicketUserActivity
from notificaciones.services import notificar


def registrar_historial(ticket, usuario, campo, anterior, nuevo):
    if str(anterior) != str(nuevo):
        TicketHistory.objects.create(
            ticket=ticket,
            usuario=usuario,
            campo_modificado=campo,
            valor_anterior=str(anterior),
            valor_nuevo=str(nuevo)
        )


def notificar_nuevo_ticket(ticket):
    if ticket.area_destino:
        agentes = SupportAgent.objects.filter(
            area=ticket.area_destino, activo=True, recibe_notificaciones=True
        )
        area_nombre = ticket.area_destino.nombre
    else:
        agentes = SupportAgent.objects.filter(activo=True, recibe_notificaciones=True)
        area_nombre = "Soporte General"

    usuarios_notificar = [a.user for a in agentes]
    if not usuarios_notificar:
        return

    notificar(
        modulo='TICKETS',
        evento='NUEVO',
        titulo=f"Nuevo Ticket: {ticket.correlativo}",
        mensaje=f"Se ha creado un nuevo ticket ({area_nombre}): {ticket.titulo}",
        tipo='TICKET',
        link=f"/tickets/{ticket.id}",
        usuarios=usuarios_notificar,
        email_contexto={
            'correlativo': ticket.correlativo,
            'titulo_ticket': ticket.titulo,
            'area': area_nombre,
        },
    )


def notificar_cambio_estado(ticket, anterior, nuevo, usuario_cambio):
    if anterior == nuevo:
        return

    mensaje = f"El estado del ticket {ticket.correlativo} ha cambiado de {anterior} a {nuevo}."
    destinatarios = []
    if ticket.creado_por != usuario_cambio:
        destinatarios.append(ticket.creado_por)
    if ticket.asignado_a and ticket.asignado_a != usuario_cambio:
        destinatarios.append(ticket.asignado_a)
    if not destinatarios:
        return

    notificar(
        modulo='TICKETS',
        evento='CAMBIO_ESTADO',
        titulo=f"Actualización de Ticket: {ticket.correlativo}",
        mensaje=mensaje,
        tipo='TICKET',
        link=f"/tickets/{ticket.id}",
        usuarios=destinatarios,
    )


def notificar_nuevo_mensaje(mensaje):
    ticket = mensaje.ticket
    autor = mensaje.autor

    if autor == ticket.creado_por:
        if ticket.asignado_a:
            destinatarios = [ticket.asignado_a]
        else:
            if ticket.area_destino:
                agentes = SupportAgent.objects.filter(
                    area=ticket.area_destino, activo=True, recibe_notificaciones=True
                )
            else:
                agentes = SupportAgent.objects.filter(activo=True, recibe_notificaciones=True)
            destinatarios = [a.user for a in agentes]
    else:
        destinatarios = [ticket.creado_por]

    users = []
    for user in destinatarios:
        if user == autor:
            continue
        limite_presencia = timezone.now() - timedelta(seconds=15)
        esta_viendo = TicketUserActivity.objects.filter(
            user=user,
            ticket=ticket,
            ultima_actividad__gte=limite_presencia,
        ).exists()
        if not esta_viendo:
            users.append(user)

    if not users:
        return

    notificar(
        modulo='TICKETS',
        evento='NUEVO_MENSAJE',
        titulo=f"Nuevo mensaje en Ticket: {ticket.correlativo}",
        mensaje=f"{autor.username} ha respondido al ticket: {ticket.titulo}",
        tipo='TICKET',
        link=f"/tickets/{ticket.id}",
        usuarios=users,
    )
