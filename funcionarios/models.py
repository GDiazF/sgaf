from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _
import re


def validate_rut(rut):
    """Valida formato y dígito verificador de RUT chileno"""
    # Formato esperado: 12345678-9
    pattern = r'^\d{7,8}-[\dkK]$'
    if not re.match(pattern, rut):
        raise ValidationError(_("RUT inválido. Usa el formato 12345678-9"))
    
    # Validar dígito verificador
    rut_sin_dv = rut[:-2]
    dv = rut[-1].upper()
    
    suma = 0
    multiplo = 2
    for r in reversed(rut_sin_dv):
        suma += int(r) * multiplo
        multiplo = multiplo + 1 if multiplo < 7 else 2
    
    dv_calculado = 11 - (suma % 11)
    if dv_calculado == 11:
        dv_esperado = '0'
    elif dv_calculado == 10:
        dv_esperado = 'K'
    else:
        dv_esperado = str(dv_calculado)
    
    if dv != dv_esperado:
        raise ValidationError(_("Dígito verificador de RUT inválido"))


class Subdireccion(models.Model):
    """Subdirección - Nivel superior de la jerarquía organizacional"""
    nombre = models.CharField("Nombre", max_length=120, unique=True)
    piso = models.PositiveSmallIntegerField("Piso", default=1)
    activo = models.BooleanField("Activo", default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subdirección"
        verbose_name_plural = "Subdirecciones"
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre


class Departamento(models.Model):
    """Departamento - Pertenece a una Subdirección"""
    subdireccion = models.ForeignKey(
        Subdireccion,
        on_delete=models.CASCADE,
        related_name="departamentos",
        verbose_name="Subdirección"
    )
    nombre = models.CharField("Nombre", max_length=120)
    activo = models.BooleanField("Activo", default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"
        unique_together = ("subdireccion", "nombre")
        ordering = ["subdireccion__nombre", "nombre"]

    def __str__(self):
        return f"{self.subdireccion.nombre} / {self.nombre}"


class Unidad(models.Model):
    """Unidad - Pertenece a un Departamento"""
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.CASCADE,
        related_name="unidades",
        verbose_name="Departamento"
    )
    nombre = models.CharField("Nombre", max_length=120)
    activo = models.BooleanField("Activo", default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Unidad"
        verbose_name_plural = "Unidades"
        unique_together = ("departamento", "nombre")
        ordering = ["departamento__subdireccion__nombre", "departamento__nombre", "nombre"]

    def __str__(self):
        return f"{self.departamento.subdireccion.nombre} / {self.departamento.nombre} / {self.nombre}"


class Funcionario(models.Model):
    """Funcionario - Empleado del SLEP"""
    # Datos personales
    rut = models.CharField(
        "RUT",
        max_length=12,
        unique=True,
        validators=[validate_rut],
        help_text="Formato: 12345678-9"
    )
    nombre_funcionario = models.CharField("Nombre Completo", max_length=180)
    
    # Datos de contacto
    anexo = models.CharField(
        "Anexo",
        max_length=10,
        blank=True,
        default="",
        help_text="Número de anexo telefónico"
    )
    numero_publico = models.CharField(
        "Número Público",
        max_length=32,
        editable=False,
        blank=True,
        help_text="Se calcula automáticamente: 227263 + anexo"
    )
    
    # Ubicación organizacional
    subdireccion = models.ForeignKey(
        Subdireccion,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="funcionarios",
        verbose_name="Subdirección"
    )
    departamento = models.ForeignKey(
        Departamento,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="funcionarios",
        verbose_name="Departamento"
    )
    unidad = models.ForeignKey(
        Unidad,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="funcionarios",
        verbose_name="Unidad"
    )
    
    # Información laboral
    cargo = models.CharField("Cargo", max_length=120, blank=True, default="")
    estado = models.BooleanField("Activo", default=True)
    
    # Auditoría
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Funcionario"
        verbose_name_plural = "Funcionarios"
        ordering = ["nombre_funcionario"]
        indexes = [
            models.Index(fields=['rut']),
            models.Index(fields=['nombre_funcionario']),
            models.Index(fields=['anexo']),
        ]

    def __str__(self):
        return f"{self.nombre_funcionario} ({self.rut})"

    def clean(self):
        """Validaciones del modelo"""
        # Validar que anexo solo contenga números
        if self.anexo and not self.anexo.isdigit():
            raise ValidationError({"anexo": _("El anexo solo puede contener números.")})

        # Validar coherencia jerárquica: Departamento debe pertenecer a Subdirección
        if self.departamento and self.subdireccion:
            if self.departamento.subdireccion_id != self.subdireccion_id:
                raise ValidationError({
                    "departamento": _("El departamento no pertenece a la subdirección seleccionada.")
                })

        # Validar coherencia jerárquica: Unidad debe pertenecer a Departamento
        if self.unidad:
            if not self.departamento:
                raise ValidationError({
                    "unidad": _("Debes seleccionar un departamento primero.")
                })
            if self.unidad.departamento_id != self.departamento_id:
                raise ValidationError({
                    "unidad": _("La unidad no pertenece al departamento seleccionado.")
                })

    def save(self, *args, **kwargs):
        """Guardar con lógica adicional"""
        # Si está inactivo, limpiar anexo
        if not self.estado:
            self.anexo = ""
        
        # Validar antes de guardar
        self.full_clean()
        
        # Calcular número público
        self.numero_publico = f"227263{self.anexo}" if self.anexo else ""
        
        super().save(*args, **kwargs)
