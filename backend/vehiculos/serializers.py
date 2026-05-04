from rest_framework import serializers
from .models import RegistroMensual, Vehiculo, VehiculoDocumento, VehiculoTipoDocumento, VehiculoTipoCombustible

class VehiculoTipoCombustibleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiculoTipoCombustible
        fields = '__all__'

class VehiculoTipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiculoTipoDocumento
        fields = '__all__'

class VehiculoDocumentoSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')
    tipo_icono = serializers.ReadOnlyField(source='tipo.icono')
    tipo_color = serializers.ReadOnlyField(source='tipo.color')
    
    class Meta:
        model = VehiculoDocumento
        fields = [
            'id', 'vehiculo', 'tipo', 'tipo_nombre', 'tipo_icono', 'tipo_color',
            'archivo', 'fecha_vencimiento', 'observaciones', 'dias_aviso', 
            'ultima_notificacion', 'creado_en'
        ]
        read_only_fields = ['ultima_notificacion', 'creado_en']

class VehiculoSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    documentos = VehiculoDocumentoSerializer(many=True, read_only=True)

    class Meta:
        model = Vehiculo
        fields = [
            'id', 'marca', 'modelo', 'anio', 'patente', 
            'tipo_combustible', 'nro_chasis', 'nro_motor', 'imagen',
            'activo', 'display_name', 'documentos'
        ]

    def get_display_name(self, obj):
        return f"{obj.marca} {obj.modelo} ({obj.patente})"


class RegistroMensualSerializer(serializers.ModelSerializer):
    mes_nombre = serializers.CharField(source='get_mes_display', read_only=True)
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)

    class Meta:
        model = RegistroMensual
        fields = '__all__'
