from django.db import models

class Remuneracion(models.Model):
    """Modelo dummy que permite a Django registrar automáticamente los 4 permisos estándar (add, change, delete, view)
    para el módulo de Tesorería en la Gestión de Roles."""
    class Meta:
        managed = False
        verbose_name = "Remuneración (Tesorería)"
        verbose_name_plural = "Remuneraciones (Tesorería)"


class MapeoBanco(models.Model):
    nombre = models.CharField(max_length=255, unique=True, verbose_name="Nombre Banco (como aparece en archivo)")
    codigo = models.CharField(max_length=10, verbose_name="Código Asignado")

    class Meta:
        verbose_name = "Mapeo de Banco"
        verbose_name_plural = "Mapeos de Bancos"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} -> {self.codigo}"


class MapeoMedioPago(models.Model):
    nombre = models.CharField(max_length=255, unique=True, verbose_name="Medio de Pago (como aparece en archivo)")
    codigo = models.CharField(max_length=10, verbose_name="Código Asignado")

    class Meta:
        verbose_name = "Mapeo de Medio de Pago"
        verbose_name_plural = "Mapeos de Medios de Pago"
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} -> {self.codigo}"


class MapeoBancoDirecto(models.Model):
    segmento = models.CharField(max_length=10, unique=True, verbose_name="Segmento/Código en archivo")
    codigo_completo = models.CharField(max_length=10, verbose_name="Código Banco Completo")

    class Meta:
        verbose_name = "Mapeo de Banco Directo"
        verbose_name_plural = "Mapeos de Bancos Directos"
        ordering = ['segmento']

    def __str__(self):
        return f"{self.segmento} -> {self.codigo_completo}"


class ValeVistaConfig(models.Model):
    clave = models.CharField(max_length=100, unique=True)
    valor = models.CharField(max_length=255)
    descripcion = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        verbose_name = "Configuración Vale Vista"
        verbose_name_plural = "Configuraciones Vale Vista"

    def __str__(self):
        return f"{self.clave}: {self.valor}"

