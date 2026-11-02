from rest_framework import serializers

from .models import HerramientaPdf


class HerramientaPdfSerializer(serializers.ModelSerializer):
    class Meta:
        model = HerramientaPdf
        fields = ['id', 'slug', 'nombre', 'categoria', 'descripcion', 'orden', 'visible']
        read_only_fields = ['id', 'slug', 'nombre', 'categoria', 'descripcion', 'orden']
