from django.db import models
from django.contrib.auth.models import User
from funcionarios.models import Funcionario

class SolicitudARCO(models.Model):
    TIPO_DERECHO_CHOICES = [
        ('RECTIFICACION', 'Rectificación de Datos'),
        ('SUPRESION', 'Supresión (Baja de Registro)'),
        ('OPOSICION', 'Oposición al Tratamiento'),
        ('PORTABILIDAD', 'Portabilidad de Datos'),
    ]
    
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente de Revisión'),
        ('APROBADA', 'Aprobada y Aplicada'),
        ('RECHAZADA', 'Rechazada'),
    ]

    solicitante = models.ForeignKey(Funcionario, on_delete=models.CASCADE, related_name='solicitudes_arco')
    tipo_derecho = models.CharField(max_length=20, choices=TIPO_DERECHO_CHOICES, default='RECTIFICACION')
    
    # Para Rectificaciones
    campo = models.CharField(max_length=50, blank=True, null=True, help_text="Nombre del campo a cambiar, ej: 'anexo'")
    valor_anterior = models.TextField(blank=True, null=True)
    valor_propuesto = models.TextField(blank=True, null=True)
    
    justificacion = models.TextField(help_text="Motivo de la solicitud (Requerido por Art. 11)")
    archivo_respaldo = models.FileField(upload_to='arco/respaldos/%Y/', blank=True, null=True)
    
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    solicita_bloqueo = models.BooleanField(default=False, verbose_name="Solicita Bloqueo Temporal (Art. 8° ter)")
    
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    fecha_resolucion = models.DateTimeField(blank=True, null=True)
    resuelto_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='solicitudes_arco_resueltas')
    motivo_rechazo = models.TextField(blank=True, null=True, help_text="Motivo escrito obligatorio si se rechaza")

    class Meta:
        verbose_name = "Solicitud ARCO"
        verbose_name_plural = "Solicitudes ARCO"
        ordering = ['-fecha_solicitud']

    def __str__(self):
        return f"Solicitud {self.get_tipo_derecho_display()} - {self.solicitante.nombre_funcionario} ({self.estado})"
