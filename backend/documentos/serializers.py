from rest_framework import serializers

from .models import PlantillaDocumento
from .page_sizes import resolve_page_mm
from .propositos import (
    PROPOSITOS_PLANTILLAS_MULTIPLES,
    is_borrador,
    normalize_proposito,
    proposito_label,
)


def sync_plantilla_default(instance):
    """Una sola predeterminada por propósito; al menos una si hay activas."""
    if is_borrador(instance.proposito):
        return
    if instance.es_default:
        PlantillaDocumento.objects.filter(
            proposito=instance.proposito,
            es_default=True,
        ).exclude(pk=instance.pk).update(es_default=False)
        return
    has_default = PlantillaDocumento.objects.filter(
        proposito=instance.proposito,
        es_default=True,
        activa=True,
    ).exists()
    if not has_default:
        fallback = (
            PlantillaDocumento.objects
            .filter(proposito=instance.proposito, activa=True)
            .order_by('nombre')
            .first()
        )
        if fallback:
            PlantillaDocumento.objects.filter(
                proposito=instance.proposito,
                es_default=True,
            ).exclude(pk=fallback.pk).update(es_default=False)
            if not fallback.es_default:
                fallback.es_default = True
                fallback.save(update_fields=['es_default'])


class PlantillaDocumentoSerializer(serializers.ModelSerializer):
    creado_por_nombre = serializers.SerializerMethodField()
    actualizado_por_nombre = serializers.SerializerMethodField()
    ancho_efectivo_mm = serializers.SerializerMethodField()
    alto_efectivo_mm = serializers.SerializerMethodField()

    class Meta:
        model = PlantillaDocumento
        fields = [
            'id', 'nombre', 'descripcion', 'proposito',
            'cuerpo_html', 'encabezado_html', 'pie_html',
            'tamano_pagina', 'orientacion',
            'ancho_mm', 'alto_mm',
            'ancho_efectivo_mm', 'alto_efectivo_mm',
            'margen_superior_mm', 'margen_inferior_mm',
            'margen_izquierdo_mm', 'margen_derecho_mm',
            'activa', 'es_default',
            'creado_por', 'creado_por_nombre',
            'actualizado_por', 'actualizado_por_nombre',
            'creado_en', 'actualizado_en',
        ]
        read_only_fields = [
            'creado_por', 'actualizado_por', 'creado_en', 'actualizado_en',
            'creado_por_nombre', 'actualizado_por_nombre',
            'ancho_efectivo_mm', 'alto_efectivo_mm',
        ]
        extra_kwargs = {
            # DRF infiere UniqueValidator desde UniqueConstraint; validamos en validate().
            'proposito': {'validators': []},
        }

    def get_creado_por_nombre(self, obj):
        user = obj.creado_por
        if not user:
            return ''
        return user.get_full_name() or user.username

    def get_actualizado_por_nombre(self, obj):
        user = obj.actualizado_por
        if not user:
            return ''
        return user.get_full_name() or user.username

    def get_ancho_efectivo_mm(self, obj):
        width, _ = resolve_page_mm(
            obj.tamano_pagina, obj.orientacion, obj.ancho_mm, obj.alto_mm,
        )
        return width

    def get_alto_efectivo_mm(self, obj):
        _, height = resolve_page_mm(
            obj.tamano_pagina, obj.orientacion, obj.ancho_mm, obj.alto_mm,
        )
        return height

    def validate_proposito(self, value):
        return normalize_proposito(value)

    def validate(self, attrs):
        tamano = attrs.get(
            'tamano_pagina',
            getattr(self.instance, 'tamano_pagina', 'carta'),
        )
        if tamano == 'personalizado':
            ancho = attrs.get('ancho_mm', getattr(self.instance, 'ancho_mm', None))
            alto = attrs.get('alto_mm', getattr(self.instance, 'alto_mm', None))
            if not ancho or not alto:
                raise serializers.ValidationError(
                    'El tamaño personalizado requiere ancho y alto en milímetros.'
                )

        proposito = attrs.get(
            'proposito',
            getattr(self.instance, 'proposito', None),
        )
        proposito = normalize_proposito(proposito)
        attrs['proposito'] = proposito

        if not is_borrador(proposito):
            if proposito not in PROPOSITOS_PLANTILLAS_MULTIPLES:
                qs = PlantillaDocumento.objects.filter(proposito=proposito)
                if self.instance is not None:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    otra = qs.first()
                    raise serializers.ValidationError({
                        'proposito': (
                            f'Ya existe una plantilla asignada a «{proposito_label(proposito)}» '
                            f'(«{otra.nombre}»). Solo puede haber una por funcionalidad. '
                            'Pase la otra a borrador o edítela.'
                        ),
                    })
                attrs['es_default'] = True
            else:
                es_default = attrs.get(
                    'es_default',
                    getattr(self.instance, 'es_default', False),
                )
                activa = attrs.get('activa', getattr(self.instance, 'activa', True))
                if es_default and not activa:
                    raise serializers.ValidationError({
                        'es_default': 'La plantilla predeterminada debe estar activa.',
                    })
                if not es_default:
                    others = PlantillaDocumento.objects.filter(
                        proposito=proposito,
                        es_default=True,
                    )
                    if self.instance is not None:
                        others = others.exclude(pk=self.instance.pk)
                    if not others.exists() and activa:
                        attrs['es_default'] = True
        return attrs

    def create(self, validated_data):
        instance = super().create(validated_data)
        sync_plantilla_default(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        sync_plantilla_default(instance)
        return instance
