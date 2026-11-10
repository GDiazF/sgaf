import csv

import openpyxl  # noqa: F401 — used by other tooling; keep import stable
from django.db.models import Count, Sum
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    EmisionDocumentoVehiculo,
    IncidenteVehiculo,
    MantencionPreventiva,
    RegistroMensual,
    ReparacionVehiculo,
    Vehiculo,
    VehiculoDocumento,
    VehiculoTipoCombustible,
    VehiculoTipoDocumento,
)
from .serializers import (
    EmisionDocumentoVehiculoSerializer,
    IncidenteVehiculoSerializer,
    MantencionPreventivaSerializer,
    RegistroMensualSerializer,
    ReparacionVehiculoSerializer,
    VehiculoDocumentoSerializer,
    VehiculoSerializer,
    VehiculoTipoCombustibleSerializer,
    VehiculoTipoDocumentoSerializer,
)


class VehiculoTipoCombustibleViewSet(viewsets.ModelViewSet):
    queryset = VehiculoTipoCombustible.objects.all()
    serializer_class = VehiculoTipoCombustibleSerializer
    permission_classes = []


class VehiculoTipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = VehiculoTipoDocumento.objects.all().order_by('-es_sistema', 'nombre')
    serializer_class = VehiculoTipoDocumentoSerializer
    permission_classes = []

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.es_sistema or (instance.codigo or '').strip():
            return Response(
                {'detail': 'No se puede eliminar un tipo de documento fijo del sistema.'},
                status=400,
            )
        return super().destroy(request, *args, **kwargs)


class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = (
        Vehiculo.objects.filter(activo=True)
        .prefetch_related(
            'documentos__tipo',
            'conductores',
            'conductor_asignaciones__funcionario__subdireccion',
            'registros',
            'mantenciones_preventivas',
            'incidentes__funcionario',
            'reparaciones',
        )
        .all()
    )
    serializer_class = VehiculoSerializer
    permission_classes = []

    @action(detail=True, methods=['get', 'post'], url_path='acta-entrega')
    def acta_entrega(self, request, pk=None):
        from .pdf import build_acta_entrega_vehiculo_pdf

        vehiculo = self.get_object()
        return build_acta_entrega_vehiculo_pdf(
            vehiculo,
            user=request.user,
            request=request,
        )

    @action(detail=True, methods=['get'], url_path='emisiones')
    def emisiones(self, request, pk=None):
        vehiculo = self.get_object()
        tipo = (request.query_params.get('tipo') or EmisionDocumentoVehiculo.TIPO_ACTA).strip()
        qs = vehiculo.emisiones_documento.all()
        if tipo:
            qs = qs.filter(tipo=tipo)
        serializer = EmisionDocumentoVehiculoSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='hoja-vida')
    def hoja_vida(self, request, pk=None):
        from .pdf import build_hoja_vida_vehiculo_pdf

        vehiculo = self.get_object()
        return build_hoja_vida_vehiculo_pdf(vehiculo, user=request.user)


class VehiculoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = VehiculoDocumento.objects.all()
    serializer_class = VehiculoDocumentoSerializer
    permission_classes = []
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['vehiculo', 'tipo']


class RegistroMensualViewSet(viewsets.ModelViewSet):
    queryset = RegistroMensual.objects.select_related('vehiculo').all()
    serializer_class = RegistroMensualSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['anio', 'mes', 'vehiculo']

    def get_queryset(self):
        queryset = super().get_queryset()
        vehiculo_id = self.request.query_params.get('vehiculo')
        if vehiculo_id:
            queryset = queryset.filter(vehiculo_id=vehiculo_id)
        return queryset

    @action(detail=False, methods=['get'])
    def estadisticas_anuales(self, request):
        anio = request.query_params.get('anio', 2025)
        vehiculos_ids = request.query_params.getlist('vehiculos[]')

        registros = self.queryset.filter(anio=anio)
        if vehiculos_ids:
            registros = registros.filter(vehiculo_id__in=vehiculos_ids)

        total_gasto = registros.aggregate(
            total_bencina=Sum('gasto_bencina'),
            total_peajes=Sum('gasto_peajes'),
            total_seguros=Sum('gasto_seguros'),
            total_kms=Sum('kilometros_recorridos'),
        )

        return Response({
            'anio': anio,
            'totales': total_gasto,
            'promedio_mensual': {k: (v or 0) / 12 for k, v in total_gasto.items()},
        })

    @action(detail=False, methods=['get'])
    def exportar_excel(self, request):
        anio = request.query_params.get('anio')
        vehiculos_ids = request.query_params.getlist('vehiculos[]')

        registros = self.queryset.all()
        if anio:
            registros = registros.filter(anio=anio)
        if vehiculos_ids:
            registros = registros.filter(vehiculo_id__in=vehiculos_ids)

        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="reporte_flota.csv"'

        writer = csv.writer(response, delimiter=';')

        headers = [
            'Año',
            'Mes',
            'Número de vehículos',
            'Kilómetros mensuales recorridos',
            'Unidad monetaria',
            'Monto mensual del gasto en bencina',
            'Monto mensual del gasto en peajes',
            'Monto mensual pagado en seguros',
        ]
        writer.writerow(headers)

        sumar = request.query_params.get('sumar', 'false') == 'true'

        if sumar:
            data = (
                registros.values('anio', 'mes')
                .annotate(
                    num_vehiculos=Count('vehiculo', distinct=True),
                    total_kms=Sum('kilometros_recorridos'),
                    total_bencina=Sum('gasto_bencina'),
                    total_peajes=Sum('gasto_peajes'),
                    total_seguros=Sum('gasto_seguros'),
                )
                .order_by('-anio', 'mes')
            )

            for item in data:
                mes_nombre = dict(RegistroMensual.MESES).get(item['mes'])
                writer.writerow([
                    item['anio'],
                    mes_nombre,
                    item['num_vehiculos'],
                    item['total_kms'] or 0,
                    'Pesos',
                    item['total_bencina'] or 0,
                    item['total_peajes'] or 0,
                    item['total_seguros'] or 0,
                ])
        else:
            for r in registros.order_by('-anio', 'mes', 'vehiculo__patente'):
                writer.writerow([
                    r.anio,
                    r.get_mes_display(),
                    1,
                    r.kilometros_recorridos,
                    r.unidad_monetaria,
                    r.gasto_bencina,
                    r.gasto_peajes,
                    r.gasto_seguros,
                ])

        return response


class MantencionPreventivaViewSet(viewsets.ModelViewSet):
    queryset = MantencionPreventiva.objects.select_related('vehiculo').all()
    serializer_class = MantencionPreventivaSerializer
    permission_classes = []
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['vehiculo']
    ordering = ['-fecha', '-id']


class IncidenteVehiculoViewSet(viewsets.ModelViewSet):
    queryset = IncidenteVehiculo.objects.select_related('vehiculo', 'funcionario').all()
    serializer_class = IncidenteVehiculoSerializer
    permission_classes = []
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['vehiculo', 'funcionario']
    ordering = ['-fecha', '-id']


class ReparacionVehiculoViewSet(viewsets.ModelViewSet):
    queryset = ReparacionVehiculo.objects.select_related('vehiculo').all()
    serializer_class = ReparacionVehiculoSerializer
    permission_classes = []
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['vehiculo', 'tipo_mantenimiento']
    ordering = ['-fecha', '-id']
