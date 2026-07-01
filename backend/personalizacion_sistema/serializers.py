from rest_framework import serializers
from django.db.models import Max
from core.serializers import MediaRelativeImageField
from .models import LoginBackgroundImage, LoginBackgroundConfig


class LoginBackgroundImageSerializer(serializers.ModelSerializer):
    imagen = MediaRelativeImageField(required=False)
    establecimiento_nombre = serializers.ReadOnlyField(source='establecimiento.nombre')
    created_by_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = LoginBackgroundImage
        fields = [
            'id', 'titulo', 'imagen', 'activa', 'orden', 'establecimiento',
            'establecimiento_nombre', 'fecha_inicio', 'fecha_fin',
            'created_at', 'updated_at', 'created_by', 'created_by_username'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'created_by_username']

    def validate_orden(self, value):
        instance_id = getattr(self.instance, 'id', None)
        if LoginBackgroundImage.objects.filter(orden=value).exclude(id=instance_id).exists():
            raise serializers.ValidationError('El numero de orden ya esta en uso.')
        return value

    def create(self, validated_data):
        # If "orden" is omitted, assign next available value.
        if 'orden' not in self.initial_data:
            max_order = LoginBackgroundImage.objects.aggregate(max_orden=Max('orden'))['max_orden']
            validated_data['orden'] = (max_order + 1) if max_order is not None else 1
        return super().create(validated_data)


class LoginBackgroundImagePublicSerializer(serializers.ModelSerializer):
    imagen = MediaRelativeImageField(read_only=True)
    establecimiento_nombre = serializers.ReadOnlyField(source='establecimiento.nombre')
    establecimiento_logo = MediaRelativeImageField(source='establecimiento.logo', read_only=True)
    establecimiento_director = serializers.ReadOnlyField(source='establecimiento.director')
    establecimiento_direccion = serializers.ReadOnlyField(source='establecimiento.direccion')

    class Meta:
        model = LoginBackgroundImage
        fields = [
            'id',
            'titulo',
            'imagen',
            'orden',
            'establecimiento_nombre',
            'establecimiento_logo',
            'establecimiento_director',
            'establecimiento_direccion',
        ]


class LoginBackgroundImageReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    orden = serializers.IntegerField(min_value=0)


class LoginBackgroundImageReorderSerializer(serializers.Serializer):
    orders = LoginBackgroundImageReorderItemSerializer(many=True)


class LoginBackgroundConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginBackgroundConfig
        fields = ['rotation_seconds']

    def validate_rotation_seconds(self, value):
        if value < 2 or value > 120:
            raise serializers.ValidationError('El tiempo de rotacion debe estar entre 2 y 120 segundos.')
        return value
