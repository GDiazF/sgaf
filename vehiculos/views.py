from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.http import HttpResponse
from .models import RegistroMensual
from .serializers import RegistroMensualSerializer
import openpyxl

class RegistroMensualViewSet(viewsets.ModelViewSet):
    queryset = RegistroMensual.objects.all()
    serializer_class = RegistroMensualSerializer
    pagination_class = None  # Disable pagination for the dashboard

    def get_queryset(self):
        queryset = RegistroMensual.objects.all()
        anio = self.request.query_params.get('anio')
        if anio:
            queryset = queryset.filter(anio=anio)
        return queryset

    @action(detail=False, methods=['get'])
    def estadisticas_anuales(self, request):
        anio = request.query_params.get('anio', 2025)
        registros = self.queryset.filter(anio=anio)
        
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
        anio = request.query_params.get('anio')
        if anio:
            registros = self.queryset.filter(anio=anio).order_by('mes')
            filename = f"reporte_flota_{anio}.xlsx"
        else:
            registros = self.queryset.all().order_by('-anio', 'mes')
            filename = "reporte_flota_completo.xlsx"

        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "Reporte Flota"

        # Headers
        headers = ["Año", "Mes", "N° Vehículos", "Kms Recorridos", "Gasto Bencina", "Gasto Peajes", "Gasto Seguros", "Total Mensual"]
        sheet.append(headers)

        for registro in registros:
            total_mes = registro.gasto_bencina + registro.gasto_peajes + registro.gasto_seguros
            sheet.append([
                registro.anio,
                registro.get_mes_display(),
                registro.numero_vehiculos,
                registro.kilometros_recorridos,
                registro.gasto_bencina,
                registro.gasto_peajes,
                registro.gasto_seguros,
                total_mes
            ])

        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = f'attachment; filename={filename}'
        workbook.save(response)
        return response
