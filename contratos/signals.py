from django.db.models.signals import post_save, post_delete, pre_save, m2m_changed
from django.dispatch import receiver
from .models import Contrato, DocumentoContrato, HistorialContrato
from servicios.models import FacturaAdquisicion

@receiver(pre_save, sender=Contrato)
def capture_old_contrato(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_instance = Contrato.objects.get(pk=instance.pk)
        except Contrato.DoesNotExist:
            instance._old_instance = None
    else:
        instance._old_instance = None

@receiver(post_save, sender=Contrato)
def log_contrato_save(sender, instance, created, **kwargs):
    accion = 'CREACION' if created else 'MODIFICACION'
    if created:
        detalle = f"Se ha creado el contrato {instance.codigo_mercado_publico}."
    else:
        old_instance = getattr(instance, '_old_instance', None)
        if old_instance:
            changes = []
            # ALL fields coverage
            fields = {
                'codigo_mercado_publico': 'Código MP',
                'descripcion': 'Descripción',
                'proceso': 'Tipo de Proceso',
                'estado': 'Estado',
                'categoria': 'Categoría',
                'orientacion': 'Orientación',
                'proveedor': 'Proveedor',
                'tipo_oc': 'Tipo OC',
                'nro_oc': 'Nº OC',
                'cdp': 'CDP',
                'monto_total': 'Monto Total',
                'fecha_adjudicacion': 'Fecha Adjudicación',
                'fecha_inicio': 'Fecha Inicio',
                'fecha_termino': 'Fecha Término',
            }
            
            for field, label in fields.items():
                old_val = getattr(old_instance, field)
                new_val = getattr(instance, field)
                if old_val != new_val:
                    # str() handles both simple types and ForeignKeys models
                    changes.append(f"{label}: se cambió '{old_val}' por '{new_val}'")
            
            if changes:
                detalle = f"Se modificó: {', '.join(changes)}"
            else:
                detalle = "Se guardó el contrato sin cambios detectados en campos principales."
        else:
            detalle = f"Se ha modificado el contrato {instance.codigo_mercado_publico}."

    HistorialContrato.objects.create(
        contrato=instance,
        accion=accion,
        detalle=detalle
    )

@receiver(m2m_changed, sender=Contrato.establecimientos.through)
def log_contrato_establecimientos_change(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"]:
        from establecimientos.models import Establecimiento
        establecimientos = list(Establecimiento.objects.filter(pk__in=pk_set).values_list('nombre', flat=True))
        nombres = ", ".join(establecimientos)
        
        accion_label = "asignó" if action == "post_add" else "quitó"
        detalle = f"Se {accion_label} los establecimientos: {nombres}"
        
        HistorialContrato.objects.create(
            contrato=instance,
            accion='MODIFICACION_ESTABLECIMIENTOS',
            detalle=detalle
        )

@receiver(post_save, sender=DocumentoContrato)
def log_documento_save(sender, instance, created, **kwargs):
    if created:
        HistorialContrato.objects.create(
            contrato=instance.contrato,
            accion='SUBIDA_ARCHIVO',
            detalle=f"Se ha subido el archivo: {instance.nombre}"
        )

@receiver(post_delete, sender=DocumentoContrato)
def log_documento_delete(sender, instance, **kwargs):
    HistorialContrato.objects.create(
        contrato=instance.contrato,
        accion='ELIMINACION_ARCHIVO',
        detalle=f"Se ha eliminado el archivo: {instance.nombre}"
    )

@receiver(pre_save, sender=FacturaAdquisicion)
def capture_old_recepcion(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_instance = FacturaAdquisicion.objects.get(pk=instance.pk)
        except FacturaAdquisicion.DoesNotExist:
            instance._old_instance = None
    else:
        instance._old_instance = None

@receiver(post_save, sender=FacturaAdquisicion)
def log_recepcion_save(sender, instance, created, **kwargs):
    if instance.contrato:
        if created:
            HistorialContrato.objects.create(
                contrato=instance.contrato,
                accion='RECEPCION_CREADA',
                detalle=f"Se ha registrado una nueva recepción (Folio: {instance.folio}) vinculada a este contrato."
            )
        else:
            old_instance = getattr(instance, '_old_instance', None)
            changes = []
            if old_instance:
                # ALL relevant fields coverage
                fields = {
                    'nro_factura': 'Nº Factura',
                    'nro_oc': 'Nº OC',
                    'cdp': 'CDP',
                    'periodo': 'Periodo',
                    'descripcion': 'Glosa',
                    'fecha_recepcion': 'Fecha Recepción',
                    'tipo_entrega': 'Tipo de Entrega',
                    'total_neto': 'Monto Neto',
                    'iva': 'IVA',
                    'total_pagar': 'Total a Pagar',
                }
                for field, label in fields.items():
                    old_val = getattr(old_instance, field)
                    new_val = getattr(instance, field)
                    if old_val != new_val:
                        changes.append(f"{label}: se cambió '{old_val}' por '{new_val}'")

            if changes:
                detalle = f"Se ha modificado la recepción {instance.folio}: {', '.join(changes)}"
            else:
                detalle = f"Se ha modificado la recepción {instance.folio}."

            HistorialContrato.objects.create(
                contrato=instance.contrato,
                accion='RECEPCION_MODIFICADA',
                detalle=detalle
            )

@receiver(m2m_changed, sender=FacturaAdquisicion.establecimientos.through)
def log_recepcion_establecimientos_change(sender, instance, action, pk_set, **kwargs):
    if action in ["post_add", "post_remove"] and instance.contrato:
        from establecimientos.models import Establecimiento
        establecimientos = list(Establecimiento.objects.filter(pk__in=pk_set).values_list('nombre', flat=True))
        nombres = ", ".join(establecimientos)
        
        accion_label = "asignó" if action == "post_add" else "quitó"
        detalle = f"En la recepción {instance.folio}, se {accion_label} los establecimientos: {nombres}"
        
        HistorialContrato.objects.create(
            contrato=instance.contrato,
            accion='RECEPCION_MOD_EST',
            detalle=detalle
        )

@receiver(post_delete, sender=FacturaAdquisicion)
def log_recepcion_delete(sender, instance, **kwargs):
    if instance.contrato:
        HistorialContrato.objects.create(
            contrato=instance.contrato,
            accion='RECEPCION_ELIMINADA',
            detalle=f"Se ha eliminado la recepción vinculada {instance.folio}."
        )
