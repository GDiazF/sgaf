import random
from django.contrib.auth.models import User
from tickets.models import Ticket, TicketCategory, TicketMessage
from django.utils import timezone

def populate():
    users = list(User.objects.all())
    categories = list(TicketCategory.objects.all())
    
    if not users or not categories:
        print("Error: No hay usuarios o categorías en el sistema.")
        return

    temas = [
        "Problema con el acceso al sistema",
        "Error al imprimir documentos",
        "Solicitud de nuevo equipo",
        "Fallo en la conexión Wi-Fi",
        "Duda sobre el proceso de remuneraciones",
        "Error en el módulo de inventario",
        "No carga la página principal",
        "Problema con el correo institucional",
        "Solicitud de cambio de contraseña",
        "Error al subir archivos adjuntos",
        "El sistema está muy lento hoy",
        "Se cerró la sesión inesperadamente",
        "Error de base de datos al guardar",
        "No recibo notificaciones de la campana",
        "Problema con la reserva de vehículos"
    ]

    descripciones = [
        "Al intentar entrar me sale un error 404.",
        "La impresora del segundo piso no reconoce el papel.",
        "Necesito un mouse y teclado nuevos para mi estación.",
        "La señal de Wi-Fi se cae constantemente en mi oficina.",
        "No entiendo cómo ver mi liquidación de sueldo.",
        "El botón de guardar no hace nada en el módulo.",
        "La pantalla se queda en blanco al cargar.",
        "No puedo enviar correos a externos.",
        "Olvidé mi clave y necesito resetearla.",
        "El archivo pesa 2MB y me dice que es muy grande.",
        "Tarda más de 10 segundos en responder cada clic.",
        "Estaba trabajando y me sacó al login.",
        "Sale un mensaje de error SQL al final.",
        "Me dicen que me enviaron mensajes pero no veo el punto rojo.",
        "No me deja elegir el vehículo para mañana."
    ]

    prioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
    estados = ['ABIERTO', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTO']

    print(f"Generando 30 tickets con {len(users)} usuarios...")

    for i in range(30):
        creador = random.choice(users)
        # Algunos tickets asignados a otros usuarios (o a nadie)
        asignado = random.choice(users + [None] * 5) 
        
        tema_idx = random.randint(0, len(temas)-1)
        
        ticket = Ticket.objects.create(
            titulo=f"{temas[tema_idx]} #{i+1}",
            descripcion=descripciones[tema_idx],
            categoria=random.choice(categories),
            prioridad=random.choice(prioridades),
            estado=random.choice(estados),
            creado_por=creador,
            asignado_a=asignado,
            area_destino=None # Ahora es opcional
        )
        
        # Agregar un mensaje inicial si ya está en progreso o resuelto
        if ticket.estado != 'ABIERTO':
            TicketMessage.objects.create(
                ticket=ticket,
                autor=random.choice(users),
                mensaje="Estamos revisando su solicitud. Por favor espere.",
                es_sistema=False
            )

    print("¡30 tickets generados exitosamente!")

if __name__ == "__main__":
    populate()
