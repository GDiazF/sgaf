from django.contrib import admin
from .models import LoginBackgroundImage, LoginBackgroundConfig


@admin.register(LoginBackgroundImage)
class LoginBackgroundImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'activa', 'orden', 'establecimiento', 'fecha_inicio', 'fecha_fin', 'created_at')
    list_filter = ('activa', 'establecimiento')
    search_fields = ('titulo',)
    ordering = ('orden', 'id')


@admin.register(LoginBackgroundConfig)
class LoginBackgroundConfigAdmin(admin.ModelAdmin):
    list_display = ('rotation_seconds', 'updated_at', 'updated_by')
