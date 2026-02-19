from rest_framework import serializers
from .models import Establecimiento, TelefonoEstablecimiento, TipoEstablecimiento

class TipoEstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEstablecimiento
        fields = ['id', 'nombre', 'area_gestion']

class TelefonoEstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelefonoEstablecimiento
        fields = ['id', 'numero', 'etiqueta', 'es_principal']

class EstablecimientoSerializer(serializers.ModelSerializer):
    telefonos = TelefonoEstablecimientoSerializer(many=True, read_only=True)
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')

    class Meta:
        model = Establecimiento
        fields = ['id', 'rbd', 'nombre', 'tipo', 'tipo_nombre', 'director', 'direccion', 'email', 'logo', 'activo', 'telefonos', 'latitud', 'longitud']
