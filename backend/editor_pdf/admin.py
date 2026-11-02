from django.contrib import admin

from .models import CertificadoFuncionario, HerramientaPdf, PlantillaFirmaPdf


@admin.register(HerramientaPdf)
class HerramientaPdfAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'visible', 'orden')
    list_filter = ('categoria', 'visible')
    search_fields = ('nombre', 'slug')
    readonly_fields = ('slug', 'nombre', 'categoria', 'descripcion', 'orden')


@admin.register(PlantillaFirmaPdf)
class PlantillaFirmaPdfAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'actualizado_en')
    readonly_fields = ('actualizado_en',)


@admin.register(CertificadoFuncionario)
class CertificadoFuncionarioAdmin(admin.ModelAdmin):
    list_display = ('rut', 'valido_hasta', 'actualizado_en')
    readonly_fields = ('rut', 'password_cifrada', 'valido_hasta', 'actualizado_en')
