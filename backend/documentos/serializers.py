from rest_framework import serializers

from .models import PlantillaDocumento
from .page_sizes import resolve_page_mm
from .propositos import is_borrador, normalize_proposito, proposito_label


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
            'activa',
            'creado_por', 'creado_por_nombre',
            'actualizado_por', 'actualizado_por_nombre',
            'creado_en', 'actualizado_en',
        ]
        read_only_fields = [
            'creado_por', 'actualizado_por', 'creado_en', 'actualizado_en',
            'creado_por_nombre', 'actualizado_por_nombre',
            'ancho_efectivo_mm', 'alto_efectivo_mm',
        ]

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
        return attrs
