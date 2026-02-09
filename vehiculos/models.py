from django.db import models

class RegistroMensual(models.Model):
    MESES = [
        (1, 'Enero'), (2, 'Febrero'), (3, 'Marzo'), (4, 'Abril'),
        (5, 'Mayo'), (6, 'Junio'), (7, 'Julio'), (8, 'Agosto'),
        (9, 'Septiembre'), (10, 'Octubre'), (11, 'Noviembre'), (12, 'Diciembre')
    ]

    anio = models.IntegerField(verbose_name="Año")
    mes = models.IntegerField(choices=MESES, verbose_name="Mes")
    numero_vehiculos = models.IntegerField(verbose_name="Número de vehículos", default=0)
    kilometros_recorridos = models.IntegerField(verbose_name="Kilómetros mensuales recorridos", default=0)
    unidad_monetaria = models.CharField(max_length=10, default="Pesos", verbose_name="Unidad monetaria")
    
    # Financials
    gasto_bencina = models.IntegerField(verbose_name="Monto mensual del gasto en bencina", default=0)
    gasto_peajes = models.IntegerField(verbose_name="Monto mensual del gasto en peajes", default=0)
    gasto_seguros = models.IntegerField(verbose_name="Monto mensual pagado en seguros", default=0)

    class Meta:
        ordering = ['-anio', '-mes']
        unique_together = ['anio', 'mes']
        verbose_name = "Registro Mensual de Vehículos"
        verbose_name_plural = "Registros Mensuales de Vehículos"

    def __str__(self):
        return f"{self.get_mes_display()} {self.anio}"
