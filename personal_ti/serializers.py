from rest_framework import serializers
from .models import PersonalTI
from establecimientos.models import Establecimiento


class EstablecimientoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Establecimiento
        fields = ['id', 'rbd', 'nombre']


class PersonalTISerializer(serializers.ModelSerializer):
    establecimiento_detalle = EstablecimientoMiniSerializer(source='establecimiento', read_only=True)
    funcion_display = serializers.CharField(source='get_funcion_display', read_only=True)
    tipo_contrato_display = serializers.CharField(source='get_tipo_contrato_display', read_only=True)

    class Meta:
        model = PersonalTI
        fields = [
            'id',
            'establecimiento',
            'establecimiento_detalle',
            'funcion',
            'funcion_display',
            'rut',
            'nombre_completo',
            'tipo_contrato',
            'tipo_contrato_display',
            'telefono',
            'correo',
            'activo',
            'observaciones',
            'creado_en',
            'actualizado_en',
        ]
        read_only_fields = ['creado_en', 'actualizado_en']


class CoberturaEstablecimientoSerializer(serializers.ModelSerializer):
    """Resumen de cobertura TI por establecimiento."""
    total_personal = serializers.IntegerField(read_only=True)
    coordinadores = serializers.IntegerField(read_only=True)
    tecnicos = serializers.IntegerField(read_only=True)
    tiene_personal = serializers.BooleanField(read_only=True)

    class Meta:
        model = Establecimiento
        fields = ['id', 'rbd', 'nombre', 'activo', 'total_personal', 'coordinadores', 'tecnicos', 'tiene_personal']
