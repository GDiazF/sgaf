from django.db import models
from django.contrib.auth.models import User

from establecimientos.models import Establecimiento

class Solicitante(models.Model):
    rut = models.CharField("RUT", max_length=12, unique=True, db_index=True)
    nombre = models.CharField("Nombre", max_length=100)
    apellido = models.CharField("Apellido", max_length=100)
    telefono = models.CharField("Teléfono", max_length=20, blank=True)
    email = models.EmailField("Email", blank=True)
    funcionario = models.OneToOneField(
        'funcionarios.Funcionario', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="perfil_solicitante",
        verbose_name="Funcionario Vinculado"
    )
    
    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.rut})"

class Llave(models.Model):
    nombre = models.CharField("Nombre", max_length=100)
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE, related_name="llaves")
    ubicacion = models.CharField("Ubicación Física", max_length=100, blank=True, help_text="Donde se guarda la llave")
    
    def __str__(self):
        return f"{self.nombre} - {self.establecimiento.nombre}"

class Prestamo(models.Model):
    llave = models.ForeignKey(Llave, on_delete=models.CASCADE, related_name="prestamos")
    solicitante = models.ForeignKey(Solicitante, on_delete=models.PROTECT, related_name="prestamos")
    fecha_prestamo = models.DateTimeField("Fecha Préstamo", auto_now_add=True)
    fecha_devolucion = models.DateTimeField("Fecha Devolución", null=True, blank=True)
    observacion = models.TextField("Observación", blank=True)
    usuario_entrega = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="prestamos_entregados")
    usuario_recepcion = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="prestamos_recibidos")
    
    class Meta:
        ordering = ["-fecha_prestamo"]
        
    def __str__(self):
        estado = "DEVUELTO" if self.fecha_devolucion else "PRESTADO"
        return f"{self.llave} - {self.solicitante} [{estado}]"
