from django.contrib import admin
from .models import Procedimiento, TipoProcedimiento

@admin.register(TipoProcedimiento)
class TipoProcedimientoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'color', 'procedimiento_count')
    search_fields = ('nombre',)

    def procedimiento_count(self, obj):
        return obj.procedimientos.count()
    procedimiento_count.short_description = "N° de Procedimientos"

@admin.register(Procedimiento)
class ProcedimientoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'subdireccion', 'departamento', 'unidad', 'activo')
    list_filter = ('tipo', 'subdireccion', 'departamento', 'activo')
    search_fields = ('titulo', 'descripcion')
    readonly_fields = ('created_at', 'updated_at')
    
    def save_model(self, request, obj, form, change):
        if not obj.autor:
            obj.autor = request.user
        super().save_model(request, obj, form, change)
