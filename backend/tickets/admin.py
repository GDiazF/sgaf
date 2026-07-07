from django.contrib import admin
from .models import Ticket, TicketCategory, TicketAttachment, TicketMessage, TicketHistory, SupportAgent

@admin.register(TicketCategory)
class TicketCategoryAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    search_fields = ('nombre',)

class TicketAttachmentInline(admin.TabularInline):
    model = TicketAttachment
    extra = 0

class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 1

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('correlativo', 'titulo', 'categoria', 'area_destino', 'prioridad', 'estado', 'creado_por', 'fecha_creacion')
    list_filter = ('estado', 'prioridad', 'categoria', 'area_destino', 'fecha_creacion')
    search_fields = ('correlativo', 'titulo', 'descripcion', 'creado_por__username')
    readonly_fields = ('correlativo', 'fecha_creacion', 'fecha_actualizacion')
    inlines = [TicketAttachmentInline, TicketMessageInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('correlativo', 'titulo', 'descripcion', 'categoria', 'area_destino')
        }),
        ('Estado y Prioridad', {
            'fields': ('prioridad', 'estado', 'asignado_a')
        }),
        ('Fechas y Auditoría', {
            'fields': ('creado_por', 'fecha_creacion', 'fecha_actualizacion', 'fecha_resolucion'),
            'classes': ('collapse',)
        }),
    )

@admin.register(SupportAgent)
class SupportAgentAdmin(admin.ModelAdmin):
    list_display = ('user', 'area', 'activo', 'recibe_notificaciones')
    list_filter = ('activo', 'area')
    search_fields = ('user__username', 'area__nombre')

@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'autor', 'fecha', 'es_sistema')
    list_filter = ('es_sistema', 'fecha')

@admin.register(TicketHistory)
class TicketHistoryAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'usuario', 'campo_modificado', 'fecha')
    list_filter = ('fecha', 'campo_modificado')
