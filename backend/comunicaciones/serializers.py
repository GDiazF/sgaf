from rest_framework import serializers
from .models import CuentaSMTP, PlantillaCorreo

class CuentaSMTPSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaSMTP
        fields = '__all__'
        extra_kwargs = {
            'smtp_password': {'write_only': True}
        }

class PlantillaCorreoSerializer(serializers.ModelSerializer):
    cuenta_smtp_nombre = serializers.ReadOnlyField(source='cuenta_smtp.nombre')
    proposito_display = serializers.ReadOnlyField(source='get_proposito_display')
    
    class Meta:
        model = PlantillaCorreo
        fields = '__all__'
