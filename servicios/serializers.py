from rest_framework import serializers
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago, RecepcionConforme, HistorialRecepcionConforme, CDP, TipoEntrega, FacturaAdquisicion
from establecimientos.serializers import EstablecimientoSerializer

class TipoProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoProveedor
        fields = '__all__'

class ProveedorSerializer(serializers.ModelSerializer):
    tipo_proveedor_nombre = serializers.ReadOnlyField(source='tipo_proveedor.nombre')
    
    class Meta:
        model = Proveedor
        fields = '__all__'

class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = '__all__'

class ServicioSerializer(serializers.ModelSerializer):
    # Read-only fields for detailed display
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    establecimiento_nombre = serializers.ReadOnlyField(source='establecimiento.nombre')
    tipo_documento_nombre = serializers.ReadOnlyField(source='tipo_documento.nombre')

    class Meta:
        model = Servicio
        fields = '__all__'
        extra_kwargs = {
            'fecha_creacion': {'read_only': True},
            'fecha_actualizacion': {'read_only': True}
        }

class RegistroPagoSerializer(serializers.ModelSerializer):
    servicio_detalle = serializers.SerializerMethodField()
    establecimiento_nombre = serializers.ReadOnlyField(source='establecimiento.nombre')
    recepcion_conforme_folio = serializers.ReadOnlyField(source='recepcion_conforme.folio')

    class Meta:
        model = RegistroPago
        fields = '__all__'

    def get_servicio_detalle(self, obj):
        return f"{obj.servicio.proveedor.nombre} - Cliente: {obj.servicio.numero_cliente}"

class HistorialRecepcionConformeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialRecepcionConforme
        fields = '__all__'

class RecepcionConformeSerializer(serializers.ModelSerializer):
    registros = RegistroPagoSerializer(many=True, read_only=True)
    registros_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    tipo_proveedor_nombre = serializers.ReadOnlyField(source='proveedor.tipo_proveedor.nombre')
    grupo_firmante_nombre = serializers.ReadOnlyField(source='grupo_firmante.nombre')
    firmante_nombre = serializers.ReadOnlyField(source='firmante.nombre_funcionario')
    historial = HistorialRecepcionConformeSerializer(many=True, read_only=True)

    class Meta:
        model = RecepcionConforme
        fields = '__all__'
        read_only_fields = ('fecha_emision',)

    def validate(self, data):
        registros_ids = data.get('registros_ids', [])
        proveedor = data.get('proveedor')
        
        # If we are creating (no instance)
        if not self.instance:
            if registros_ids:
                registros = RegistroPago.objects.filter(id__in=registros_ids)
                if len(registros) != len(registros_ids):
                    raise serializers.ValidationError("Algunos registros de pago no fueron encontrados.")
                
                for reg in registros:
                    if reg.recepcion_conforme:
                        raise serializers.ValidationError(f"El pago {reg.nro_documento} ya está asignado a la RC {reg.recepcion_conforme.folio}")
                    if reg.servicio.proveedor != proveedor:
                        if reg.servicio.proveedor_id != proveedor.id:
                            raise serializers.ValidationError(f"El pago {reg.nro_documento} no pertenece al proveedor seleccionada.")
        
        return data

    def create(self, validated_data):
        registros_ids = validated_data.pop('registros_ids', [])
        rc = super().create(validated_data)
        
        # Log Creation
        user = self.context['request'].user.username if 'request' in self.context else 'Sistema'
        HistorialRecepcionConforme.objects.create(
            recepcion_conforme=rc,
            accion='CREACION',
            detalle=f"Documento creado con {len(registros_ids)} pagos asignados.",
            usuario=user
        )
        
        if registros_ids:
            registros = RegistroPago.objects.filter(id__in=registros_ids)
            registros.update(recepcion_conforme=rc)
            
        return rc

    def update(self, instance, validated_data):
        if instance.estado == 'ANULADA':
            raise serializers.ValidationError("No se puede editar una Recepción Conforme anulada.")

        registros_ids = validated_data.pop('registros_ids', None)
        user = self.context['request'].user.username if 'request' in self.context else 'Sistema'
        
        # Track Observation changes
        if 'observaciones' in validated_data and validated_data['observaciones'] != instance.observaciones:
            HistorialRecepcionConforme.objects.create(
                recepcion_conforme=instance,
                accion='MODIFICACION',
                detalle="Se actualizaron las observaciones.",
                usuario=user
            )

        rc = super().update(instance, validated_data)
        
        if registros_ids is not None:
             # Calculate changes
             current_ids = set(instance.registros.values_list('id', flat=True))
             new_ids = set(registros_ids)
             
             removed_ids = current_ids - new_ids
             added_ids = new_ids - current_ids
             
             # 1. Unassign removed
             if removed_ids:
                 removed_qs = instance.registros.filter(id__in=removed_ids)
                 count_removed = removed_qs.count()
                 removed_docs = ", ".join([str(r.nro_documento) for r in removed_qs])
                 
                 removed_qs.update(recepcion_conforme=None)
                 HistorialRecepcionConforme.objects.create(
                    recepcion_conforme=instance,
                    accion='MODIFICACION_PAGOS',
                    detalle=f"Se quitaron {count_removed} pagos del documento: {removed_docs}",
                    usuario=user
                 )
             
             # 2. Assign new
             if added_ids:
                 new_registros = RegistroPago.objects.filter(id__in=added_ids)
                 
                 added_docs = []
                 for reg in new_registros:
                     if reg.recepcion_conforme and reg.recepcion_conforme != instance:
                         raise serializers.ValidationError(f"El pago {reg.nro_documento} ya pertenece a otra RC.")
                     if reg.servicio.proveedor_id != instance.proveedor_id:
                         raise serializers.ValidationError(f"El pago {reg.nro_documento} no pertenece al proveedor de esta RC.")
                     added_docs.append(str(reg.nro_documento))
                
                 new_registros.update(recepcion_conforme=instance)
                 HistorialRecepcionConforme.objects.create(
                    recepcion_conforme=instance,
                    accion='MODIFICACION_PAGOS',
                    detalle=f"Se agregaron {len(added_ids)} pagos al documento: {', '.join(added_docs)}",
                    usuario=user
                 )
             
        return rc

class CDPSerializer(serializers.ModelSerializer):
    class Meta:
        model = CDP
        fields = '__all__'
        read_only_fields = ['fecha_subida']

class TipoEntregaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEntrega
        fields = '__all__'

class FacturaAdquisicionSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    proveedor_rut = serializers.ReadOnlyField(source='proveedor.rut')
    establecimientos_detalle = EstablecimientoSerializer(source='establecimientos', many=True, read_only=True)
    tipo_entrega_nombre = serializers.ReadOnlyField(source='tipo_entrega.nombre')
    grupo_firmante_nombre = serializers.ReadOnlyField(source='grupo_firmante.nombre')
    firmante_nombre = serializers.ReadOnlyField(source='firmante.nombre_funcionario')

    class Meta:
        model = FacturaAdquisicion
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
