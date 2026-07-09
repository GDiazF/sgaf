from django.contrib import admin
from .models import Profile, LinkInteres, DocumentAsset, ReportConfiguration, AuditLog, BreachReport, CiberseguridadPlan, CiberseguridadCapacitacion

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')

@admin.register(LinkInteres)
class LinkInteresAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'url', 'orden', 'activo', 'fecha_creacion')
    list_editable = ('orden', 'activo')
    search_fields = ('titulo', 'url', 'descripcion')
    list_filter = ('tipo', 'activo')

@admin.register(DocumentAsset)
class DocumentAssetAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'fecha_subida')
    search_fields = ('nombre', 'descripcion')

@admin.register(ReportConfiguration)
class ReportConfigurationAdmin(admin.ModelAdmin):
    list_display = ('report_type', 'logo_izquierdo', 'logo_derecho', 'color_primario')
    list_filter = ('report_type',)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'model_name', 'object_id', 'ip_address')
    list_filter = ('action', 'model_name', 'timestamp')
    search_fields = ('user__username', 'details', 'object_id')
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'details', 'ip_address', 'timestamp')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(BreachReport)
class BreachReportAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'fecha_descubrimiento', 'estado_csirt', 'notificado_agencia')
    list_filter = ('estado_csirt', 'notificado_agencia', 'tipo_amenaza', 'fecha_descubrimiento')
    search_fields = ('titulo', 'descripcion', 'medidas_mitigacion')

@admin.register(CiberseguridadPlan)
class CiberseguridadPlanAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tipo', 'fecha_proxima_revision', 'activo')
    list_filter = ('tipo', 'activo')
    search_fields = ('titulo',)

@admin.register(CiberseguridadCapacitacion)
class CiberseguridadCapacitacionAdmin(admin.ModelAdmin):
    list_display = ('nombre_campana', 'fecha_inicio', 'fecha_termino')
    search_fields = ('nombre_campana', 'descripcion')
