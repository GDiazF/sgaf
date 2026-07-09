from django.contrib import admin
from django.utils.timezone import now
from .models import SolicitudARCO

@admin.register(SolicitudARCO)
class SolicitudARCOAdmin(admin.ModelAdmin):
    list_display = ('id', 'solicitante', 'tipo_derecho', 'campo', 'estado', 'fecha_solicitud', 'fecha_resolucion', 'resuelto_por')
    list_filter = ('estado', 'tipo_derecho', 'fecha_solicitud')
    search_fields = ('solicitante__nombre_funcionario', 'solicitante__rut', 'justificacion')
    readonly_fields = ('fecha_solicitud', 'fecha_resolucion', 'resuelto_por')
    
    fieldsets = (
        ('Información de la Solicitud', {
            'fields': ('solicitante', 'tipo_derecho', 'estado', 'fecha_solicitud')
        }),
        ('Detalle de Rectificación', {
            'fields': ('campo', 'valor_anterior', 'valor_propuesto'),
            'description': 'Solo aplicable si el tipo de derecho es Rectificación.'
        }),
        ('Respaldos y Justificación', {
            'fields': ('justificacion', 'archivo_respaldo')
        }),
        ('Resolución', {
            'fields': ('fecha_resolucion', 'resuelto_por', 'motivo_rechazo')
        }),
    )

    def save_model(self, request, obj, form, change):
        # Si se está resolviendo la solicitud (cambiando estado de PENDIENTE a APROBADA o RECHAZADA)
        if change and 'estado' in form.changed_data:
            if obj.estado in ['APROBADA', 'RECHAZADA']:
                obj.fecha_resolucion = now()
                obj.resuelto_por = request.user
                
                # Si se aprueba y es de tipo RECTIFICACION, aplicar automáticamente el cambio
                if obj.estado == 'APROBADA' and obj.tipo_derecho == 'RECTIFICACION':
                    funcionario = obj.solicitante
                    if obj.campo and hasattr(funcionario, obj.campo):
                        setattr(funcionario, obj.campo, obj.valor_propuesto)
                        funcionario.save()
                        
        super().save_model(request, obj, form, change)
