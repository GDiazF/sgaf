from rest_framework import serializers
from .models import RegistroMensual, Vehiculo

class VehiculoSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = ['id', 'marca', 'modelo', 'patente', 'activo', 'display_name']

    def get_display_name(self, obj):
        return f"{obj.marca} {obj.modelo} ({obj.patente})"


class RegistroMensualSerializer(serializers.ModelSerializer):
    mes_nombre = serializers.CharField(source='get_mes_display', read_only=True)
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)

    class Meta:
        model = RegistroMensual
        fields = '__all__'
