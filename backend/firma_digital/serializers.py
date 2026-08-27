from rest_framework import serializers

from .models import FirmaPendiente, SelloFirma


class SelloFirmaSerializer(serializers.ModelSerializer):
    nivel = serializers.CharField(read_only=True)
    nivel_label = serializers.CharField(read_only=True)
    organo_nombre = serializers.CharField(read_only=True)
    imagen_url = serializers.SerializerMethodField()
    subdireccion_nombre = serializers.CharField(
        source='subdireccion.nombre', read_only=True, default=None
    )
    departamento_nombre = serializers.CharField(
        source='departamento.nombre', read_only=True, default=None
    )
    unidad_nombre = serializers.CharField(
        source='unidad.nombre', read_only=True, default=None
    )

    class Meta:
        model = SelloFirma
        fields = [
            'id',
            'nombre',
            'imagen',
            'imagen_url',
            'activo',
            'subdireccion',
            'departamento',
            'unidad',
            'subdireccion_nombre',
            'departamento_nombre',
            'unidad_nombre',
            'nivel',
            'nivel_label',
            'organo_nombre',
            'creado_en',
            'actualizado_en',
        ]
        read_only_fields = ['creado_en', 'actualizado_en']
        extra_kwargs = {
            'imagen': {'required': False, 'allow_null': True},
            'subdireccion': {'required': False, 'allow_null': True},
            'departamento': {'required': False, 'allow_null': True},
            'unidad': {'required': False, 'allow_null': True},
        }

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        for key in ('subdireccion', 'departamento', 'unidad'):
            if key in mutable and mutable.get(key) in ('', 'null', 'None'):
                mutable[key] = None
        if 'activo' in mutable and isinstance(mutable.get('activo'), str):
            mutable['activo'] = mutable.get('activo', '').lower() in (
                '1',
                'true',
                'yes',
                'on',
            )
        return super().to_internal_value(mutable)

    def get_imagen_url(self, obj):
        if not obj.imagen:
            return None
        request = self.context.get('request')
        url = obj.imagen.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        sub = attrs['subdireccion'] if 'subdireccion' in attrs else (
            instance.subdireccion if instance else None
        )
        dep = attrs['departamento'] if 'departamento' in attrs else (
            instance.departamento if instance else None
        )
        uni = attrs['unidad'] if 'unidad' in attrs else (
            instance.unidad if instance else None
        )

        levels = [bool(sub), bool(dep), bool(uni)]
        if sum(levels) != 1:
            raise serializers.ValidationError(
                'Debe asignar el sello a exactamente un nivel: '
                'Subdirección, Departamento o Unidad.'
            )

        if instance is None and not attrs.get('imagen'):
            raise serializers.ValidationError({'imagen': 'Debe subir una imagen del sello.'})

        return attrs

    def create(self, validated_data):
        sello = SelloFirma(**validated_data)
        sello.full_clean()
        sello.save()
        return sello

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if instance.unidad_id:
            instance.departamento = None
            instance.subdireccion = None
        elif instance.departamento_id:
            instance.unidad = None
            instance.subdireccion = None
        elif instance.subdireccion_id:
            instance.unidad = None
            instance.departamento = None
        instance.full_clean()
        instance.save()
        return instance


class FirmaPendienteSerializer(serializers.ModelSerializer):
    firmante_nombre = serializers.CharField(
        source='firmante.nombre_funcionario', read_only=True, default=''
    )
    grupo_nombre = serializers.CharField(
        source='grupo_firmante.nombre', read_only=True, default=None
    )
    solicitado_por_nombre = serializers.SerializerMethodField()
    codigo_validacion = serializers.CharField(
        source='documento_registro.codigo', read_only=True, default=None
    )
    estado_label = serializers.SerializerMethodField()
    tiene_archivo_origen = serializers.SerializerMethodField()

    class Meta:
        model = FirmaPendiente
        fields = [
            'id',
            'codigo_interno',
            'titulo',
            'origen',
            'referencia_id',
            'meta',
            'estado',
            'estado_label',
            'tiene_archivo_origen',
            'firmante',
            'firmante_nombre',
            'grupo_firmante',
            'grupo_nombre',
            'solicitado_por',
            'solicitado_por_nombre',
            'motivo_rechazo',
            'codigo_validacion',
            'creado_en',
            'actualizado_en',
            'firmado_en',
            'rechazado_en',
        ]
        read_only_fields = fields

    def get_solicitado_por_nombre(self, obj):
        u = obj.solicitado_por
        if not u:
            return None
        name = f'{u.first_name or ""} {u.last_name or ""}'.strip()
        return name or u.username

    def get_tiene_archivo_origen(self, obj):
        return bool(obj.archivo_origen)

    def get_estado_label(self, obj):
        return obj.get_estado_display()
