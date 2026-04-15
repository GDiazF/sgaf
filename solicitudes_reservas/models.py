from django.db import models
from django.conf import settings

# Modelo de Recurso Reservable
class RecursoReservable(models.Model):
    TIPO_CHOICES = [
        ('SALA', 'Sala de Reuniones'),
        ('VEHICULO', 'Vehículo'),
        ('PROYECTOR', 'Proyector/Equipo'),
        ('OTRO', 'Otro Recurso'),
    ]
    
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    ubicacion = models.CharField(max_length=100, blank=True)
    capacidad = models.IntegerField(default=1, verbose_name="Capacidad (Personas)")
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default='#6366f1', verbose_name="Color en Calendario",
                             help_text="Color hexadecimal, ej: #6366f1")
    dias_antelacion = models.IntegerField(default=0, verbose_name="Días de antelación",
                                         help_text="Días mínimos requeridos para reservar este recurso.")

    def __str__(self):
        return f"{self.nombre} ({self.get_tipo_display()})"


# Modelo de Bloqueo de Horario
class BloqueoHorario(models.Model):
    """Bloquea un rango de horas para un recurso. Soporta fecha única, rango o indefinido."""

    MODO_CHOICES = [
        ('DIA',        'Día específico'),
        ('RANGO',      'Rango de fechas'),
        ('INDEFINIDO', 'Indefinido (sin fecha de fin)'),
    ]

    recurso = models.ForeignKey(
        RecursoReservable, on_delete=models.CASCADE, related_name='bloqueos'
    )
    modo = models.CharField(max_length=12, choices=MODO_CHOICES, default='DIA',
                            verbose_name="Tipo de bloqueo")
    fecha_inicio = models.DateField(verbose_name="Fecha inicio del bloqueo")
    fecha_fin    = models.DateField(null=True, blank=True,
                                    verbose_name="Fecha fin (solo para RANGO)")
    hora_inicio  = models.TimeField(verbose_name="Hora inicio bloqueo")
    hora_fin     = models.TimeField(verbose_name="Hora fin bloqueo")
    motivo       = models.CharField(max_length=200, blank=True,
                                    verbose_name="Motivo (opcional)")
    creado_por   = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='bloqueos_creados'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['fecha_inicio', 'hora_inicio']

    def aplica_en_fecha(self, fecha):
        """Retorna True si este bloqueo aplica en la fecha dada."""
        if self.modo == 'DIA':
            return self.fecha_inicio == fecha
        elif self.modo == 'RANGO':
            return self.fecha_inicio <= fecha <= (self.fecha_fin or self.fecha_inicio)
        elif self.modo == 'INDEFINIDO':
            return fecha >= self.fecha_inicio
        return False

    def __str__(self):
        if self.modo == 'DIA':
            period = str(self.fecha_inicio)
        elif self.modo == 'RANGO':
            period = f"{self.fecha_inicio} → {self.fecha_fin or '…'}"
        else:
            period = f"Desde {self.fecha_inicio} (indefinido)"
        return f"{self.recurso.nombre} | {period} {self.hora_inicio}-{self.hora_fin}"


# Modelo de Solicitud de Reserva
class SolicitudReserva(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente de Aprobación'),
        ('APROBADA', 'Aprobada'),
        ('RECHAZADA', 'Rechazada'),
        ('CANCELADA', 'Cancelada por Usuario'),
        ('FINALIZADA', 'Finalizada/Completada'),
    ]

    recurso = models.ForeignKey(RecursoReservable, on_delete=models.CASCADE, related_name='solicitudes')
    solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservas_solicitadas', null=True, blank=True)
    
    titulo = models.CharField(max_length=150, verbose_name="Título del Evento/Uso")
    descripcion = models.TextField(blank=True, verbose_name="Detalle de Uso")
    nombre_funcionario = models.CharField(
        max_length=150, blank=True,
        verbose_name="Nombre del Funcionario",
        help_text="Nombre de quien usará el recurso"
    )
    email_contacto = models.EmailField(
        blank=True, null=True,
        verbose_name="Email de Contacto",
        help_text="Correo para notificaciones (especialmente para externos)"
    )
    
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    
    # Auditoría de aprobación
    aprobado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='reservas_aprobadas')
    fecha_aprobacion = models.DateTimeField(null=True, blank=True)
    motivo_rechazo = models.TextField(blank=True, null=True)

    codigo_reserva = models.CharField(max_length=10, unique=True, blank=True, null=True, verbose_name="Código de Reserva")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.codigo_reserva:
            import random
            import string
            # Generar un código aleatorio de 6 caracteres (mayúsculas y números)
            characters = string.ascii_uppercase + string.digits
            while True:
                new_code = ''.join(random.choices(characters, k=6))
                if not SolicitudReserva.objects.filter(codigo_reserva=new_code).exists():
                    self.codigo_reserva = new_code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.titulo} - {self.recurso}"

    class Meta:
        ordering = ['-fecha_inicio']
        permissions = [
            ("can_change_reserva_name", "Puede cambiar el nombre de la reserva"),
            ("can_bypass_antelacion", "Puede saltar bloqueo de antelación"),
        ]

class ReservaSetting(models.Model):
    """Configuración global para el sistema de reservas."""
    hora_inicio = models.TimeField(default='07:00', verbose_name="Hora de Inicio Jornada")
    hora_fin = models.TimeField(default='18:00', verbose_name="Hora de Fin Jornada")

    def __str__(self):
        return f"Configuración: {self.hora_inicio.strftime('%H:%M')} - {self.hora_fin.strftime('%H:%M')}"

    class Meta:
        verbose_name = "Ajuste de Reservas"
        verbose_name_plural = "Ajustes de Reservas"
