from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


User = get_user_model()


def login_background_upload_path(instance, filename):
    return f'personalizacion/login/backgrounds/{filename}'


class LoginBackgroundImageQuerySet(models.QuerySet):
    def active_for_public_login(self):
        now = timezone.now()
        return self.filter(
            activa=True,
        ).filter(
            models.Q(fecha_inicio__isnull=True) | models.Q(fecha_inicio__lte=now)
        ).filter(
            models.Q(fecha_fin__isnull=True) | models.Q(fecha_fin__gte=now)
        ).order_by('orden', 'id')


class LoginBackgroundImage(models.Model):
    titulo = models.CharField(max_length=150)
    imagen = models.ImageField(upload_to=login_background_upload_path)
    activa = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)
    establecimiento = models.ForeignKey(
        'establecimientos.Establecimiento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='login_background_images',
    )
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_login_background_images',
    )

    objects = LoginBackgroundImageQuerySet.as_manager()

    class Meta:
        ordering = ['orden', 'id']
        indexes = [
            models.Index(fields=['activa', 'orden']),
            models.Index(fields=['establecimiento']),
            models.Index(fields=['fecha_inicio', 'fecha_fin']),
        ]
        verbose_name = 'Imagen de fondo de login'
        verbose_name_plural = 'Imagenes de fondo de login'

    def clean(self):
        if self.fecha_inicio and self.fecha_fin and self.fecha_inicio > self.fecha_fin:
            raise ValidationError({'fecha_fin': 'La fecha fin debe ser mayor o igual a fecha inicio.'})

    def __str__(self):
        return self.titulo


class LoginBackgroundConfig(models.Model):
    rotation_seconds = models.PositiveIntegerField(default=8)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='updated_login_background_configs',
    )

    class Meta:
        verbose_name = 'Configuracion de fondos login'
        verbose_name_plural = 'Configuracion de fondos login'

    def __str__(self):
        return f'Rotacion cada {self.rotation_seconds}s'
