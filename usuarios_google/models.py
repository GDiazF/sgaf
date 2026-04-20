from django.db import models

class GoogleOrgUnit(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Nombre de la Unidad/Establecimiento")
    path = models.CharField(max_length=500, blank=True, null=True, verbose_name="Ruta Completa (Opcional)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Unidad Organizativa Google"
        verbose_name_plural = "Unidades Organizativas Google"

class GoogleUser(models.Model):
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField(unique=True)
    org_unit_path = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(max_length=50, blank=True, null=True)
    last_sign_in = models.CharField(max_length=100, blank=True, null=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    employee_type = models.CharField(max_length=100, blank=True, null=True)
    employee_title = models.CharField(max_length=200, blank=True, null=True)
    department = models.CharField(max_length=200, blank=True, null=True)
    cost_center = models.CharField(max_length=100, blank=True, null=True)
    
    def __str__(self):
        return f"{self.email} ({self.first_name} {self.last_name})"

class GoogleUploadLog(models.Model):
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_name = models.CharField(max_length=255)
    total_records = models.IntegerField()
    
    def __str__(self):
        return f"{self.file_name} - {self.uploaded_at}"
