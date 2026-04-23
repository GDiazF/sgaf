from django.contrib import admin
from .models import RecursoReservable, SolicitudReserva, BloqueoHorario, ReservaSetting

@admin.register(RecursoReservable)
class RecursoReservableAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'tipo', 'ubicacion', 'activo')
    list_filter = ('tipo', 'activo')
    search_fields = ('nombre',)

@admin.register(SolicitudReserva)
class SolicitudReservaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'recurso', 'nombre_funcionario', 'fecha_inicio', 'estado')
    list_filter = ('estado', 'recurso')
    search_fields = ('titulo', 'nombre_funcionario', 'email_contacto')

@admin.register(BloqueoHorario)
class BloqueoHorarioAdmin(admin.ModelAdmin):
    list_display = ('recurso', 'modo', 'fecha_inicio', 'hora_inicio', 'hora_fin')
    list_filter = ('modo', 'recurso')

@admin.register(ReservaSetting)
class ReservaSettingAdmin(admin.ModelAdmin):
    list_display = ('hora_inicio', 'hora_fin')
    
    def has_add_permission(self, request):
        # Evitar crear múltiples configuraciones
        if self.model.objects.count() >= 1:
            return False
        return super().has_add_permission(request)
