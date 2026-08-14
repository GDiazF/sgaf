from rest_framework import serializers
from .models import ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion, DocumentoContrato, HistorialContrato, ContratoProveedor
from core.serializers import MediaRelativeFileField
from establecimientos.serializers import EstablecimientoSerializer

class ProcesoCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcesoCompra
        fields = '__all__'

class EstadoContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoContrato
        fields = '__all__'

class CategoriaContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaContrato
        fields = '__all__'

class OrientacionLicitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrientacionLicitacion
        fields = '__all__'

class DocumentoContratoSerializer(serializers.ModelSerializer):
    archivo = MediaRelativeFileField(required=False)
    class Meta:
        model = DocumentoContrato
        fields = '__all__'

class HistorialContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialContrato
        fields = '__all__'

class ContratoProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    monto_ejecutado = serializers.ReadOnlyField()
    monto_restante = serializers.ReadOnlyField()
    establecimientos_detalle = EstablecimientoSerializer(source='establecimientos', many=True, read_only=True)

    class Meta:
        model = ContratoProveedor
        fields = ['id', 'proveedor', 'proveedor_nombre', 'monto_adjudicado', 'monto_consumido_previo', 'monto_ejecutado', 'monto_restante', 'establecimientos', 'establecimientos_detalle']

class ContratoSerializer(serializers.ModelSerializer):
    proceso_nombre = serializers.ReadOnlyField(source='proceso.nombre')
    estado_nombre = serializers.ReadOnlyField(source='estado.nombre')
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    orientacion_nombre = serializers.ReadOnlyField(source='orientacion.nombre')
    
    proveedores_asociados = ContratoProveedorSerializer(many=True, required=False)
    monto_total = serializers.ReadOnlyField()
    monto_consumido_previo = serializers.ReadOnlyField()
    plazo_meses = serializers.ReadOnlyField()
    monto_ejecutado = serializers.ReadOnlyField()
    monto_restante = serializers.ReadOnlyField()
    gastos_mensuales = serializers.ReadOnlyField()
    
    documentos = DocumentoContratoSerializer(many=True, read_only=True)
    historial = HistorialContratoSerializer(many=True, read_only=True)

    from servicios.serializers import FacturaAdquisicionSerializer
    recepciones = FacturaAdquisicionSerializer(many=True, read_only=True)

    class Meta:
        model = Contrato
        fields = '__all__'

    def create(self, validated_data):
        proveedores_data = validated_data.pop('proveedores_asociados', [])
        
        contrato = Contrato.objects.create(**validated_data)
            
        for prov_data in proveedores_data:
            est_data = prov_data.pop('establecimientos', [])
            cp = ContratoProveedor.objects.create(contrato=contrato, **prov_data)
            if est_data:
                cp.establecimientos.set(est_data)

        contrato.ensure_gestion_operativa()
        return contrato

    def update(self, instance, validated_data):
        proveedores_data = validated_data.pop('proveedores_asociados', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
            
        if proveedores_data is not None:
            instance.proveedores_asociados.all().delete()
            for prov_data in proveedores_data:
                est_data = prov_data.pop('establecimientos', [])
                cp = ContratoProveedor.objects.create(contrato=instance, **prov_data)
                if est_data:
                    cp.establecimientos.set(est_data)

        instance.ensure_gestion_operativa()
        return instance

# =====================================================================
# MÓDULO DE SERVICIOS OPERATIVOS (TRANSPORTE, ETC.)
# =====================================================================

from .models import TipoServicioOperativo, ServicioContrato, RutaTransporte, PeriodoCobro, AusenciaRuta, FeriadoNacional, GrupoPresetRutas

class GrupoPresetRutasSerializer(serializers.ModelSerializer):
    class Meta:
        model = GrupoPresetRutas
        fields = '__all__'

class TipoServicioOperativoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicioOperativo
        fields = '__all__'

class ServicioContratoSerializer(serializers.ModelSerializer):
    contrato_nombre = serializers.ReadOnlyField(source='contrato.codigo_mercado_publico')
    tipo_servicio_nombre = serializers.ReadOnlyField(source='tipo_servicio.nombre')
    tipo_servicio_icono = serializers.ReadOnlyField(source='tipo_servicio.icono')
    es_transporte = serializers.ReadOnlyField()
    es_mensual = serializers.ReadOnlyField()

    class Meta:
        model = ServicioContrato
        fields = '__all__'

    def validate(self, data):
        contrato = data.get('contrato') or getattr(self.instance, 'contrato', None)
        tipo = data.get('tipo_servicio') or getattr(self.instance, 'tipo_servicio', None)
        if contrato:
            qs = ServicioContrato.objects.filter(contrato=contrato)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {'contrato': 'Este contrato ya tiene una gestión operativa.'}
                )
        es_transporte = False
        if tipo:
            es_transporte = bool(tipo.es_transporte) or 'transporte' in (tipo.nombre or '').lower()
        if es_transporte:
            data['modalidad_cobro'] = ServicioContrato.MODALIDAD_DIARIO
            data['monto_mensual'] = None
        else:
            modalidad = data.get('modalidad_cobro')
            if modalidad is None and self.instance:
                modalidad = self.instance.modalidad_cobro
            if not modalidad or modalidad == ServicioContrato.MODALIDAD_DIARIO:
                modalidad = ServicioContrato.MODALIDAD_MENSUAL_POR_EST
                data['modalidad_cobro'] = modalidad
            if modalidad == ServicioContrato.MODALIDAD_MENSUAL_UNICO:
                monto = data.get('monto_mensual', getattr(self.instance, 'monto_mensual', None))
                if not monto:
                    raise serializers.ValidationError(
                        {'monto_mensual': 'Indique el monto mensual que aplica a todos los colegios.'}
                    )
        return data

class PeriodoCobroSerializer(serializers.ModelSerializer):
    nombre_estandarizado = serializers.ReadOnlyField()
    dias_trabajados = serializers.ReadOnlyField()
    dias_base = serializers.ReadOnlyField()
    monto_total = serializers.ReadOnlyField()
    ausencias = serializers.SerializerMethodField()

    class Meta:
        model = PeriodoCobro
        fields = '__all__'

    def get_ausencias(self, obj):
        return [ausencia.fecha.strftime('%Y-%m-%d') for ausencia in obj.ausencias.all()]

class RutaTransporteSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.ReadOnlyField(source='proveedor.nombre')
    establecimientos_detalle = EstablecimientoSerializer(source='establecimientos', many=True, read_only=True)
    periodos = PeriodoCobroSerializer(many=True, read_only=True)

    class Meta:
        model = RutaTransporte
        fields = '__all__'

    def validate(self, data):
        servicio = data.get('servicio') or getattr(self.instance, 'servicio', None)
        proveedor = data.get('proveedor') or getattr(self.instance, 'proveedor', None)
        establecimientos = data.get('establecimientos')
        if establecimientos is None and self.instance:
            establecimientos = list(self.instance.establecimientos.all())
        est_ids = []
        for item in establecimientos or []:
            est_ids.append(item.pk if hasattr(item, 'pk') else int(item))

        if servicio and servicio.es_mensual:
            if len(est_ids) != 1:
                raise serializers.ValidationError(
                    {'establecimientos': 'Seleccione un solo establecimiento.'}
                )
            if servicio.modalidad_cobro == ServicioContrato.MODALIDAD_MENSUAL_UNICO:
                data['valor_mensual'] = servicio.monto_mensual
            elif not (data.get('valor_mensual') or getattr(self.instance, 'valor_mensual', None)):
                raise serializers.ValidationError(
                    {'valor_mensual': 'Indique el monto mensual de este establecimiento.'}
                )
            data['valor_diario'] = data.get('valor_diario') or 0
            if proveedor:
                qs = RutaTransporte.objects.filter(
                    servicio=servicio,
                    proveedor=proveedor,
                    establecimientos__in=est_ids,
                )
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError(
                        {'establecimientos': 'Este establecimiento ya está en la gestión para este proveedor.'}
                    )
        return data

class AusenciaRutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AusenciaRuta
        fields = '__all__'

    def validate(self, data):
        # We handle validation for both creation and updates
        periodo = data.get('periodo', getattr(self.instance, 'periodo', None))
        fecha = data.get('fecha', getattr(self.instance, 'fecha', None))

        if not periodo:
            raise serializers.ValidationError({"periodo": "El periodo es requerido."})

        from django.core.exceptions import ValidationError as DjangoValidationError
        if fecha:
            try:
                periodo.validar_fecha(fecha)
            except DjangoValidationError as e:
                raise serializers.ValidationError({"fecha": e.messages[0]})

        return data

    def create(self, validated_data):
        from django.db import IntegrityError
        try:
            return super().create(validated_data)
        except IntegrityError:
            raise serializers.ValidationError({
                "fecha": "Ya existe una ausencia registrada para esta fecha en el periodo."
            })

class FeriadoNacionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeriadoNacional
        fields = '__all__'
