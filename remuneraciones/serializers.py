from rest_framework import serializers
from .models import MapeoBanco, MapeoMedioPago, MapeoBancoDirecto, ValeVistaConfig

class MapeoBancoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapeoBanco
        fields = '__all__'

class MapeoMedioPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapeoMedioPago
        fields = '__all__'

class MapeoBancoDirectoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MapeoBancoDirecto
        fields = '__all__'

class ValeVistaConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValeVistaConfig
        fields = '__all__'
