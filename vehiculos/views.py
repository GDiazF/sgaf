from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from .models import RegistroMensual, Vehiculo
from .serializers import RegistroMensualSerializer, VehiculoSerializer
import openpyxl

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.filter(activo=True)
    serializer_class = VehiculoSerializer
    permission_classes = [] # Adjust if needed

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
            total_kms=Sum('kilometros_recorridos')
        )
        
        return Response({
            'anio': anio,
            'totales': total_gasto,
            'promedio_mensual': {k: (v or 0) / 12 for k, v in total_gasto.items()}
        })

    @action(detail=False, methods=['get'])
    def exportar_excel(self, request):
        import csv
        from django.db.models import Count
        
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
            "Año", "Mes", "Número de vehículos", "Kilómetros mensuales recorridos", 
            "Unidad monetaria", "Monto mensual del gasto en bencina", 
            "Monto mensual del gasto en peajes", "Monto mensual pagado en seguros"
        ]
        writer.writerow(headers)

        sumar = request.query_params.get('sumar', 'false') == 'true'

        if sumar:
            data = registros.values('anio', 'mes').annotate(
                num_vehiculos=Count('vehiculo', distinct=True),
                total_kms=Sum('kilometros_recorridos'),
                total_bencina=Sum('gasto_bencina'),
                total_peajes=Sum('gasto_peajes'),
                total_seguros=Sum('gasto_seguros')
            ).order_by('-anio', 'mes')
            
            for item in data:
                mes_nombre = dict(RegistroMensual.MESES).get(item['mes'])
                writer.writerow([
                    item['anio'],
                    mes_nombre,
                    item['num_vehiculos'],
                    item['total_kms'] or 0,
                    "Pesos",
                    item['total_bencina'] or 0,
                    item['total_peajes'] or 0,
                    item['total_seguros'] or 0
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
                    r.gasto_seguros
                ])

        return response
