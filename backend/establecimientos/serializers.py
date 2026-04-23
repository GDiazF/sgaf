from rest_framework import serializers
from .models import Establecimiento, TelefonoEstablecimiento, TipoEstablecimiento
from core.serializers import MediaRelativeImageField

class TipoEstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoEstablecimiento
        fields = ['id', 'nombre', 'area_gestion']

class TelefonoEstablecimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TelefonoEstablecimiento
        fields = ['id', 'establecimiento', 'numero', 'etiqueta', 'es_principal']

class EstablecimientoSerializer(serializers.ModelSerializer):
    telefonos = TelefonoEstablecimientoSerializer(many=True, read_only=True)
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')
    telefonos_json = serializers.JSONField(write_only=True, required=False)
    telefono_principal = serializers.CharField(write_only=True, required=False, allow_blank=True)
    logo = MediaRelativeImageField(required=False)

    class Meta:
        model = Establecimiento
        fields = [
            'id', 'rbd', 'nombre', 'tipo', 'tipo_nombre', 'director', 'direccion', 
            'email', 'logo', 'activo', 'telefonos', 'latitud', 'longitud', 
            'telefonos_json', 'telefono_principal'
        ]

    def _handle_telefonos(self, instance, telefonos_data=None, telefono_principal=None):
        # 1. Handle specialized multi-phone data (telefonos_json)
        if telefonos_data is not None:
            if isinstance(telefonos_data, str):
                try:
                    import json
                    telefonos_data = json.loads(telefonos_data)
                except Exception:
                    telefonos_data = []

            if isinstance(telefonos_data, list):
                instance.telefonos.all().delete()
                for item in telefonos_data:
                    TelefonoEstablecimiento.objects.create(
                        establecimiento=instance,
                        numero=item.get('numero', ''),
                        etiqueta=item.get('etiqueta', 'General'),
                        es_principal=item.get('es_principal', False)
                    )
                # Ensure at least one is principal if not set
                if instance.telefonos.exists() and not instance.telefonos.filter(es_principal=True).exists():
                    first = instance.telefonos.first()
                    first.es_principal = True
                    first.save()
                return

        # 2. Handle simplified single-phone data (telefono_principal)
        if telefono_principal is not None:
            if not telefono_principal:
                return # Don't update if empty string provided
            
            # Update current principal or create a new one
            principal = instance.telefonos.filter(es_principal=True).first()
            if principal:
                principal.numero = telefono_principal
                principal.save()
            else:
                TelefonoEstablecimiento.objects.create(
                    establecimiento=instance,
                    numero=telefono_principal,
                    etiqueta='Principal',
                    es_principal=True
                )

    def create(self, validated_data):
        telefonos_data = validated_data.pop('telefonos_json', None)
        telefono_principal = validated_data.pop('telefono_principal', None)
        instance = super().create(validated_data)
        self._handle_telefonos(instance, telefonos_data, telefono_principal)
        return instance

    def update(self, instance, validated_data):
        telefonos_data = validated_data.pop('telefonos_json', None)
        telefono_principal = validated_data.pop('telefono_principal', None)
        instance = super().update(instance, validated_data)
        self._handle_telefonos(instance, telefonos_data, telefono_principal)
        return instance
