from rest_framework import serializers
from .models import ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion, DocumentoContrato, HistorialContrato
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
    class Meta:
        model = DocumentoContrato
        fields = '__all__'

class HistorialContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialContrato
        fields = '__all__'

class ContratoSerializer(serializers.ModelSerializer):
    proceso_nombre = serializers.ReadOnlyField(source='proceso.nombre')
    estado_nombre = serializers.ReadOnlyField(source='estado.nombre')
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    orientacion_nombre = serializers.ReadOnlyField(source='orientacion.nombre')
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    plazo_meses = serializers.ReadOnlyField()
    monto_ejecutado = serializers.ReadOnlyField()
    monto_restante = serializers.ReadOnlyField()
    gastos_mensuales = serializers.ReadOnlyField()
    
    documentos = DocumentoContratoSerializer(many=True, read_only=True)
    historial = HistorialContratoSerializer(many=True, read_only=True)
    establecimientos_detalle = EstablecimientoSerializer(source='establecimientos', many=True, read_only=True)

    from servicios.serializers import FacturaAdquisicionSerializer
    recepciones = FacturaAdquisicionSerializer(many=True, read_only=True)

    class Meta:
        model = Contrato
        fields = '__all__'
