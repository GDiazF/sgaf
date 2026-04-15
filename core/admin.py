from django.contrib import admin
from .models import Profile, LinkInteres

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')

@admin.register(LinkInteres)
class LinkInteresAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'url', 'orden', 'activo', 'fecha_creacion')
    list_editable = ('orden', 'activo')
    search_fields = ('titulo', 'url', 'descripcion')
    list_filter = ('activo',)
