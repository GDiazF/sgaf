from django.contrib import admin

from notificaciones.models import FuenteViva, JobProgramado, Notificacion, TipoNotificacion


@admin.register(TipoNotificacion)
class TipoNotificacionAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'modulo',
        'evento',
        'nombre',
        'enviar_campana',
        'enviar_email',
        'activo',
    )
    list_filter = ('modulo', 'activo', 'enviar_campana', 'enviar_email')
    search_fields = ('codigo', 'nombre', 'modulo', 'evento')
    filter_horizontal = ('grupos', 'roles', 'usuarios')


@admin.register(FuenteViva)
class FuenteVivaAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'handler_key', 'activo', 'orden', 'proposito_operativo')
    list_filter = ('activo',)
    search_fields = ('codigo', 'nombre', 'handler_key')
    filter_horizontal = ('grupos', 'roles', 'usuarios')


@admin.register(JobProgramado)
class JobProgramadoAdmin(admin.ModelAdmin):
    list_display = (
        'codigo',
        'nombre',
        'handler_key',
        'hora',
        'activo',
        'ultima_fecha_corrida',
        'ultima_ejecucion',
    )
    list_filter = ('activo',)
    search_fields = ('codigo', 'nombre', 'handler_key')


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'usuario', 'modulo', 'evento', 'leida', 'fecha_creacion')
    list_filter = ('modulo', 'leida', 'tipo')
    search_fields = ('titulo', 'mensaje', 'usuario__username')
