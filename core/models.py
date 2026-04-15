from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

def user_avatar_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/avatars/user_<id>/<filename>
    return f'avatars/user_{instance.user.id}/{filename}'

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to=user_avatar_path, null=True, blank=True)
    
    def __str__(self):
        return f"Perfil de {self.user.username}"

@receiver(post_save, sender=User)
def handle_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    else:
        # Use get_or_create to handle existing users without profiles
        Profile.objects.get_or_create(user=instance)

class LinkInteres(models.Model):
    TIPO_CHOICES = [
        ('LINK', 'Link de Interés'),
        ('RED_SOCIAL', 'Red Social'),
    ]
    
    titulo = models.CharField(max_length=100, verbose_name="Título")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='LINK', verbose_name="Tipo")
    url = models.URLField(verbose_name="URL")
    icono = models.CharField(max_length=50, default='Link', help_text="Nombre del icono de Lucide (ej: Link, Globe, Box)")
    descripcion = models.TextField(blank=True, null=True, verbose_name="Descripción")
    orden = models.IntegerField(default=0, verbose_name="Orden de visualización")
    activo = models.BooleanField(default=True, verbose_name="Activo")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Link de Interés'
        verbose_name_plural = 'Links de Interés'
        ordering = ['orden', 'titulo']

    def __str__(self):
        return self.titulo
