from rest_framework import serializers
from django.db import transaction
from .models import (
    ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion,
    DocumentoContrato, HistorialContrato, ContratoProveedor, AmpliacionContrato,
)
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


class AmpliacionContratoSerializer(serializers.ModelSerializer):
    documento = MediaRelativeFileField(required=False, allow_null=True)
    eliminar_documento = serializers.BooleanField(required=False, write_only=True, default=False)

    class Meta:
        model = AmpliacionContrato
        fields = [
            'id', 'contrato', 'fecha_termino_anterior', 'fecha_inicio', 'fecha_termino',
            'nro_resolucion', 'motivo', 'monto', 'porcentaje', 'documento', 'eliminar_documento',
            'created_at', 'usuario',
        ]
        read_only_fields = ['fecha_termino_anterior', 'created_at', 'usuario']

    def _fmt_monto(self, monto):
        if monto is None:
            return ''
        return f' Monto: ${int(monto):,}.'.replace(',', '.')

    @staticmethod
    def _doc_nombre(ampliacion):
        return (
            f'Ampliación {ampliacion.fecha_inicio} – {ampliacion.fecha_termino}'
            + (f' ({ampliacion.nro_resolucion})' if ampliacion.nro_resolucion else '')
        )[:255]

    def _sync_documento_expediente(self, ampliacion, *, old_nombre=None, replace_file=False, clear=False):
        """Mantiene alineado el archivo en la pestaña Archivos del contrato."""
        import os
        from django.core.files.base import ContentFile

        contrato = ampliacion.contrato
        new_nombre = self._doc_nombre(ampliacion)
        nombres = {n for n in (old_nombre, new_nombre) if n}
        qs = DocumentoContrato.objects.filter(contrato=contrato, nombre__in=nombres)

        if clear:
            qs.delete()
            return

        if not ampliacion.documento:
            return

        if not replace_file:
            if old_nombre and old_nombre != new_nombre:
                qs.filter(nombre=old_nombre).update(nombre=new_nombre)
            return

        base_name = os.path.basename(ampliacion.documento.name)
        with ampliacion.documento.open('rb') as fh:
            content = ContentFile(fh.read(), name=base_name)

        existing = qs.order_by('id').first()
        if existing:
            qs.exclude(pk=existing.pk).delete()
            if existing.archivo:
                existing.archivo.delete(save=False)
            existing.nombre = new_nombre
            existing.archivo.save(base_name, content, save=True)
        else:
            DocumentoContrato.objects.create(
                contrato=contrato,
                nombre=new_nombre,
                archivo=content,
            )

    def validate(self, attrs):
        instance = self.instance
        contrato = attrs.get('contrato') or (instance.contrato if instance else None)
        if contrato is None and self.context.get('contrato'):
            contrato = self.context['contrato']
        fecha_inicio = attrs.get(
            'fecha_inicio',
            getattr(instance, 'fecha_inicio', None) if instance else None,
        )
        fecha_termino = attrs.get(
            'fecha_termino',
            getattr(instance, 'fecha_termino', None) if instance else None,
        )
        if fecha_inicio and fecha_termino and fecha_termino < fecha_inicio:
            raise serializers.ValidationError({
                'fecha_termino': 'El nuevo término debe ser igual o posterior al inicio de la ampliación.',
            })
        if instance:
            if (
                fecha_termino
                and instance.fecha_termino_anterior
                and fecha_termino <= instance.fecha_termino_anterior
            ):
                raise serializers.ValidationError({
                    'fecha_termino': (
                        'El nuevo término debe ser posterior al término previo '
                        f'({instance.fecha_termino_anterior}).'
                    ),
                })
        elif contrato and fecha_termino and fecha_termino <= contrato.fecha_termino:
            raise serializers.ValidationError({
                'fecha_termino': (
                    f'El nuevo término debe ser posterior al término vigente '
                    f'({contrato.fecha_termino}).'
                ),
            })
        monto = attrs.get('monto', serializers.empty)
        if monto is not serializers.empty and monto is not None and monto < 0:
            raise serializers.ValidationError({'monto': 'El monto no puede ser negativo.'})
        return attrs

    def _sync_contrato_termino(self, contrato):
        from django.db.models import Max

        max_term = contrato.ampliaciones.aggregate(m=Max('fecha_termino'))['m']
        if max_term:
            contrato.fecha_termino = max_term
            contrato.save(update_fields=['fecha_termino', 'updated_at'])

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data.pop('eliminar_documento', None)

        contrato = validated_data.get('contrato') or self.context.get('contrato')
        if contrato is None:
            raise serializers.ValidationError({'contrato': 'Contrato requerido.'})
        validated_data['contrato'] = contrato

        validated_data['fecha_termino_anterior'] = contrato.fecha_termino
        if not validated_data.get('fecha_inicio'):
            validated_data['fecha_inicio'] = contrato.fecha_termino

        user = ''
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            user = request.user.get_full_name() or request.user.username
        validated_data['usuario'] = user or 'Sistema'

        if validated_data.get('monto') in ('', None) and 'monto' in validated_data:
            validated_data['monto'] = None
        if validated_data.get('porcentaje') in ('', None) and 'porcentaje' in validated_data:
            validated_data['porcentaje'] = None

        documento = validated_data.pop('documento', None)
        ampliacion = AmpliacionContrato(**validated_data)
        if documento:
            ampliacion.documento = documento
        ampliacion.full_clean()
        ampliacion.save()

        self._sync_contrato_termino(contrato)

        HistorialContrato.objects.create(
            contrato=contrato,
            accion='AMPLIACION',
            detalle=(
                f'Se registró ampliación de vigencia: '
                f'{ampliacion.fecha_inicio} → {ampliacion.fecha_termino} '
                f'(término previo {ampliacion.fecha_termino_anterior}).'
                + (f' Res. {ampliacion.nro_resolucion}.' if ampliacion.nro_resolucion else '')
                + self._fmt_monto(ampliacion.monto)
            ),
            usuario=user or 'Sistema',
        )

        if ampliacion.documento:
            self._sync_documento_expediente(ampliacion, replace_file=True)

        return ampliacion

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = ''
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            user = request.user.get_full_name() or request.user.username

        validated_data.pop('contrato', None)  # no se reasigna

        if validated_data.get('monto') in ('', None) and 'monto' in validated_data:
            validated_data['monto'] = None
        if validated_data.get('porcentaje') in ('', None) and 'porcentaje' in validated_data:
            validated_data['porcentaje'] = None

        eliminar_documento = bool(validated_data.pop('eliminar_documento', False))
        documento = validated_data.pop('documento', serializers.empty)
        old_nombre = self._doc_nombre(instance)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        replace_file = False
        clear = False
        if eliminar_documento and documento is serializers.empty:
            if instance.documento:
                instance.documento.delete(save=False)
                instance.documento = None
            clear = True
        elif documento is not serializers.empty:
            if documento is None:
                if instance.documento:
                    instance.documento.delete(save=False)
                    instance.documento = None
                clear = True
            else:
                if instance.documento:
                    instance.documento.delete(save=False)
                instance.documento = documento
                replace_file = True

        instance.full_clean()
        instance.save()

        contrato = instance.contrato
        self._sync_contrato_termino(contrato)

        HistorialContrato.objects.create(
            contrato=contrato,
            accion='AMPLIACION',
            detalle=(
                f'Se actualizó ampliación de vigencia: '
                f'{instance.fecha_inicio} → {instance.fecha_termino} '
                f'(término previo {instance.fecha_termino_anterior}).'
                + (f' Res. {instance.nro_resolucion}.' if instance.nro_resolucion else '')
                + self._fmt_monto(instance.monto)
            ),
            usuario=user or 'Sistema',
        )

        self._sync_documento_expediente(
            instance,
            old_nombre=old_nombre,
            replace_file=replace_file,
            clear=clear,
        )

        return instance


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
    plantilla_recepcion_servicio_nombre = serializers.SerializerMethodField()
    
    proveedores_asociados = ContratoProveedorSerializer(many=True, required=False)
    monto_total = serializers.ReadOnlyField()
    monto_adjudicado = serializers.ReadOnlyField()
    monto_ampliaciones = serializers.ReadOnlyField()
    monto_consumido_previo = serializers.ReadOnlyField()
    plazo_meses = serializers.ReadOnlyField()
    monto_ejecutado = serializers.ReadOnlyField()
    monto_restante = serializers.ReadOnlyField()
    gastos_mensuales = serializers.ReadOnlyField()
    
    documentos = DocumentoContratoSerializer(many=True, read_only=True)
    historial = HistorialContratoSerializer(many=True, read_only=True)
    ampliaciones = AmpliacionContratoSerializer(many=True, read_only=True)

    from servicios.serializers import FacturaAdquisicionSerializer
    recepciones = FacturaAdquisicionSerializer(many=True, read_only=True)

    PUBLISH_REQUIRED = {
        'codigo_mercado_publico': 'Código Mercado Público',
        'descripcion': 'Descripción',
        'proceso': 'Proceso de compra',
        'estado': 'Estado',
        'categoria': 'Categoría',
        'fecha_adjudicacion': 'Fecha de adjudicación',
        'fecha_inicio': 'Fecha de inicio',
        'fecha_termino': 'Fecha de término',
        'plantilla_cobro': 'Plantilla de cobro',
    }

    class Meta:
        model = Contrato
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def _effective(self, attrs):
        inst = self.instance
        if not inst:
            return attrs
        merged = {}
        for field in self.PUBLISH_REQUIRED:
            merged[field] = attrs[field] if field in attrs else getattr(inst, field)
        return merged

    def _validate_publicado(self, data):
        errors = {}
        for field, label in self.PUBLISH_REQUIRED.items():
            val = data.get(field)
            if val is None or val == '':
                errors[field] = f'{label} es obligatorio para crear el contrato.'
        if not errors and data.get('fecha_inicio') and data.get('fecha_termino'):
            if data['fecha_termino'] < data['fecha_inicio']:
                errors['fecha_termino'] = 'La fecha de término debe ser posterior al inicio.'
        if errors:
            raise serializers.ValidationError(errors)

    def get_plantilla_recepcion_servicio_nombre(self, obj):
        plantilla = getattr(obj, 'plantilla_recepcion_servicio', None)
        return plantilla.nombre if plantilla else None

    def validate_codigo_mercado_publico(self, value):
        if not value or not str(value).strip():
            return None
        value = str(value).strip()
        qs = Contrato.objects.filter(codigo_mercado_publico=value, es_borrador=False)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'Ya existe un contrato publicado con este código de Mercado Público.'
            )
        return value

    def validate_plantilla_recepcion_servicio(self, value):
        if value is None:
            return value
        if value.proposito != 'recepcion_servicio':
            raise serializers.ValidationError(
                'La plantilla debe tener propósito «Recepción de servicio».'
            )
        if not value.activa:
            raise serializers.ValidationError('La plantilla seleccionada debe estar activa.')
        return value

    def validate(self, attrs):
        publicar = self.context.get('publicar', False)
        if publicar:
            self._validate_publicado(self._effective(attrs))
        elif not self.partial:
            es_borrador = attrs.get(
                'es_borrador',
                getattr(self.instance, 'es_borrador', False) if self.instance else False,
            )
            if not es_borrador:
                self._validate_publicado(self._effective(attrs))
        return attrs

    def _save_proveedores(self, contrato, proveedores_data):
        if proveedores_data is None:
            return
        contrato.proveedores_asociados.all().delete()
        for prov_data in proveedores_data:
            est_data = prov_data.pop('establecimientos', [])
            cp = ContratoProveedor.objects.create(contrato=contrato, **prov_data)
            if est_data:
                cp.establecimientos.set(est_data)

    def create(self, validated_data):
        proveedores_data = validated_data.pop('proveedores_asociados', [])
        es_borrador = validated_data.get('es_borrador', False)
        contrato = Contrato.objects.create(**validated_data)
        self._save_proveedores(contrato, proveedores_data)
        if not es_borrador:
            contrato.ensure_gestion_operativa()
        return contrato

    def update(self, instance, validated_data):
        proveedores_data = validated_data.pop('proveedores_asociados', None)
        publicar = self.context.get('publicar', False)
        if publicar:
            validated_data['es_borrador'] = False

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        self._save_proveedores(instance, proveedores_data)

        if not instance.es_borrador:
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
    es_mensual_mixto = serializers.ReadOnlyField()
    es_volumetrico = serializers.ReadOnlyField()
    es_linea_por_establecimiento = serializers.ReadOnlyField()
    permite_recepcion_servicio = serializers.ReadOnlyField()

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
        plantilla = None
        if contrato:
            plantilla = getattr(contrato, 'plantilla_cobro', None)
        if es_transporte:
            data['modalidad_cobro'] = ServicioContrato.MODALIDAD_DIARIO
            data['monto_mensual'] = None
        elif plantilla == Contrato.PLANTILLA_VOLUMETRICO:
            data['modalidad_cobro'] = ServicioContrato.MODALIDAD_POR_M3
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
            # MENSUAL_FIJO_VARIABLE: monto_mensual opcional (sugiere fijo por defecto)
        return data

class PeriodoCobroSerializer(serializers.ModelSerializer):
    nombre_estandarizado = serializers.ReadOnlyField()
    dias_trabajados = serializers.ReadOnlyField()
    dias_base = serializers.ReadOnlyField()
    monto_total = serializers.ReadOnlyField()
    ausencias = serializers.SerializerMethodField()
    volumenes_dia = serializers.SerializerMethodField()

    class Meta:
        model = PeriodoCobro
        fields = '__all__'

    def get_ausencias(self, obj):
        return [ausencia.fecha.strftime('%Y-%m-%d') for ausencia in obj.ausencias.all()]

    def get_volumenes_dia(self, obj):
        from documentos.context_builders import _fmt_m3
        return {
            vd.fecha.strftime('%Y-%m-%d'): _fmt_m3(vd.volumen_m3)
            for vd in obj.volumenes_dia.all()
        }

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

        if servicio and servicio.es_volumetrico:
            if len(est_ids) != 1:
                raise serializers.ValidationError(
                    {'establecimientos': 'Seleccione un solo establecimiento.'}
                )
            if not (data.get('precio_m3') or getattr(self.instance, 'precio_m3', None)):
                raise serializers.ValidationError(
                    {'precio_m3': 'Indique el precio por metro cúbico ($/m³).'}
                )
            data['valor_diario'] = data.get('valor_diario') or 0
            data['valor_mensual'] = None
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
        elif servicio and servicio.es_mensual:
            if len(est_ids) != 1:
                raise serializers.ValidationError(
                    {'establecimientos': 'Seleccione un solo establecimiento.'}
                )
            if servicio.modalidad_cobro == ServicioContrato.MODALIDAD_MENSUAL_UNICO:
                data['valor_mensual'] = servicio.monto_mensual
            elif servicio.es_mensual_mixto:
                data['valor_diario'] = data.get('valor_diario') or 0
            elif not (data.get('valor_mensual') or getattr(self.instance, 'valor_mensual', None)):
                raise serializers.ValidationError(
                    {'valor_mensual': 'Indique el monto mensual de este establecimiento.'}
                )
            if not servicio.es_mensual_mixto:
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
