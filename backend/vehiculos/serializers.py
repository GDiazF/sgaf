import json
from decimal import Decimal

from rest_framework import serializers

from funcionarios.models import Funcionario
from django.utils import timezone

from .models import (
    EmisionDocumentoVehiculo,
    IncidenteVehiculo,
    MantencionPreventiva,
    RegistroMensual,
    ReparacionVehiculo,
    Vehiculo,
    VehiculoConductor,
    VehiculoDocumento,
    VehiculoTipoCombustible,
    VehiculoTipoDocumento,
)


class VehiculoTipoCombustibleSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiculoTipoCombustible
        fields = '__all__'


class VehiculoTipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiculoTipoDocumento
        fields = '__all__'
        read_only_fields = ['es_sistema']

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        if instance and instance.es_sistema:
            if 'codigo' in attrs and attrs['codigo'] != instance.codigo:
                raise serializers.ValidationError({
                    'codigo': 'No se puede cambiar el código de un tipo fijo del sistema.',
                })
            # Mantener identidad; sí se puede ajustar aviso/icono/color/nombre visible.
            attrs['codigo'] = instance.codigo
            attrs['es_sistema'] = True
        else:
            # Tipos nuevos/custom: sin código de sistema.
            codigo = attrs.get('codigo', getattr(instance, 'codigo', '') or '')
            from .tipos_documento_sistema import CODIGOS_DOCUMENTO_SISTEMA

            if codigo and str(codigo).strip().upper() in CODIGOS_DOCUMENTO_SISTEMA:
                raise serializers.ValidationError({
                    'codigo': 'Ese código está reservado para tipos fijos del sistema.',
                })
            attrs.setdefault('codigo', '')
            attrs['es_sistema'] = False
        return attrs


class VehiculoDocumentoSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.ReadOnlyField(source='tipo.nombre')
    tipo_codigo = serializers.ReadOnlyField(source='tipo.codigo')
    tipo_icono = serializers.ReadOnlyField(source='tipo.icono')
    tipo_color = serializers.ReadOnlyField(source='tipo.color')
    tipo_es_sistema = serializers.ReadOnlyField(source='tipo.es_sistema')

    class Meta:
        model = VehiculoDocumento
        fields = [
            'id',
            'vehiculo',
            'tipo',
            'tipo_nombre',
            'tipo_codigo',
            'tipo_icono',
            'tipo_color',
            'tipo_es_sistema',
            'archivo',
            'numero_referencia',
            'institucion',
            'fecha_documento',
            'fecha_vencimiento',
            'observaciones',
            'dias_aviso',
            'ultima_notificacion',
            'creado_en',
        ]
        read_only_fields = ['ultima_notificacion', 'creado_en']


class EmisionDocumentoVehiculoSerializer(serializers.ModelSerializer):
    emitido_por_nombre = serializers.SerializerMethodField()
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)
    tiene_archivo = serializers.SerializerMethodField()

    class Meta:
        model = EmisionDocumentoVehiculo
        fields = [
            'id',
            'vehiculo',
            'tipo',
            'tipo_label',
            'folio',
            'solicitante_nombre',
            'solicitante_rut',
            'meta',
            'tiene_archivo',
            'emitido_por',
            'emitido_por_nombre',
            'emitido_en',
        ]
        read_only_fields = fields

    def get_emitido_por_nombre(self, obj):
        user = obj.emitido_por
        if not user:
            return ''
        return user.get_full_name() or user.username

    def get_tiene_archivo(self, obj):
        return bool(obj.archivo)


class ConductorDetalleSerializer(serializers.ModelSerializer):
    subdireccion_nombre = serializers.SerializerMethodField()
    fecha_asignacion = serializers.SerializerMethodField()

    class Meta:
        model = Funcionario
        fields = [
            'id',
            'nombre_funcionario',
            'rut',
            'subdireccion_nombre',
            'fecha_asignacion',
        ]

    def get_subdireccion_nombre(self, obj):
        sub = getattr(obj, 'subdireccion', None)
        return (sub.nombre if sub else '') or ''

    def get_fecha_asignacion(self, obj):
        # Inyectado desde VehiculoSerializer.to_representation
        value = getattr(obj, '_vehiculo_fecha_asignacion', None)
        if value is None:
            return ''
        return value.isoformat() if hasattr(value, 'isoformat') else str(value)


class VehiculoSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    ultima_solicitud_folio = serializers.SerializerMethodField()
    documentos = VehiculoDocumentoSerializer(many=True, read_only=True)
    conductores = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Funcionario.objects.all(),
        required=False,
    )
    conductores_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = [
            'id',
            'marca',
            'modelo',
            'anio',
            'patente',
            'tipo_vehiculo',
            'color',
            'tipo_combustible',
            'nro_chasis',
            'nro_motor',
            'cilindrada',
            'fecha_adquisicion',
            'fecha_inscripcion',
            'lugar_estacionamiento',
            'imagen',
            'activo',
            'display_name',
            'ultima_solicitud_folio',
            'documentos',
            'conductores',
            'conductores_detalle',
        ]

    def get_display_name(self, obj):
        return f'{obj.marca} {obj.modelo} ({obj.patente})'

    def get_ultima_solicitud_folio(self, obj):
        from .correlativos import ultima_emision_acta

        emision = ultima_emision_acta(obj)
        return emision.folio if emision else ''

    def get_conductores_detalle(self, obj):
        asignaciones = (
            obj.conductor_asignaciones
            .select_related('funcionario', 'funcionario__subdireccion')
            .all()
        )
        funcionarios = []
        for asig in asignaciones:
            func = asig.funcionario
            func._vehiculo_fecha_asignacion = asig.fecha_asignacion
            funcionarios.append(func)
        return ConductorDetalleSerializer(funcionarios, many=True).data

    def _sync_conductores(self, vehiculo, funcionarios):
        ids = []
        for item in funcionarios or []:
            ids.append(item.pk if hasattr(item, 'pk') else int(item))
        ids = list(dict.fromkeys(ids))
        existing = {
            row.funcionario_id: row
            for row in VehiculoConductor.objects.filter(vehiculo=vehiculo)
        }
        VehiculoConductor.objects.filter(vehiculo=vehiculo).exclude(
            funcionario_id__in=ids,
        ).delete()
        today = timezone.localdate()
        for fid in ids:
            if fid not in existing:
                VehiculoConductor.objects.create(
                    vehiculo=vehiculo,
                    funcionario_id=fid,
                    fecha_asignacion=today,
                )

    def create(self, validated_data):
        conductores = validated_data.pop('conductores', None)
        vehiculo = super().create(validated_data)
        if conductores is not None:
            self._sync_conductores(vehiculo, conductores)
        return vehiculo

    def update(self, instance, validated_data):
        conductores = validated_data.pop('conductores', None)
        vehiculo = super().update(instance, validated_data)
        if conductores is not None:
            self._sync_conductores(vehiculo, conductores)
        return vehiculo

    def _parse_conductores(self, value):
        if value is None or value == '':
            return []
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return []
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            return [v.strip() for v in text.split(',') if v.strip()]
        if isinstance(value, (list, tuple)):
            flat = []
            for item in value:
                if isinstance(item, str) and item.strip().startswith('['):
                    try:
                        parsed = json.loads(item)
                        if isinstance(parsed, list):
                            flat.extend(parsed)
                            continue
                    except json.JSONDecodeError:
                        pass
                flat.append(item)
            return flat
        return [value]

    def to_internal_value(self, data):
        mutable = data
        try:
            if hasattr(data, 'copy') and hasattr(data, 'getlist'):
                mutable = data.copy()
                if 'conductores' in data:
                    raw = data.getlist('conductores')
                    ids = []
                    for item in raw:
                        ids.extend(self._parse_conductores(item))
                    mutable.setlist(
                        'conductores',
                        [str(x) for x in ids if str(x).strip() != ''],
                    )
            elif isinstance(data, dict) and 'conductores' in data:
                mutable = {
                    **data,
                    'conductores': self._parse_conductores(data.get('conductores')),
                }
        except Exception:
            mutable = data
        return super().to_internal_value(mutable)


class RegistroMensualSerializer(serializers.ModelSerializer):
    mes_nombre = serializers.CharField(source='get_mes_display', read_only=True)
    vehiculo_detalle = VehiculoSerializer(source='vehiculo', read_only=True)
    rendimiento = serializers.SerializerMethodField()

    class Meta:
        model = RegistroMensual
        fields = '__all__'

    def get_rendimiento(self, obj):
        litros = obj.litros
        if litros is None or Decimal(litros) <= 0:
            return None
        km = obj.kilometros_recorridos or 0
        if obj.km_inicial is not None and obj.km_final is not None:
            km = max(0, obj.km_final - obj.km_inicial)
        try:
            return round(float(Decimal(km) / Decimal(litros)), 2)
        except Exception:
            return None

    def validate(self, attrs):
        km_ini = attrs.get(
            'km_inicial',
            getattr(self.instance, 'km_inicial', None) if self.instance else None,
        )
        km_fin = attrs.get(
            'km_final',
            getattr(self.instance, 'km_final', None) if self.instance else None,
        )
        if km_ini is not None and km_fin is not None and km_fin < km_ini:
            raise serializers.ValidationError(
                {'km_final': 'El km final no puede ser menor al km inicial.'}
            )
        return attrs


class MantencionPreventivaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MantencionPreventiva
        fields = '__all__'


class IncidenteVehiculoSerializer(serializers.ModelSerializer):
    funcionario_nombre = serializers.CharField(
        source='funcionario.nombre_funcionario',
        read_only=True,
        default=None,
    )

    class Meta:
        model = IncidenteVehiculo
        fields = '__all__'


class ReparacionVehiculoSerializer(serializers.ModelSerializer):
    tipo_mantenimiento_display = serializers.CharField(
        source='get_tipo_mantenimiento_display',
        read_only=True,
    )

    class Meta:
        model = ReparacionVehiculo
        fields = '__all__'
