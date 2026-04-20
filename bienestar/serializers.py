from rest_framework import serializers
from .models import CategoriaBienestar, Beneficio, BeneficioArchivo

class BeneficioArchivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BeneficioArchivo
        fields = ['id', 'beneficio', 'archivo', 'nombre', 'tipo', 'creado_en']

class BeneficioSerializer(serializers.ModelSerializer):
    archivos = BeneficioArchivoSerializer(many=True, read_only=True)
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    categoria_color = serializers.ReadOnlyField(source='categoria.color')
    creado_por_nombre = serializers.SerializerMethodField()

    def get_creado_por_nombre(self, obj):
        if obj.creado_por:
            return f"{obj.creado_por.first_name} {obj.creado_por.last_name}".strip() or obj.creado_por.username
        return "Sistema"

    
    class Meta:
        model = Beneficio
        fields = '__all__'

class CategoriaBienestarSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaBienestar
        fields = '__all__'
