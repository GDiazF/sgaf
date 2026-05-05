from rest_framework import serializers
from .models import ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion, DocumentoContrato, HistorialContrato, ContratoProveedor
from core.serializers import MediaRelativeFileField
from establecimientos.serializers import EstablecimientoSerializer

class ProcesoCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcesoCompra
        fields = '__all__'

class EstadoContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoContrato
        fields = '__all__'

class CategoriaContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaContrato
        fields = '__all__'

class OrientacionLicitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrientacionLicitacion
        fields = '__all__'

class DocumentoContratoSerializer(serializers.ModelSerializer):
    archivo = MediaRelativeFileField(required=False)
    class Meta:
        model = DocumentoContrato
        fields = '__all__'

class HistorialContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialContrato
        fields = '__all__'

class ContratoProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    monto_ejecutado = serializers.ReadOnlyField()
    monto_restante = serializers.ReadOnlyField()
    establecimientos_detalle = EstablecimientoSerializer(source='establecimientos', many=True, read_only=True)

    class Meta:
        model = ContratoProveedor
        fields = ['id', 'proveedor', 'proveedor_nombre', 'monto_adjudicado', 'monto_consumido_previo', 'monto_ejecutado', 'monto_restante', 'establecimientos', 'establecimientos_detalle']

class ContratoSerializer(serializers.ModelSerializer):
    proceso_nombre = serializers.ReadOnlyField(source='proceso.nombre')
    estado_nombre = serializers.ReadOnlyField(source='estado.nombre')
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    orientacion_nombre = serializers.ReadOnlyField(source='orientacion.nombre')
    
    proveedores_asociados = ContratoProveedorSerializer(many=True, required=False)
    monto_total = serializers.ReadOnlyField()
    monto_consumido_previo = serializers.ReadOnlyField()
    plazo_meses = serializers.ReadOnlyField()
    monto_ejecutado = serializers.ReadOnlyField()
    monto_restante = serializers.ReadOnlyField()
    gastos_mensuales = serializers.ReadOnlyField()
    
    documentos = DocumentoContratoSerializer(many=True, read_only=True)
    historial = HistorialContratoSerializer(many=True, read_only=True)

    from servicios.serializers import FacturaAdquisicionSerializer
    recepciones = FacturaAdquisicionSerializer(many=True, read_only=True)

    class Meta:
        model = Contrato
        fields = '__all__'

    def create(self, validated_data):
        proveedores_data = validated_data.pop('proveedores_asociados', [])
        
        contrato = Contrato.objects.create(**validated_data)
            
        for prov_data in proveedores_data:
            est_data = prov_data.pop('establecimientos', [])
            cp = ContratoProveedor.objects.create(contrato=contrato, **prov_data)
            if est_data:
                cp.establecimientos.set(est_data)
            
        return contrato

    def update(self, instance, validated_data):
        proveedores_data = validated_data.pop('proveedores_asociados', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
            
        if proveedores_data is not None:
            instance.proveedores_asociados.all().delete()
            for prov_data in proveedores_data:
                est_data = prov_data.pop('establecimientos', [])
                cp = ContratoProveedor.objects.create(contrato=instance, **prov_data)
                if est_data:
                    cp.establecimientos.set(est_data)
                
        return instance
