import datetime
import calendar
import logging
from django.db import transaction
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from establecimientos.pagination import LargeResultsSetPagination

from .models import (
    ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, 
    OrientacionLicitacion, DocumentoContrato, HistorialContrato,
    TipoServicioOperativo, ServicioContrato, RutaTransporte, PeriodoCobro, AusenciaRuta,
    FeriadoNacional, GrupoPresetRutas
)
from .serializers import (
    ProcesoCompraSerializer, EstadoContratoSerializer, CategoriaContratoSerializer, 
    ContratoSerializer, OrientacionLicitacionSerializer, DocumentoContratoSerializer,
    TipoServicioOperativoSerializer, ServicioContratoSerializer, RutaTransporteSerializer,
    PeriodoCobroSerializer, AusenciaRutaSerializer, FeriadoNacionalSerializer,
    GrupoPresetRutasSerializer
)

logger = logging.getLogger(__name__)

class ProcesoCompraViewSet(viewsets.ModelViewSet):
    queryset = ProcesoCompra.objects.all()
    serializer_class = ProcesoCompraSerializer

class EstadoContratoViewSet(viewsets.ModelViewSet):
    queryset = EstadoContrato.objects.all()
    serializer_class = EstadoContratoSerializer

class CategoriaContratoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaContrato.objects.all()
    serializer_class = CategoriaContratoSerializer

class OrientacionLicitacionViewSet(viewsets.ModelViewSet):
    queryset = OrientacionLicitacion.objects.all()
    serializer_class = OrientacionLicitacionSerializer

class DocumentoContratoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoContrato.objects.all()
    serializer_class = DocumentoContratoSerializer
    filterset_fields = ['contrato']

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['proceso', 'estado', 'categoria', 'orientacion']
    search_fields = ['codigo_mercado_publico', 'descripcion', 'id_licitacion']
    ordering_fields = ['fecha_inicio', 'monto_total', 'created_at']

    def perform_update(self, serializer):
        user = self.request.user
        instance = serializer.save()
        HistorialContrato.objects.create(
            contrato=instance,
            accion="MODIFICACION",
            detalle="Se actualizaron los datos básicos del contrato.",
            usuario=user
        )

# =====================================================================
# MÓDULO DE SERVICIOS OPERATIVOS (TRANSPORTE, ETC.)
# =====================================================================

class TipoServicioOperativoViewSet(viewsets.ModelViewSet):
    queryset = TipoServicioOperativo.objects.all()
    serializer_class = TipoServicioOperativoSerializer

class ServicioContratoViewSet(viewsets.ModelViewSet):
    queryset = ServicioContrato.objects.select_related('contrato', 'tipo_servicio').all()
    serializer_class = ServicioContratoSerializer
    filterset_fields = ['contrato', 'tipo_servicio']

    @action(detail=True, methods=['post'])
    def generar_acta_conformidad(self, request, pk=None):
        import io
        import os
        import datetime
        from django.http import FileResponse
        from django.conf import settings
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, mm
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib.colors import HexColor
        from reportlab.lib.utils import ImageReader

        servicio = self.get_object()
        ruta_ids = request.data.get('ruta_ids', [])
        periodo_ids = request.data.get('periodo_ids', [])
        est_ids = request.data.get('est_ids', [])

        buffer = io.BytesIO()
        FOLIO = (216*mm, 330*mm) # VERTICAL (OFICIO)
        doc = SimpleDocTemplate(buffer, pagesize=FOLIO, rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
        elements = []
        styles = getSampleStyleSheet()

        # Colores
        rojo_alerta = HexColor('#FF0000') 
        amarillo_feriado = HexColor('#FFFF00')
        verde_total = HexColor('#28A745')

        styles.add(ParagraphStyle(name='ActaTitle', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=10, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='ActaSubTitle', parent=styles['Heading1'], alignment=TA_CENTER, fontSize=9, fontName='Helvetica-Bold'))
        styles.add(ParagraphStyle(name='ActaNormal', parent=styles['Normal'], fontSize=8, leading=10))
        styles.add(ParagraphStyle(name='ActaSmall', parent=styles['Normal'], fontSize=8, leading=10))
        styles.add(ParagraphStyle(name='GridHeader', parent=styles['Normal'], fontSize=7, fontName='Helvetica-Bold', alignment=TA_CENTER))

        # 1. ENCABEZADO
        # Subir un nivel desde backend para llegar a la raíz del proyecto
        PROJECT_ROOT = os.path.dirname(settings.BASE_DIR)
        logo_slep_path = os.path.join(PROJECT_ROOT, 'frontend', 'public', 'Logo SLEP.png')
        def get_img(path, w):
            if os.path.exists(path):
                img = ImageReader(path)
                iw, ih = img.getSize()
                aspect = ih / float(iw)
                return Image(path, width=w, height=w * aspect)
            return Paragraph("", styles['Normal'])

        header_data = [
            [get_img(logo_slep_path, 1.4*inch), 
             [Paragraph("SERVICIO LOCAL DE EDUCACIÓN PÚBLICA DE IQUIQUE", styles['ActaTitle']),
              Paragraph("VISTO BUENO DE RECORRIDOS DE BUSES", styles['ActaSubTitle'])], 
             ""]
        ]
        TOTAL_W = 216*mm - 40
        header_table = Table(header_data, colWidths=[1.5*inch, TOTAL_W - 3*inch, 1.5*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (1,0), (1,0), 'CENTER'), 
            ('VALIGN', (0,0), (-1,-1), 'TOP'), # Alineado arriba
            ('TOPPADDING', (0,0), (-1,-1), 8), # Un pequeño ajuste para que calce perfecto
            ('BOX', (0,0), (-1,-1), 1.5, colors.black)
        ]))
        elements.append(header_table)

        # Info de contexto
        from establecimientos.models import Establecimiento
        est_objs = Establecimiento.objects.filter(id__in=est_ids)
        est_nombres = "VARIOS ESTABLECIMIENTOS" if est_objs.count() > 1 else (est_objs.first().nombre if est_objs.exists() else "N/A")
        director_val = est_objs.first().director if est_objs.count() == 1 else ""

        rutas_objs = RutaTransporte.objects.filter(id__in=ruta_ids).prefetch_related('periodos').order_by('nombre')
        periodos_sel = PeriodoCobro.objects.filter(id__in=periodo_ids)
        if periodos_sel.exists():
            f_min = min([p.fecha_inicio for p in periodos_sel])
            f_max = max([p.fecha_fin for p in periodos_sel])
            periodo_str = f"{f_min.strftime('%d/%m/%Y')} al {f_max.strftime('%d/%m/%Y')}"
        else:
            periodo_str = "N/A"

        info_data = [
            [Paragraph(f"<b>Establecimiento:</b>", styles['ActaNormal']), Paragraph(est_nombres.upper(), styles['ActaNormal'])],
            [Paragraph(f"<b>Director(a):</b>", styles['ActaNormal']), Paragraph(director_val.upper(), styles['ActaNormal'])],
            [Paragraph(f"<b>Periodo:</b>", styles['ActaNormal']), Paragraph(periodo_str, styles['ActaNormal'])]
        ]
        info_table = Table(info_data, colWidths=[1.5*inch, TOTAL_W - 1.5*inch])
        info_table.setStyle(TableStyle([
            ('GRID', (0,0), (-1,-1), 0.5, colors.black), ('BOX', (0,0), (-1,-1), 1.5, colors.black), 
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LEFTPADDING', (1,0), (1,2), 10)
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 5)) # Reducido

        # 2. TABLA DE RECORRIDOS
        elements.append(Table([[Paragraph("<b>Resumen de Recorridos del Mes</b>", styles['GridHeader'])]], colWidths=[TOTAL_W], style=[
            ('GRID', (0,0), (-1,-1), 0.5, colors.black), ('BOX', (0,0), (-1,-1), 1.5, colors.black),
            ('BACKGROUND', (0,0), (-1,-1), colors.whitesmoke)
        ]))
        
        if periodos_sel.exists():
            all_days = []
            curr = f_min
            while curr <= f_max:
                all_days.append(curr); curr += datetime.timedelta(days=1)
            
            month_names = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
            meses_row = [""]; current_month_key = None; span_count = 0; month_spans = []
            for d in all_days:
                m_key = f"{month_names[d.month - 1]} {d.year}"
                if m_key != current_month_key:
                    if current_month_key: month_spans.append((current_month_key, span_count))
                    current_month_key = m_key; span_count = 1
                else: span_count += 1
                meses_row.append("")
            month_spans.append((current_month_key, span_count)); meses_row.append("")

            days_num_row = ["RUTA"]; 
            for d in all_days: days_num_row.append(str(d.day))
            days_num_row.append("TOTAL")

            data_grid = [meses_row, days_num_row]
            grid_style = [
                ('GRID', (0,0), (-1,-1), 0.5, colors.black), ('BOX', (0,0), (-1,-1), 1.5, colors.black),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('FONTSIZE', (0,0), (-1,-1), 5.5), ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ]

            col_idx = 1
            for m_label, span in month_spans:
                data_grid[0][col_idx] = m_label
                if span > 1: grid_style.append(('SPAN', (col_idx, 0), (col_idx + span - 1, 0)))
                col_idx += span

            feriados = list(FeriadoNacional.objects.values_list('fecha', flat=True))
            for r_idx, r in enumerate(rutas_objs):
                row = [r.nombre]; row_total = 0
                for d in all_days:
                    p_ruta = r.periodos.filter(fecha_inicio__lte=d, fecha_fin__gte=d).first()
                    if not p_ruta:
                        row.append(""); continue
                    is_feriado = d in feriados
                    is_habil = True if r.incluir_fines_semana or d.weekday() < 5 else False
                    is_ausente = p_ruta.ausencias.filter(fecha=d).exists()
                    if not is_feriado and is_habil and not is_ausente:
                        row.append("1"); row_total += 1
                    else:
                        row.append("")
                        if is_feriado: grid_style.append(('BACKGROUND', (len(row)-1, r_idx + 2), (len(row)-1, r_idx + 2), amarillo_feriado))
                        else: grid_style.append(('BACKGROUND', (len(row)-1, r_idx + 2), (len(row)-1, r_idx + 2), rojo_alerta))
                row.append(str(row_total)); data_grid.append(row)
            
            day_w = (TOTAL_W - 1.4*inch) / len(all_days)
            col_widths = [0.9*inch] + [day_w]*len(all_days) + [0.5*inch]
            main_table = Table(data_grid, colWidths=col_widths)
            grid_style.append(('BACKGROUND', (-1, 1), (-1, -1), verde_total))
            grid_style.append(('TEXTCOLOR', (-1, 1), (-1, -1), colors.white))
            grid_style.append(('FONTNAME', (-1, 1), (-1, -1), 'Helvetica-Bold'))
            main_table.setStyle(TableStyle(grid_style))
            elements.append(main_table)

        # 3. OBSERVACIONES
        elements.append(Spacer(1, 5)) # Reducido
        elements.append(Table([[Paragraph("<b>Observaciones:</b>", styles['ActaNormal'])]], colWidths=[TOTAL_W], style=[('LEFTPADDING', (0,0), (0,0), 0)]))
        obs_box_data = [[Paragraph(f"<b>{r.nombre.upper()}:</b> {r.itinerario or 'SIN DETALLE'}", styles['ActaSmall'])] for r in rutas_objs]
        obs_table = Table(obs_box_data, colWidths=[TOTAL_W])
        obs_table.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.5, colors.black), ('BOX', (0,0), (-1,-1), 1.5, colors.black)]))
        elements.append(obs_table)

        # 4. FIRMAS (Compactado máximo)
        elements.append(Spacer(1, 5)) # Reducido
        styles.add(ParagraphStyle(name='SigText', parent=styles['Normal'], fontSize=7.5, leading=8.5, alignment=TA_CENTER))
        
        firmas_rows = []
        current_row_sigs = []
        for est in est_objs.order_by('nombre'):
            rutas_del_colegio = rutas_objs.filter(establecimientos=est).values_list('nombre', flat=True)
            rutas_str = ", ".join(rutas_del_colegio)
            
            f_content = [[Spacer(1, 45)], [Paragraph(f"<b>{est.nombre.upper()}</b>", styles['SigText'])], [Paragraph(rutas_str, styles['SigText'])]]
            # Altura equilibrada: 45 + 15 + 15 = 75pt
            f_sub_table = Table(f_content, colWidths=[(TOTAL_W - 10)/2], rowHeights=[45, 15, 15])
            f_sub_table.setStyle(TableStyle([
                ('GRID', (0,0), (-1,-1), 0.5, colors.black),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 3), ('RIGHTPADDING', (0,0), (-1,-1), 3),
                ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            current_row_sigs.append(f_sub_table)
            if len(current_row_sigs) == 2:
                firmas_rows.append(current_row_sigs); current_row_sigs = []
        
        if current_row_sigs:
            current_row_sigs.append(""); firmas_rows.append(current_row_sigs)

        if firmas_rows:
            sig_master_table = Table(firmas_rows, colWidths=[TOTAL_W/2, TOTAL_W/2])
            sig_master_table.setStyle(TableStyle([
                ('BOX', (0,0), (-1,-1), 1.5, colors.black),
                ('VALIGN', (0,0), (-1,-1), 'TOP'), ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2), # Relleno mínimo
            ]))
            elements.append(sig_master_table)

        doc.build(elements)
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"Visto_Bueno_Rutas_{servicio.id}.pdf")

class RutaTransporteViewSet(viewsets.ModelViewSet):
    queryset = RutaTransporte.objects.select_related('servicio', 'proveedor').prefetch_related('establecimientos', 'periodos', 'periodos__ausencias').all()
    serializer_class = RutaTransporteSerializer
    pagination_class = None # Ver todas las rutas sin paginación
    filterset_fields = ['servicio', 'proveedor']

    @action(detail=True, methods=['post'], url_path='generar-periodo')
    def generar_periodo(self, request, pk=None):
        ruta = self.get_object()
        mes = int(request.data.get('mes'))
        anio = int(request.data.get('anio'))
        
        # Lógica de cálculo de rango de fechas personalizada
        if ruta.dia_inicio_periodo <= ruta.dia_fin_periodo:
            fecha_inicio = datetime.date(anio, mes, ruta.dia_inicio_periodo)
            fecha_fin = datetime.date(anio, mes, ruta.dia_fin_periodo)
        else:
            fecha_fin = datetime.date(anio, mes, ruta.dia_fin_periodo)
            if mes == 1:
                prev_mes, prev_anio = 12, anio - 1
            else:
                prev_mes, prev_anio = mes - 1, anio
            fecha_inicio = datetime.date(prev_anio, prev_mes, ruta.dia_inicio_periodo)

        if PeriodoCobro.objects.filter(ruta=ruta, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin).exists():
            return Response({"error": "Ya existe un periodo con este rango de fechas para esta ruta."}, status=status.HTTP_400_BAD_REQUEST)

        periodo = PeriodoCobro.objects.create(
            ruta=ruta,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin,
            mes_referencia=mes,
            anio_referencia=anio
        )
        return Response(PeriodoCobroSerializer(periodo).data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='bulk-generar-periodo')
    def bulk_generar_periodo(self, request):
        ruta_ids = request.data.get('ruta_ids', [])
        mes = int(request.data.get('mes'))
        anio = int(request.data.get('anio'))
        
        created_count = 0
        skipped_count = 0
        
        for rid in ruta_ids:
            try:
                ruta = RutaTransporte.objects.get(id=rid)
                
                # Lógica de fechas
                if ruta.dia_inicio_periodo <= ruta.dia_fin_periodo:
                    fecha_inicio = datetime.date(anio, mes, ruta.dia_inicio_periodo)
                    fecha_fin = datetime.date(anio, mes, ruta.dia_fin_periodo)
                else:
                    fecha_fin = datetime.date(anio, mes, ruta.dia_fin_periodo)
                    if mes == 1:
                        prev_mes, prev_anio = 12, anio - 1
                    else:
                        prev_mes, prev_anio = mes - 1, anio
                    fecha_inicio = datetime.date(prev_anio, prev_mes, ruta.dia_inicio_periodo)
                
                # Evitar duplicados
                if not PeriodoCobro.objects.filter(ruta=ruta, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin).exists():
                    PeriodoCobro.objects.create(
                        ruta=ruta,
                        fecha_inicio=fecha_inicio,
                        fecha_fin=fecha_fin,
                        mes_referencia=mes,
                        anio_referencia=anio
                    )
                    created_count += 1
                else:
                    skipped_count += 1
            except Exception:
                skipped_count += 1
                
        return Response({
            "created": created_count,
            "skipped": skipped_count
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        ruta_ids = request.data.get('ruta_ids', [])
        fields_to_update = request.data.get('fields', {})
        
        if not ruta_ids:
            return Response({"detail": "No se proporcionaron IDs de rutas."}, status=status.HTTP_400_BAD_REQUEST)
            
        allowed_fields = ['incluir_fines_semana', 'excluir_feriados', 'valor_diario', 'dia_inicio_periodo', 'dia_fin_periodo']
        update_data = {k: v for k, v in fields_to_update.items() if k in allowed_fields}
        
        if not update_data:
            return Response({"detail": "No hay campos válidos para actualizar."}, status=status.HTTP_400_BAD_REQUEST)
            
        updated_count = RutaTransporte.objects.filter(id__in=ruta_ids).update(**update_data)
        
        return Response({
            "status": "success",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)

class PeriodoCobroViewSet(viewsets.ModelViewSet):
    queryset = PeriodoCobro.objects.select_related('ruta').prefetch_related('ausencias').all()
    serializer_class = PeriodoCobroSerializer
    filterset_fields = ['ruta', 'estado', 'anio_referencia', 'mes_referencia']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['fecha_inicio']
    ordering = ['-fecha_inicio']

    @action(detail=True, methods=['get'])
    def calendario(self, request, pk=None):
        periodo = self.get_object()
        ruta = periodo.ruta
        ausencias = periodo.ausencias.values_list('fecha', flat=True)
        return Response({
            "fecha_inicio": periodo.fecha_inicio,
            "fecha_fin": periodo.fecha_fin,
            "ausencias": list(ausencias),
            "regla": {
                "incluir_fines_semana": ruta.incluir_fines_semana,
                "excluir_feriados": ruta.excluir_feriados
            },
            "estado": periodo.estado,
            "monto_total_calculado": periodo.monto_total_calculado
        })

    @action(detail=True, methods=['get'])
    def total(self, request, pk=None):
        periodo = self.get_object()
        total_dinero = periodo.calcular_total_dinamico()
        
        ruta = periodo.ruta
        delta = (periodo.fecha_fin - periodo.fecha_inicio).days + 1
        dias_base = 0
        ausencias_efectivas = 0
        
        feriados = set()
        if ruta.excluir_feriados:
            feriados = set(FeriadoNacional.objects.values_list('fecha', flat=True))
            
        ausencias_registradas = set(periodo.ausencias.values_list('fecha', flat=True))

        for i in range(delta):
            dia = periodo.fecha_inicio + datetime.timedelta(days=i)
            
            is_valid_workday = True
            if not ruta.incluir_fines_semana and dia.weekday() >= 5:
                is_valid_workday = False
            elif ruta.excluir_feriados and dia in feriados:
                is_valid_workday = False
            
            if is_valid_workday:
                dias_base += 1
                if dia in ausencias_registradas:
                    ausencias_efectivas += 1
        
        dias_cobrar = dias_base - ausencias_efectivas

        return Response({
            "total": total_dinero,
            "dias_base": dias_base,
            "ausencias": ausencias_efectivas,
            "dias_cobrar": dias_cobrar,
            "estado": periodo.estado
        })

    @action(detail=True, methods=['post'], url_path='toggle-dia')
    def toggle_dia(self, request, pk=None):
        fecha_str = request.data.get('fecha')
        if not fecha_str:
            return Response({"fecha": "Requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha = datetime.datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"fecha": "Formato inválido (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                periodo = PeriodoCobro.objects.select_for_update().get(pk=pk)

                if periodo.estado == 'CERRADO':
                    return Response({"detail": "Periodo cerrado."}, status=status.HTTP_400_BAD_REQUEST)

                if not (periodo.fecha_inicio <= fecha <= periodo.fecha_fin):
                    return Response({"fecha": "Fuera de rango."}, status=status.HTTP_400_BAD_REQUEST)

                ausencia, created = AusenciaRuta.objects.get_or_create(periodo=periodo, fecha=fecha)
                if not created:
                    ausencia.delete()
                    logger.info(f"Ausencia ELIMINADA para el periodo {periodo.id} en la fecha {fecha} por usuario {request.user}")
                    return Response({"status": "eliminada"})
                
                logger.info(f"Ausencia CREADA para el periodo {periodo.id} en la fecha {fecha} por usuario {request.user}")
                return Response({"status": "creada"})
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-toggle-dia')
    def bulk_toggle_dia(self, request):
        periodo_ids = request.data.get('periodo_ids', [])
        fecha_str = request.data.get('fecha')
        force_state = request.data.get('force_state') # 'ausente' or 'presente' (optional)

        if not periodo_ids or not fecha_str:
            return Response({"detail": "periodo_ids y fecha son requeridos."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha = datetime.datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"fecha": "Formato inválido (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        try:
            with transaction.atomic():
                periodos = PeriodoCobro.objects.select_for_update().filter(id__in=periodo_ids)
                
                for periodo in periodos:
                    if periodo.estado == 'CERRADO':
                        results.append({"id": periodo.id, "status": "error", "detail": "Periodo cerrado"})
                        continue
                    
                    if not (periodo.fecha_inicio <= fecha <= periodo.fecha_fin):
                        results.append({"id": periodo.id, "status": "error", "detail": "Fuera de rango"})
                        continue

                    # Si force_state es proporcionado, aplicamos ese estado. Si no, toggle.
                    ausencia_existente = AusenciaRuta.objects.filter(periodo=periodo, fecha=fecha).first()
                    
                    if force_state == 'presente':
                        if ausencia_existente:
                            ausencia_existente.delete()
                            results.append({"id": periodo.id, "status": "presente"})
                        else:
                            results.append({"id": periodo.id, "status": "no_change"})
                    elif force_state == 'ausente':
                        if not ausencia_existente:
                            AusenciaRuta.objects.create(periodo=periodo, fecha=fecha)
                            results.append({"id": periodo.id, "status": "ausente"})
                        else:
                            results.append({"id": periodo.id, "status": "no_change"})
                    else:
                        # Toggle normal
                        if ausencia_existente:
                            ausencia_existente.delete()
                            results.append({"id": periodo.id, "status": "presente"})
                        else:
                            AusenciaRuta.objects.create(periodo=periodo, fecha=fecha)
                            results.append({"id": periodo.id, "status": "ausente"})

            return Response({"results": results}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        try:
            with transaction.atomic():
                periodo = PeriodoCobro.objects.select_for_update().get(pk=pk)
                
                if periodo.estado == 'CERRADO':
                    return Response({"detail": "El periodo ya está cerrado."}, status=status.HTTP_400_BAD_REQUEST)

                monto_total = periodo.calcular_total_dinamico()

                periodo.estado = 'CERRADO'
                periodo.monto_total_calculado = monto_total
                periodo.save()

                logger.info(f"Periodo {periodo.id} CERRADO exitosamente. Monto total congelado: {monto_total}. Usuario: {request.user}")
                return Response({"status": "cerrado", "monto_total": monto_total})
                
        except Exception as e:
            logger.error(f"Error al cerrar periodo {pk}: {str(e)}")
            return Response({"detail": "Error interno al cerrar el periodo."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AusenciaRutaViewSet(viewsets.ModelViewSet):
    queryset = AusenciaRuta.objects.all()
    serializer_class = AusenciaRutaSerializer
    filterset_fields = ['periodo', 'fecha']

class FeriadoNacionalViewSet(viewsets.ModelViewSet):
    queryset = FeriadoNacional.objects.all()
    serializer_class = FeriadoNacionalSerializer
    pagination_class = None  # Desactivamos paginación para que el calendario vea todo
    filter_backends = [filters.OrderingFilter]
    ordering = ['-fecha']

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Permite crear feriados en bloque desde el frontend."""
        data = request.data
        if not isinstance(data, list):
            return Response({"detail": "Se esperaba una lista de feriados."}, status=400)
        
        count = 0
        for item in data:
            fecha = item.get('fecha')
            descripcion = item.get('descripcion')
            if fecha and descripcion:
                obj, created = FeriadoNacional.objects.get_or_create(
                    fecha=fecha,
                    defaults={'descripcion': descripcion}
                )
                if created:
                    count += 1
        
        return Response({"status": "success", "creados": count})

    @action(detail=False, methods=['post'])
    def sincronizar(self, request):
        # Esta acción queda como alias para bulk_create o puede ser eliminada
        # Para mantener compatibilidad con el botón actual mientras actualizo el frontend:
        return self.bulk_create(request)

class GrupoPresetRutasViewSet(viewsets.ModelViewSet):
    queryset = GrupoPresetRutas.objects.all()
    serializer_class = GrupoPresetRutasSerializer
    filterset_fields = ['servicio']
    pagination_class = None
