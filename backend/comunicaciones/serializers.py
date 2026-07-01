from rest_framework import serializers
from .models import CuentaSMTP, DestinatariosCorreoOperativo, PlantillaCorreo

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


class DestinatariosCorreoOperativoSerializer(serializers.ModelSerializer):
    proposito_display = serializers.ReadOnlyField(source='get_proposito_display')

    class Meta:
        model = DestinatariosCorreoOperativo
        fields = [
            'id', 'proposito', 'proposito_display', 'grupos', 'usuarios',
            'emails_adicionales', 'activo', 'actualizado_en'
        ]

    def validate(self, attrs):
        activo = attrs.get('activo', self.instance.activo if self.instance else True)
        grupos = attrs.get('grupos', self.instance.grupos.all() if self.instance else [])
        usuarios = attrs.get('usuarios', self.instance.usuarios.all() if self.instance else [])
        emails_adicionales = attrs.get(
            'emails_adicionales',
            self.instance.emails_adicionales if self.instance else ''
        )

        if activo and not grupos and not usuarios and not emails_adicionales.strip():
            raise serializers.ValidationError(
                'Debes configurar al menos un grupo, usuario o email adicional para activar este propósito.'
            )

        return attrs
