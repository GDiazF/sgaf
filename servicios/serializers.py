from rest_framework import serializers
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago
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

    class Meta:
        model = RegistroPago
        fields = '__all__'

    def get_servicio_detalle(self, obj):
        return f"{obj.servicio.proveedor.nombre} - Cliente: {obj.servicio.numero_cliente}"
