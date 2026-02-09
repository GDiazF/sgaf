from rest_framework import serializers
from .models import RegistroMensual

class RegistroMensualSerializer(serializers.ModelSerializer):
    mes_nombre = serializers.CharField(source='get_mes_display', read_only=True)

    class Meta:
        model = RegistroMensual
        fields = '__all__'
