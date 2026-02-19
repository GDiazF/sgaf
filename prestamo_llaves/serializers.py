from rest_framework import serializers
from .models import Establecimiento, Solicitante, Llave, Prestamo

from establecimientos.serializers import EstablecimientoSerializer

class SolicitanteSerializer(serializers.ModelSerializer):
    funcionario_detalle = serializers.SerializerMethodField()
    
    class Meta:
        model = Solicitante
        fields = '__all__'

    def get_funcionario_detalle(self, obj):
        if obj.funcionario:
            return {
                'id': obj.funcionario.id,
                'nombre': obj.funcionario.nombre_funcionario,
                'cargo': obj.funcionario.cargo,
                'subdireccion': obj.funcionario.subdireccion.nombre if obj.funcionario.subdireccion else None,
                'departamento': obj.funcionario.departamento.nombre if obj.funcionario.departamento else None,
            }
        return None

class LlaveSerializer(serializers.ModelSerializer):
    establecimiento_nombre = serializers.ReadOnlyField(source='establecimiento.nombre')
    disponible = serializers.SerializerMethodField()
    solicitante_actual = serializers.SerializerMethodField()
    
    class Meta:
        model = Llave
        fields = '__all__'

    def get_disponible(self, obj):
        # Check if there are any active loans (no return date)
        return not obj.prestamos.filter(fecha_devolucion__isnull=True).exists()

    def get_solicitante_actual(self, obj):
        prestamo = obj.prestamos.filter(fecha_devolucion__isnull=True).first()
        if prestamo:
            return f"{prestamo.solicitante.nombre} {prestamo.solicitante.apellido}"
        return None

class PrestamoSerializer(serializers.ModelSerializer):
    llave_obj = LlaveSerializer(source='llave', read_only=True)
    solicitante_obj = SolicitanteSerializer(source='solicitante', read_only=True)
    
    class Meta:
        model = Prestamo
        fields = '__all__'
