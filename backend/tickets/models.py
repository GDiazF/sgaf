from django.db import models
from django.contrib.auth.models import User
from funcionarios.models import Departamento

class TicketCategory(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Categoría de Ticket"
        verbose_name_plural = "Categorías de Tickets"

class Ticket(models.Model):
    PRIORIDAD_CHOICES = [
        ('BAJA', 'Baja'),
        ('MEDIA', 'Media'),
        ('ALTA', 'Alta'),
        ('CRITICA', 'Crítica'),
    ]
    ESTADO_CHOICES = [
        ('ABIERTO', 'Abierto'),
        ('EN_PROGRESO', 'En Progreso'),
        ('EN_ESPERA', 'En Espera'),
        ('RESUELTO', 'Resuelto'),
        ('CERRADO', 'Cerrado'),
    ]

    correlativo = models.CharField(max_length=20, unique=True, editable=False)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    categoria = models.ForeignKey(TicketCategory, on_delete=models.PROTECT, related_name='tickets')
    area_destino = models.ForeignKey(Departamento, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_recibidos')
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='BAJA')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ABIERTO')
    
    creado_por = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets_creados')
    asignado_a = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_asignados')
    
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    fecha_resolucion = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.correlativo} - {self.titulo}"

    def save(self, *args, **kwargs):
        if not self.correlativo:
            # Generar correlativo simple TKT-XXXX basado en el ID serializado si es posible
            # Nota: En Django, el ID no está disponible antes del primer save en algunos backends.
            # Usaremos un contador global o simplemente buscaremos el último.
            last_ticket = Ticket.objects.all().order_by('id').last()
            if not last_ticket:
                new_id = 1
            else:
                new_id = last_ticket.id + 1
            self.correlativo = f'TKT-{new_id:04d}'
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"
        ordering = ['-fecha_creacion']

def ticket_attachment_path(instance, filename):
    return f'tickets/{instance.ticket.correlativo}/{filename}'

class TicketAttachment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='adjuntos')
    archivo = models.FileField(upload_to=ticket_attachment_path)
    nombre = models.CharField(max_length=255)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

class TicketMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='mensajes')
    autor = models.ForeignKey(User, on_delete=models.CASCADE)
    mensaje = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)
    es_sistema = models.BooleanField(default=False)

    class Meta:
        ordering = ['fecha']
        verbose_name = "Mensaje de Ticket"
        verbose_name_plural = "Mensajes de Tickets"

class TicketHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='historial')
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    campo_modificado = models.CharField(max_length=100)
    valor_anterior = models.TextField(null=True, blank=True)
    valor_nuevo = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Historial de Ticket"
        verbose_name_plural = "Historiales de Tickets"
        ordering = ['-fecha']

class SupportAgent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='support_areas')
    area = models.ForeignKey(Departamento, on_delete=models.CASCADE, related_name='support_agents')
    activo = models.BooleanField(default=True)
    recibe_notificaciones = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'area')
        verbose_name = "Agente de Soporte"
        verbose_name_plural = "Agentes de Soporte"

    def __str__(self):
        return f"{self.user.username} - {self.area.nombre}"

class TicketUserActivity(models.Model):
    """Mantiene registro de qué usuario está viendo qué ticket en tiempo real"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE)
    ultima_actividad = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'ticket')
        verbose_name = "Actividad de Usuario en Ticket"
        verbose_name_plural = "Actividades de Usuarios en Tickets"
