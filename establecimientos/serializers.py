from rest_framework import serializers
from .models import Establecimiento, TelefonoEstablecimiento

class TelefonoEstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelefonoEstablecimiento
        fields = ['id', 'numero', 'etiqueta', 'es_principal']

class EstablecimientoSerializer(serializers.ModelSerializer):
    telefonos = TelefonoEstablecimientoSerializer(many=True, read_only=True)

    class Meta:
        model = Establecimiento
        fields = ['id', 'rbd', 'nombre', 'tipo', 'director', 'direccion', 'email', 'logo', 'activo', 'telefonos']
