from django.db import models

class BiometricoConfig(models.Model):
    url = models.CharField(max_length=255, default='http://52.2.77.197:8081')
    username = models.CharField(max_length=100, default='admin')
    password = models.CharField(max_length=100, default='admin')
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super(BiometricoConfig, self).save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    class Meta:
        verbose_name = 'Configuración Biométrico'
        verbose_name_plural = 'Configuraciones Biométrico'

class BiometricoArea(models.Model):
    area_code = models.CharField(max_length=100, unique=True, primary_key=True)
    internal_id = models.IntegerField(null=True, blank=True) # ID real en la base de datos de BioTime
    area_name = models.CharField(max_length=255)
    last_sync = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Establecimiento Biométrico'
        verbose_name_plural = 'Establecimientos Biométrico'
        ordering = ['area_name']

class BiometricoUsuario(models.Model):
    emp_code = models.CharField(max_length=100, unique=True, primary_key=True)
    first_name = models.CharField(max_length=255, null=True, blank=True)
    last_name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    employee_area = models.CharField(max_length=255, null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    last_sync = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Usuario Biométrico'
        verbose_name_plural = 'Usuarios Biométrico'
        ordering = ['first_name', 'last_name']

class BiometricoTerminal(models.Model):
    terminal_code = models.CharField(max_length=100, unique=True, primary_key=True)
    terminal_name = models.CharField(max_length=255, null=True, blank=True)
    raw_data = models.JSONField(default=dict)
    last_sync = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Terminal Biométrico'
        verbose_name_plural = 'Terminales Biométrico'
        ordering = ['terminal_name']
