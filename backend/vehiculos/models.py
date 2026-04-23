from django.db import models

class Vehiculo(models.Model):
    marca = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    patente = models.CharField(max_length=10, unique=True)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Vehículo"
        verbose_name_plural = "Vehículos"
        ordering = ['marca', 'modelo']

    def __str__(self):
        return f"{self.marca} {self.modelo} ({self.patente})"


class RegistroMensual(models.Model):
    MESES = [
        (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
        (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
        (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre')
    ]

    vehiculo = models.ForeignKey(
        Vehiculo, 
        on_delete=models.CASCADE, 
        related_name='registros',
        verbose_name="Vehículo"
    )
    anio = models.IntegerField(verbose_name="Año")
    mes = models.IntegerField(choices=MESES, verbose_name="Mes")
    
    kilometros_recorridos = models.IntegerField(verbose_name="Kilómetros mensuales recorridos", default=0)
    unidad_monetaria = models.CharField(max_length=10, default="Pesos", verbose_name="Unidad monetaria")
    
    # Financials
    gasto_bencina = models.IntegerField(verbose_name="Monto mensual del gasto en bencina", default=0)
    gasto_peajes = models.IntegerField(verbose_name="Monto mensual del gasto en peajes", default=0)
    gasto_seguros = models.IntegerField(verbose_name="Monto mensual pagado en seguros", default=0)

    class Meta:
        ordering = ['-anio', '-mes', 'vehiculo__patente']
        unique_together = ['anio', 'mes', 'vehiculo']
        verbose_name = "Registro Mensual de Gastos"
        verbose_name_plural = "Registros Mensuales de Gastos"

    def __str__(self):
        return f"{self.vehiculo.patente} - {self.get_mes_display()} {self.anio}"
