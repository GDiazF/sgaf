from django.utils import timezone
from datetime import timedelta
from .models import TicketHistory, TicketMessage, SupportAgent, TicketUserActivity
from notificaciones.models import Notificacion
from comunicaciones.utils import enviar_correo_maestro
from core.models import EmailConfiguration
from django.contrib.auth.models import User

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
    # Notificación interna a agentes de soporte
    if ticket.area_destino:
        agentes = SupportAgent.objects.filter(area=ticket.area_destino, activo=True, recibe_notificaciones=True)
        area_nombre = ticket.area_destino.nombre
    else:
        # Si no hay área, notificar a todos los agentes activos
        agentes = SupportAgent.objects.filter(activo=True, recibe_notificaciones=True)
        area_nombre = "Soporte General"
        
    usuarios_notificar = [a.user for a in agentes]
    
    for user in usuarios_notificar:
        Notificacion.objects.create(
            usuario=user,
            titulo=f"Nuevo Ticket: {ticket.correlativo}",
            mensaje=f"Se ha creado un nuevo ticket ({area_nombre}): {ticket.titulo}",
            tipo='TICKET',
            link=f"/tickets/{ticket.id}"
        )

    # Notificación por email (opcional, si hay configuración)
    # Aquí podríamos usar enviar_correo_maestro si definimos una plantilla
    pass

def notificar_cambio_estado(ticket, anterior, nuevo, usuario_cambio):
    if anterior == nuevo:
        return
        
    mensaje = f"El estado del ticket {ticket.correlativo} ha cambiado de {anterior} a {nuevo}."
    
    # Notificar al creador si el cambio no lo hizo él
    if ticket.creado_por != usuario_cambio:
        Notificacion.objects.create(
            usuario=ticket.creado_por,
            titulo=f"Actualización de Ticket: {ticket.correlativo}",
            mensaje=mensaje,
            tipo='TICKET',
            link=f"/tickets/{ticket.id}"
        )
    
    # Notificar al asignado si el cambio no lo hizo él
    if ticket.asignado_a and ticket.asignado_a != usuario_cambio:
         Notificacion.objects.create(
            usuario=ticket.asignado_a,
            titulo=f"Actualización de Ticket: {ticket.correlativo}",
            mensaje=mensaje,
            tipo='TICKET',
            link=f"/tickets/{ticket.id}"
        )

def notificar_nuevo_mensaje(mensaje):
    ticket = mensaje.ticket
    autor = mensaje.autor
    
    # Si el autor es el creador, notificar al asignado (si hay) o a los agentes
    if autor == ticket.creado_por:
        if ticket.asignado_a:
            destinatarios = [ticket.asignado_a]
        else:
            if ticket.area_destino:
                agentes = SupportAgent.objects.filter(area=ticket.area_destino, activo=True, recibe_notificaciones=True)
            else:
                agentes = SupportAgent.objects.filter(activo=True, recibe_notificaciones=True)
            destinatarios = [a.user for a in agentes]
    else:
        # Si el autor no es el creador, notificar al creador
        destinatarios = [ticket.creado_por]
        
    for user in destinatarios:
        if user == autor:
            continue
            
        # VERIFICACIÓN DE PRESENCIA:
        # Si el usuario está viendo el ticket activamente (últimos 15 segundos), NO enviamos notificación
        limite_presencia = timezone.now() - timedelta(seconds=15)
        esta_viendo = TicketUserActivity.objects.filter(
            user=user, 
            ticket=ticket, 
            ultima_actividad__gte=limite_presencia
        ).exists()
        
        if not esta_viendo:
            Notificacion.objects.create(
                usuario=user,
                titulo=f"Nuevo mensaje en Ticket: {ticket.correlativo}",
                mensaje=f"{autor.username} ha respondido al ticket: {ticket.titulo}",
                tipo='TICKET',
                link=f"/tickets/{ticket.id}"
            )
