from rest_framework import serializers

from documentacion_servicios.models import (
    CampoDefinicion,
    RegistroServicioDoc,
    TipoRegistroServicio,
)
from documentacion_servicios.validation import (
    coerce_pk,
    split_core_and_valores,
    validate_payload_against_campos,
)


class CampoDefinicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampoDefinicion
        fields = (
            'id',
            'tipo',
            'clave',
            'etiqueta',
            'tipo_dato',
            'obligatorio',
            'orden',
            'opciones',
            'activo',
            'dias_aviso',
        )
        read_only_fields = ('tipo',)


class TipoRegistroServicioSerializer(serializers.ModelSerializer):
    campos = CampoDefinicionSerializer(many=True, read_only=True)

    class Meta:
        model = TipoRegistroServicio
        fields = (
            'id',
            'codigo',
            'nombre',
            'descripcion',
            'activo',
            'orden',
            'usa_folio',
            'prefijo_folio',
            'notificar_al_crear',
            'aviso_solo_ultimo_por_establecimiento',
            'campos',
        )


class RegistroServicioDocSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    proveedor_nombre = serializers.CharField(
        source='proveedor.nombre', read_only=True, default=None
    )
    establecimiento_nombre = serializers.CharField(
        source='establecimiento.nombre', read_only=True, default=None
    )
    establecimiento_email = serializers.CharField(
        source='establecimiento.email', read_only=True, default='', allow_blank=True
    )
    establecimiento_email_director = serializers.CharField(
        source='establecimiento.email_director',
        read_only=True,
        default='',
        allow_blank=True,
    )
    archivo_url = serializers.SerializerMethodField()
    creado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = RegistroServicioDoc
        fields = (
            'id',
            'tipo',
            'tipo_nombre',
            'folio',
            'proveedor',
            'proveedor_nombre',
            'establecimiento',
            'establecimiento_nombre',
            'establecimiento_email',
            'establecimiento_email_director',
            'fecha_servicio',
            'archivo',
            'archivo_url',
            'valores',
            'correo_enviado_en',
            'creado_por',
            'creado_por_nombre',
            'creado_en',
            'actualizado_en',
        )
        read_only_fields = (
            'creado_por',
            'creado_en',
            'actualizado_en',
            'tipo_nombre',
            'proveedor_nombre',
            'establecimiento_nombre',
            'establecimiento_email',
            'establecimiento_email_director',
            'archivo_url',
            'creado_por_nombre',
            'correo_enviado_en',
        )

    def get_archivo_url(self, obj):
        """Ruta relativa `/media/…` (dev vía proxy Vite; prod mismo origen)."""
        if not obj.archivo:
            return None
        url = obj.archivo.url
        # FileField.url ya es relativo si MEDIA_URL es relativo
        if url.startswith('http://') or url.startswith('https://'):
            from urllib.parse import urlparse

            return urlparse(url).path
        return url

    def get_creado_por_nombre(self, obj):
        if not obj.creado_por_id:
            return None
        return obj.creado_por.get_full_name() or obj.creado_por.username

    def _collect_flat_data(self, attrs, instance=None):
        """Une attrs + valores anidados + instance para validar."""
        flat = {}
        if instance:
            flat['folio'] = instance.folio
            flat['proveedor'] = instance.proveedor_id
            flat['establecimiento'] = instance.establecimiento_id
            flat['fecha_servicio'] = (
                instance.fecha_servicio.isoformat() if instance.fecha_servicio else None
            )
            flat.update(instance.valores or {})

        valores_in = attrs.get('valores')
        if isinstance(valores_in, dict):
            flat.update(valores_in)

        for key in ('folio', 'proveedor', 'establecimiento', 'fecha_servicio'):
            if key in attrs:
                flat[key] = attrs[key]

        # Multipart: campos pueden venir planos en initial_data
        initial = getattr(self, 'initial_data', {}) or {}
        if hasattr(initial, 'items'):
            for key, value in initial.items():
                if key in (
                    'tipo',
                    'archivo',
                    'valores',
                    'csrfmiddlewaretoken',
                ):
                    continue
                if key not in flat or flat.get(key) in (None, ''):
                    flat[key] = value
        return flat

    def validate(self, attrs):
        tipo = attrs.get('tipo') or (self.instance.tipo if self.instance else None)
        if tipo is None and self.initial_data.get('tipo'):
            try:
                tipo = TipoRegistroServicio.objects.get(pk=self.initial_data.get('tipo'))
                attrs['tipo'] = tipo
            except TipoRegistroServicio.DoesNotExist as exc:
                raise serializers.ValidationError({'tipo': 'Tipo inválido.'}) from exc
        if tipo is None:
            raise serializers.ValidationError({'tipo': 'Obligatorio.'})

        flat = self._collect_flat_data(attrs, self.instance)
        request = self.context.get('request')
        archivo_in_request = bool(request and request.FILES.get('archivo'))
        has_existing = bool(self.instance and self.instance.archivo)

        errors = validate_payload_against_campos(
            tipo,
            flat,
            has_existing_archivo=has_existing,
            archivo_in_request=archivo_in_request,
            partial=self.partial,
        )
        if errors:
            raise serializers.ValidationError(errors)

        # Normalizar columnas core desde flat
        if 'folio' in flat:
            attrs['folio'] = flat.get('folio') or ''
        if 'proveedor' in flat:
            pk = coerce_pk(flat.get('proveedor'))
            if pk is not None:
                attrs['proveedor_id'] = pk
                attrs.pop('proveedor', None)
            elif flat.get('proveedor') in (None, ''):
                attrs['proveedor'] = None
                attrs.pop('proveedor_id', None)
        if 'establecimiento' in flat:
            pk = coerce_pk(flat.get('establecimiento'))
            if pk is not None:
                attrs['establecimiento_id'] = pk
                attrs.pop('establecimiento', None)
            elif flat.get('establecimiento') in (None, ''):
                attrs['establecimiento'] = None
                attrs.pop('establecimiento_id', None)
        if 'fecha_servicio' in flat:
            attrs['fecha_servicio'] = flat.get('fecha_servicio') or None

        # Valores JSON: no incluir FKs ya resueltas como objetos
        flat_for_valores = {
            k: (v.pk if hasattr(v, 'pk') else v) for k, v in flat.items()
        }
        _, valores_extra = split_core_and_valores(flat_for_valores)
        # Quitar claves vacías
        valores_extra = {
            k: v for k, v in valores_extra.items() if v is not None and v != ''
        }
        if self.instance and self.partial:
            merged = dict(self.instance.valores or {})
            merged.update(valores_extra)
            attrs['valores'] = merged
        else:
            attrs['valores'] = valores_extra

        return attrs

    def create(self, validated_data):
        from establecimientos.models import Establecimiento
        from servicios.models import Proveedor

        proveedor_id = validated_data.pop('proveedor_id', None)
        establecimiento_id = validated_data.pop('establecimiento_id', None)
        if proveedor_id:
            validated_data['proveedor'] = Proveedor.objects.get(pk=proveedor_id)
        if establecimiento_id:
            validated_data['establecimiento'] = Establecimiento.objects.get(
                pk=establecimiento_id
            )
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            validated_data['creado_por'] = request.user
        instance = super().create(validated_data)
        try:
            from documentacion_servicios.notify import notificar_registro_creado

            notificar_registro_creado(instance)
        except Exception:
            pass
        return instance

    def update(self, instance, validated_data):
        from establecimientos.models import Establecimiento
        from servicios.models import Proveedor

        proveedor_id = validated_data.pop('proveedor_id', serializers.empty)
        establecimiento_id = validated_data.pop('establecimiento_id', serializers.empty)
        if proveedor_id is not serializers.empty:
            validated_data['proveedor'] = (
                Proveedor.objects.get(pk=proveedor_id) if proveedor_id else None
            )
        if establecimiento_id is not serializers.empty:
            validated_data['establecimiento'] = (
                Establecimiento.objects.get(pk=establecimiento_id)
                if establecimiento_id
                else None
            )
        return super().update(instance, validated_data)
