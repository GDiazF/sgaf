from django.db import models
from django.contrib.auth.models import User
from funcionarios.models import Funcionario, Unidad
from establecimientos.models import Establecimiento

class AsignacionEjecutivo(models.Model):
    funcionario = models.ForeignKey(Funcionario, on_delete=models.CASCADE, related_name='establecimientos_asignados')
    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE, related_name='ejecutivos_asignados')
    vigente = models.BooleanField(default=True)
    fecha_asignacion = models.DateTimeField(auto_now_add=True)
    asignado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='asignaciones_creadas')

    class Meta:
        verbose_name = "Asignación de Ejecutivo"
        verbose_name_plural = "Asignaciones de Ejecutivos"
        unique_together = ('funcionario', 'establecimiento')

    def __str__(self):
        return f"{self.funcionario.nombre_funcionario} -> {self.establecimiento.nombre}"

class GestionEstablecimiento(models.Model):
    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EN_PROCESO', 'En proceso'),
        ('RESPONDIDO', 'Respondido'),
        ('CERRADO', 'Cerrado'),
    ]

    establecimiento = models.ForeignKey(Establecimiento, on_delete=models.CASCADE, related_name='gestiones')
    ejecutivo = models.ForeignKey(Funcionario, on_delete=models.CASCADE, related_name='gestiones_realizadas')
    
    requerimiento = models.CharField(max_length=255, verbose_name="Requerimiento / Título")
    descripcion = models.TextField(blank=True, verbose_name="Descripción detallada")
    fecha = models.DateField(auto_now_add=True, verbose_name="Fecha de atención")
    
    # Relaciones múltiples para derivar gestiones
    subdirecciones_requeridas = models.ManyToManyField('funcionarios.Subdireccion', blank=True, related_name='gestiones_solicitadas')
    departamentos_requeridos = models.ManyToManyField('funcionarios.Departamento', blank=True, related_name='gestiones_solicitadas')
    unidades_requeridas = models.ManyToManyField('funcionarios.Unidad', blank=True, related_name='gestiones_solicitadas')
    
    respuesta = models.TextField(blank=True, verbose_name="Respuesta")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    
    tiempo_gestion_dias = models.IntegerField(default=0, verbose_name="Tiempo total de gestión (días)")
    observaciones = models.TextField(blank=True, verbose_name="Observaciones internas")
    
    creado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='gestiones_creadas')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Gestión de Establecimiento"
        verbose_name_plural = "Gestiones de Establecimientos"
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Gestión {self.id} - {self.establecimiento.nombre}"

class SubtareaGestion(models.Model):
    gestion = models.ForeignKey(GestionEstablecimiento, on_delete=models.CASCADE, related_name='subtareas')
    titulo = models.CharField(max_length=200)
    completada = models.BooleanField(default=False)
    fecha_completada = models.DateTimeField(null=True, blank=True)
    comentarios = models.TextField(blank=True)

    class Meta:
        verbose_name = "Subtarea de Gestión"
        verbose_name_plural = "Subtareas de Gestión"
        ordering = ['id']

    def __str__(self):
        return self.titulo

class AdjuntoGestion(models.Model):
    gestion = models.ForeignKey(GestionEstablecimiento, on_delete=models.CASCADE, related_name='adjuntos')
    archivo = models.FileField(upload_to='gestiones_ejecutivos/')
    nombre = models.CharField(max_length=255)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

class HistorialGestion(models.Model):
    gestion = models.ForeignKey(GestionEstablecimiento, on_delete=models.CASCADE, related_name='historial')
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    accion = models.CharField(max_length=255)
    fecha = models.DateTimeField(auto_now_add=True)
    detalles = models.TextField(blank=True)

    class Meta:
        verbose_name = "Historial de Gestión"
        verbose_name_plural = "Historiales de Gestiones"
        ordering = ['-fecha']
