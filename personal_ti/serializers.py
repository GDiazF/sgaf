from rest_framework import serializers
from .models import PersonalTI, FuncionTI, ContratoTI
from establecimientos.models import Establecimiento


class FuncionTISerializer(serializers.ModelSerializer):
    class Meta:
        model = FuncionTI
        fields = ['id', 'nombre', 'color']


class ContratoTISerializer(serializers.ModelSerializer):
    display = serializers.SerializerMethodField()

    class Meta:
        model = ContratoTI
        fields = ['id', 'codigo', 'nombre', 'color', 'display']

    def get_display(self, obj):
        return f"{obj.codigo} - {obj.nombre}"


class EstablecimientoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Establecimiento
        fields = ['id', 'rbd', 'nombre']


class PersonalTISerializer(serializers.ModelSerializer):
    establecimiento_detalle = EstablecimientoMiniSerializer(source='establecimiento', read_only=True)
    funcion_display = serializers.CharField(source='funcion.nombre', read_only=True)
    tipo_contrato_display = serializers.SerializerMethodField()
    funcion_color = serializers.CharField(source='funcion.color', read_only=True)
    tipo_contrato_color = serializers.CharField(source='tipo_contrato.color', read_only=True)

    class Meta:
        model = PersonalTI
        fields = [
            'id',
            'establecimiento',
            'establecimiento_detalle',
            'funcion',
            'funcion_display',
            'funcion_color',
            'rut',
            'nombre_completo',
            'tipo_contrato',
            'tipo_contrato_display',
            'tipo_contrato_color',
            'telefono',
            'correo',
            'activo',
            'observaciones',
            'creado_en',
            'actualizado_en',
        ]
        read_only_fields = ['creado_en', 'actualizado_en']

    def get_tipo_contrato_display(self, obj):
        return f"{obj.tipo_contrato.codigo} - {obj.tipo_contrato.nombre}"


class CoberturaEstablecimientoSerializer(serializers.ModelSerializer):
    """Resumen de cobertura TI por establecimiento."""
    total_personal = serializers.IntegerField(read_only=True)
    coordinadores = serializers.IntegerField(read_only=True)
    tecnicos = serializers.IntegerField(read_only=True)
    tiene_personal = serializers.BooleanField(read_only=True)

    class Meta:
        model = Establecimiento
        fields = ['id', 'rbd', 'nombre', 'activo', 'total_personal', 'coordinadores', 'tecnicos', 'tiene_personal']
