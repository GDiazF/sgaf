from django.contrib import admin
from .models import (
    Subdireccion,
    Departamento,
    Unidad,
    Funcionario,
    Grupo,
    CalidadJuridica,
    Grado,
    Cargo,
)


@admin.register(CalidadJuridica)
class CalidadJuridicaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'creado_en')
    list_filter = ('activo',)
    search_fields = ('nombre',)
    ordering = ('nombre',)


@admin.register(Grado)
class GradoAdmin(admin.ModelAdmin):
    list_display = ('orden', 'nombre', 'activo', 'creado_en')
    list_display_links = ('nombre',)
    list_editable = ('orden', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)
    ordering = ('orden', 'nombre')


@admin.register(Cargo)
class CargoAdmin(admin.ModelAdmin):
    list_display = ('orden', 'nombre', 'activo', 'creado_en')
    list_display_links = ('nombre',)
    list_editable = ('orden', 'activo')
    list_filter = ('activo',)
    search_fields = ('nombre',)
    ordering = ('orden', 'nombre')

@admin.register(Grupo)
class GrupoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'jefe', 'es_firmante', 'activo', 'creado_en')
    list_filter = ('activo', 'es_firmante')
    search_fields = ('nombre', 'jefe__nombre_funcionario')
    ordering = ('nombre',)


@admin.register(Subdireccion)
class SubdireccionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'piso', 'activo', 'creado_en')
    list_filter = ('activo',)
    search_fields = ('nombre',)
    ordering = ('nombre',)


@admin.register(Departamento)
class DepartamentoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'subdireccion', 'activo', 'creado_en')
    list_filter = ('subdireccion', 'activo')
    search_fields = ('nombre', 'subdireccion__nombre')
    ordering = ('subdireccion__nombre', 'nombre')


@admin.register(Unidad)
class UnidadAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'departamento', 'get_subdireccion', 'activo', 'creado_en')
    list_filter = ('departamento__subdireccion', 'activo')
    search_fields = ('nombre', 'departamento__nombre', 'departamento__subdireccion__nombre')
    ordering = ('departamento__subdireccion__nombre', 'departamento__nombre', 'nombre')
    
    @admin.display(description='Subdirección', ordering='departamento__subdireccion__nombre')
    def get_subdireccion(self, obj):
        return obj.departamento.subdireccion.nombre


@admin.register(Funcionario)
class FuncionarioAdmin(admin.ModelAdmin):
    list_display = (
        'nombre_funcionario', 'rut', 'anexo', 'numero_publico',
        'get_subdireccion', 'get_departamento', 'get_unidad',
        'cargo', 'calidad_juridica', 'grado', 'estado'
    )
    list_filter = ('subdireccion', 'departamento', 'estado', 'calidad_juridica', 'grado')
    search_fields = (
        'nombre_funcionario', 'rut', 'anexo', 'numero_publico', 'cargo__nombre',
    )
    ordering = ('nombre_funcionario',)
    readonly_fields = ('numero_publico', 'creado_en', 'actualizado_en')
    autocomplete_fields = ('cargo', 'calidad_juridica', 'grado')
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('rut', 'nombre_funcionario')
        }),
        ('Contacto', {
            'fields': ('anexo', 'numero_publico')
        }),
        ('Ubicación Organizacional', {
            'fields': ('subdireccion', 'departamento', 'unidad')
        }),
        ('Información Laboral', {
            'fields': ('cargo', 'calidad_juridica', 'grado', 'estado', 'grupos')
        }),
        ('Auditoría', {
            'fields': ('creado_en', 'actualizado_en'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Subdirección', ordering='subdireccion__nombre')
    def get_subdireccion(self, obj):
        return obj.subdireccion.nombre if obj.subdireccion else '-'
    
    @admin.display(description='Departamento', ordering='departamento__nombre')
    def get_departamento(self, obj):
        return obj.departamento.nombre if obj.departamento else '-'
    
    @admin.display(description='Unidad', ordering='unidad__nombre')
    def get_unidad(self, obj):
        return obj.unidad.nombre if obj.unidad else '-'
