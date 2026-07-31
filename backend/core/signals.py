import os
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from core.utils.pdf_utils import compress_pdf

# Import models
from contratos.models import DocumentoContrato
from servicios.models import CDP, RecepcionConforme, RegistroPago
from vehiculos.models import VehiculoDocumento

logger = logging.getLogger(__name__)

@receiver(post_save, sender=RegistroPago)
def compress_pago_comprobante(sender, instance, created, **kwargs):
    if instance.comprobante:
        try:
            success = compress_pdf(instance.comprobante.path)
            if success:
                logger.info(f"Auto-compression successful for Pago Comprobante: {instance.id}")
        except Exception as e:
            logger.error(f"Error in auto-compression for Pago Comprobante {instance.id}: {str(e)}")

@receiver(post_save, sender=RecepcionConforme)
def compress_rc_document(sender, instance, created, **kwargs):
    # We check for archivo_escaneado (since EMITIDA status doesn't have it initially)
    if instance.archivo_escaneado:
        try:
            success = compress_pdf(instance.archivo_escaneado.path)
            if success:
                logger.info(f"Auto-compression successful for RC Doc: {instance.id}")
        except Exception as e:
            logger.error(f"Error in auto-compression for RC Doc {instance.id}: {str(e)}")

@receiver(post_save, sender=DocumentoContrato)
def compress_contrato_document(sender, instance, created, **kwargs):
    if created and instance.archivo:
        try:
            success = compress_pdf(instance.archivo.path)
            if success:
                logger.info(f"Auto-compression successful for Contrato Doc: {instance.id}")
        except Exception as e:
            logger.error(f"Error in auto-compression for Contrato Doc {instance.id}: {str(e)}")

@receiver(post_save, sender=CDP)
def compress_cdp_document(sender, instance, created, **kwargs):
    if created and instance.archivo:
        try:
            success = compress_pdf(instance.archivo.path)
            if success:
                logger.info(f"Auto-compression successful for CDP Doc: {instance.id}")
        except Exception as e:
            logger.error(f"Error in auto-compression for CDP Doc {instance.id}: {str(e)}")

@receiver(post_save, sender=VehiculoDocumento)
def compress_vehiculo_document(sender, instance, created, **kwargs):
    if created and instance.archivo:
        try:
            success = compress_pdf(instance.archivo.path)
            if success:
                logger.info(f"Auto-compression successful for Vehiculo Doc: {instance.id}")
        except Exception as e:
            logger.error(f"Error in auto-compression for Vehiculo Doc {instance.id}: {str(e)}")
