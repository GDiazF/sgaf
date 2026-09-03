import datetime
import logging
from django.db import transaction
from rest_framework import viewsets, filters, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.core.exceptions import ValidationError as DjangoValidationError
from django_filters.rest_framework import DjangoFilterBackend
from establecimientos.pagination import LargeResultsSetPagination
from establecimientos.models import Establecimiento

from documentos.context_builders import _fmt_m3

from .models import (
    ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, 
    OrientacionLicitacion, DocumentoContrato, HistorialContrato, AmpliacionContrato,
    TipoServicioOperativo, ServicioContrato, RutaTransporte, PeriodoCobro, AusenciaRuta,
    VolumenDiaPeriodo, FeriadoNacional, GrupoPresetRutas
)
from .serializers import (
    ProcesoCompraSerializer, EstadoContratoSerializer, CategoriaContratoSerializer, 
    ContratoSerializer, OrientacionLicitacionSerializer, DocumentoContratoSerializer,
    AmpliacionContratoSerializer,
    TipoServicioOperativoSerializer, ServicioContratoSerializer, RutaTransporteSerializer,
    PeriodoCobroSerializer, AusenciaRutaSerializer, FeriadoNacionalSerializer,
    GrupoPresetRutasSerializer
)

from core.drf_permissions import SgafModelPermissions, SgafPermissionMixin
from contratos.services.recepcion_contrato import RecepcionContratoService
from servicios.models import FacturaAdquisicion
from servicios.serializers import FacturaAdquisicionSerializer
from servicios.pdf import build_rc_adq_pdf

logger = logging.getLogger(__name__)

_DEFAULT_PERMS = [permissions.IsAuthenticated, SgafModelPermissions]

class ProcesoCompraViewSet(viewsets.ModelViewSet):
    queryset = ProcesoCompra.objects.all()
    serializer_class = ProcesoCompraSerializer
    permission_classes = _DEFAULT_PERMS

class EstadoContratoViewSet(viewsets.ModelViewSet):
    queryset = EstadoContrato.objects.all()
    serializer_class = EstadoContratoSerializer
    permission_classes = _DEFAULT_PERMS

class CategoriaContratoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaContrato.objects.all()
    serializer_class = CategoriaContratoSerializer
    permission_classes = _DEFAULT_PERMS

class OrientacionLicitacionViewSet(viewsets.ModelViewSet):
    queryset = OrientacionLicitacion.objects.all()
    serializer_class = OrientacionLicitacionSerializer
    permission_classes = _DEFAULT_PERMS

class DocumentoContratoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoContrato.objects.all()
    serializer_class = DocumentoContratoSerializer
    filterset_fields = ['contrato']
    permission_classes = _DEFAULT_PERMS


class AmpliacionContratoViewSet(viewsets.ModelViewSet):
    """Registro de ampliaciones de vigencia. Alta, consulta y edición (sin borrar)."""

    queryset = AmpliacionContrato.objects.select_related('contrato').all()
    serializer_class = AmpliacionContratoSerializer
    filterset_fields = ['contrato']
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_permissions(self):
        return [permissions.IsAuthenticated(), _AmpliacionContratoPermission()]

    def get_queryset(self):
        qs = super().get_queryset()
        contrato_id = self.request.query_params.get('contrato')
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)
        return qs


class _AmpliacionContratoPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return (
                user.has_perm('contratos.view_ampliacioncontrato')
                or user.has_perm('contratos.view_contrato')
            )
        if request.method in ('PATCH', 'PUT'):
            return (
                user.has_perm('contratos.change_ampliacioncontrato')
                or user.has_perm('contratos.change_contrato')
            )
        return (
            user.has_perm('contratos.add_ampliacioncontrato')
            or user.has_perm('contratos.change_contrato')
        )


class ContratoViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'resumen_periodo': 'contratos.view_contrato',
        'crear_borrador': 'contratos.add_contrato',
        'publicar': 'contratos.change_contrato',
    }
    queryset = Contrato.objects.select_related(
        'plantilla_recepcion_servicio',
        'proceso', 'estado', 'categoria', 'orientacion',
    ).prefetch_related(
        'ampliaciones', 'documentos', 'historial', 'proveedores_asociados',
    ).all()
    serializer_class = ContratoSerializer
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['proceso', 'estado', 'categoria', 'orientacion', 'es_borrador']
    search_fields = ['codigo_mercado_publico', 'descripcion', 'detalle', 'nro_oc', 'cdp', 'proveedores_asociados__proveedor__nombre']
    ordering_fields = ['fecha_inicio', 'monto_total', 'created_at', 'updated_at']

    @staticmethod
    def _finalizado_q():
        from django.db.models import Q
        from django.utils import timezone
        today = timezone.now().date()
        return (
            Q(estado__nombre__icontains='finaliz')
            | Q(estado__nombre__icontains='caduc')
            | Q(estado__nombre__icontains='cerr')
            | Q(estado__nombre__icontains='termin')
            | Q(fecha_termino__lt=today)
        )

    def get_queryset(self):
        qs = super().get_queryset()
        vista = self.request.query_params.get('vista')
        if vista == 'borradores':
            return qs.filter(es_borrador=True)
        if vista == 'finalizados':
            return qs.filter(es_borrador=False).filter(self._finalizado_q())
        if vista == 'activos':
            return qs.filter(es_borrador=False).exclude(self._finalizado_q())
        return qs

    @action(detail=False, methods=['post'], url_path='crear-borrador')
    def crear_borrador(self, request):
        contrato = Contrato.objects.create(es_borrador=True, descripcion='')
        serializer = self.get_serializer(contrato)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='publicar')
    def publicar(self, request, pk=None):
        contrato = self.get_object()
        if not contrato.es_borrador:
            return Response(
                {'detail': 'Este contrato ya fue publicado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(
            contrato,
            data=request.data,
            partial=True,
            context={**self.get_serializer_context(), 'publicar': True},
        )
        serializer.is_valid(raise_exception=True)
        contrato = serializer.save()
        contrato._current_user = request.user
        HistorialContrato.objects.create(
            contrato=contrato,
            accion='PUBLICACION',
            detalle=f'Se publicó el contrato {contrato.codigo_mercado_publico}.',
            usuario=str(request.user),
        )
        return Response(serializer.data)

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        instance._current_user = user
        serializer.instance._current_user = user
        instance = serializer.save()
        if instance.es_borrador:
            return
        HistorialContrato.objects.create(
            contrato=instance,
            accion="MODIFICACION",
            detalle="Se actualizaron los datos básicos del contrato.",
            usuario=str(user)
        )

    @action(detail=True, methods=['get'], url_path='resumen-periodo')
    def resumen_periodo(self, request, pk=None):
        contrato = self.get_object()
        try:
            mes = int(request.query_params.get('mes'))
            anio = int(request.query_params.get('anio'))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'Indique mes y año del periodo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        proveedor_id = request.query_params.get('proveedor')
        gestion = contrato.servicios_operativos.select_related('tipo_servicio').first()
        if not gestion:
            return Response({
                'tiene_gestion': False,
                'total': 0,
                'lineas': [],
                'establecimientos_ids': [],
                'faltantes': 0,
            })

        rutas = gestion.rutas.select_related('proveedor').prefetch_related(
            'establecimientos', 'periodos'
        )
        if proveedor_id:
            rutas = rutas.filter(proveedor_id=proveedor_id)

        lineas = []
        total = 0
        establecimientos_ids = []
        con_periodo = 0
        for ruta in rutas:
            periodo = next(
                (
                    p
                    for p in ruta.periodos.all()
                    if p.mes_referencia == mes and p.anio_referencia == anio
                ),
                None,
            )
            ests = list(ruta.establecimientos.values_list('id', flat=True))
            if not periodo:
                lineas.append({
                    'ruta_id': ruta.id,
                    'nombre': ruta.nombre,
                    'proveedor_id': ruta.proveedor_id,
                    'establecimientos': ests,
                    'monto': 0,
                    'tiene_periodo': False,
                })
                continue
            con_periodo += 1
            monto = periodo.monto_total or 0
            total += monto
            establecimientos_ids.extend(ests)
            lineas.append({
                'ruta_id': ruta.id,
                'nombre': ruta.nombre,
                'proveedor_id': ruta.proveedor_id,
                'establecimientos': ests,
                'monto': monto,
                'tiene_periodo': True,
                'periodo_id': periodo.id,
                'estado': periodo.estado,
            })

        return Response({
            'tiene_gestion': True,
            'gestion_id': gestion.id,
            'es_transporte': gestion.es_transporte,
            'modalidad_cobro': gestion.modalidad_cobro,
            'total': total,
            'lineas': lineas,
            'establecimientos_ids': list(dict.fromkeys(establecimientos_ids)),
            'faltantes': len(lineas) - con_periodo,
            'lineas_con_periodo': con_periodo,
        })


class RecepcionContratoViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    """
    Recepciones conformes vinculadas a contrato (folios ROC-).
    Misma tabla FacturaAdquisicion; reglas separadas de factura sin OC.
    """
    sgaf_action_permissions = {
        'generate_pdf': 'servicios.view_facturaadquisicion',
    }
    serializer_class = FacturaAdquisicionSerializer
    permission_classes = [permissions.IsAuthenticated, SgafModelPermissions]
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_entrega', 'cdp', 'contrato']
    search_fields = ['descripcion', 'proveedor__nombre', 'id', 'folio', 'cdp', 'total_pagar', 'nro_oc']
    # DjangoModelPermissions lee el modelo del queryset
    queryset = FacturaAdquisicion.objects.filter(contrato__isnull=False)

    def get_queryset(self):
        contrato_id = self.request.query_params.get('contrato')
        return RecepcionContratoService.queryset(contrato_id=contrato_id or None)

    def create(self, request, *args, **kwargs):
        try:
            data = RecepcionContratoService.prepare_payload(
                request.data.copy() if hasattr(request.data, 'copy') else dict(request.data),
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, 'message_dict') else {'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        try:
            data = RecepcionContratoService.prepare_payload(
                request.data.copy() if hasattr(request.data, 'copy') else dict(request.data),
                instance=instance,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, 'message_dict') else {'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        return build_rc_adq_pdf(self.get_object(), user=request.user)


# =====================================================================
# MÓDULO DE SERVICIOS OPERATIVOS (TRANSPORTE, ETC.)
# =====================================================================

class TipoServicioOperativoViewSet(viewsets.ModelViewSet):
    queryset = TipoServicioOperativo.objects.all().order_by('nombre')
    serializer_class = TipoServicioOperativoSerializer
    pagination_class = None
    permission_classes = _DEFAULT_PERMS


class ServicioContratoViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'generar_acta_conformidad': 'contratos.view_serviciocontrato',
    }
    queryset = ServicioContrato.objects.select_related('contrato', 'tipo_servicio').all().order_by('nombre', 'id')
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
        assets = get_report_assets('ACTA_CONTRATO')
        
        def get_img(path, w):
            if path and os.path.exists(path):
                img = ImageReader(path)
                iw, ih = img.getSize()
                aspect = ih / float(iw)
                return Image(path, width=w, height=w * aspect)
            return Paragraph("", styles['Normal'])

        header_data = [
            [get_img(assets['logo_izquierdo'], 1.4*inch), 
             [Paragraph("SERVICIO LOCAL DE EDUCACIÓN PÚBLICA DE IQUIQUE", styles['ActaTitle']),
              Paragraph("VISTO BUENO DE RECORRIDOS DE BUSES", styles['ActaSubTitle'])], 
             get_img(assets['logo_derecho'], 1.2*inch)]
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

class RutaTransporteViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'bulk_crear_lineas': 'contratos.add_rutatransporte',
        'generar_periodo': 'contratos.add_periodocobro',
        'bulk_generar_periodo': 'contratos.add_periodocobro',
        'bulk_update': 'contratos.change_rutatransporte',
        'recepcion_servicio': 'contratos.view_rutatransporte',
    }
    queryset = RutaTransporte.objects.select_related('servicio', 'proveedor').prefetch_related(
        'establecimientos', 'periodos', 'periodos__ausencias', 'periodos__volumenes_dia',
    ).all()
    serializer_class = RutaTransporteSerializer
    pagination_class = None # Ver todas las rutas sin paginación
    filterset_fields = ['servicio', 'proveedor']

    @action(detail=False, methods=['post'], url_path='bulk-crear-lineas')
    def bulk_crear_lineas(self, request):
        servicio_id = request.data.get('servicio')
        proveedor_id = request.data.get('proveedor')
        est_ids = request.data.get('establecimientos') or []
        valor_mensual = request.data.get('valor_mensual')
        if not servicio_id or not proveedor_id or not est_ids:
            return Response(
                {'detail': 'Indique proveedor y al menos un establecimiento.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            servicio = ServicioContrato.objects.get(pk=servicio_id)
        except ServicioContrato.DoesNotExist:
            return Response({'servicio': 'Gestión no encontrada.'}, status=status.HTTP_400_BAD_REQUEST)
        precio_m3 = request.data.get('precio_m3')
        if servicio.es_volumetrico:
            if not precio_m3:
                return Response(
                    {'precio_m3': 'Indique el precio por metro cúbico ($/m³).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif not valor_mensual and not servicio.es_mensual_mixto:
            return Response(
                {'valor_mensual': 'Indique el monto mensual.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        valor_mensual = valor_mensual or 0
        precio_m3 = precio_m3 or 0
        nombres = {
            e.id: e.nombre
            for e in Establecimiento.objects.filter(id__in=est_ids)
        }
        creadas = []
        errores = []
        incluir_fines = request.data.get('incluir_fines_semana', True)
        excluir_fer = request.data.get('excluir_feriados', False)
        if isinstance(incluir_fines, str):
            incluir_fines = incluir_fines.lower() in ('true', '1', 'yes')
        if isinstance(excluir_fer, str):
            excluir_fer = excluir_fer.lower() in ('true', '1', 'yes')
        with transaction.atomic():
            for est_id in est_ids:
                payload = {
                    'servicio': servicio_id,
                    'proveedor': proveedor_id,
                    'nombre': nombres.get(int(est_id), f'Establecimiento {est_id}'),
                    'establecimientos': [est_id],
                    'valor_mensual': valor_mensual if servicio.es_mensual else None,
                    'precio_m3': precio_m3 if servicio.es_volumetrico else None,
                    'valor_diario': 0,
                    'dia_inicio_periodo': 1,
                    'dia_fin_periodo': 31,
                    'incluir_fines_semana': bool(incluir_fines),
                    'excluir_feriados': bool(excluir_fer),
                }
                serializer = RutaTransporteSerializer(data=payload)
                if serializer.is_valid():
                    serializer.save()
                    creadas.append(serializer.data)
                else:
                    errores.append({'establecimiento': est_id, 'errors': serializer.errors})
            if errores and not creadas:
                return Response({'detail': errores}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {'creadas': len(creadas), 'omitidas': len(errores), 'lineas': creadas},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'], url_path='generar-periodo')
    def generar_periodo(self, request, pk=None):
        ruta = self.get_object()
        mes = int(request.data.get('mes'))
        anio = int(request.data.get('anio'))
        fecha_inicio, fecha_fin = ruta.rango_periodo(mes, anio)

        if PeriodoCobro.objects.filter(ruta=ruta, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin).exists():
            return Response({"error": "Ya existe un periodo con este rango de fechas para esta ruta."}, status=status.HTTP_400_BAD_REQUEST)

        from .period_utils import crear_periodo_cobro
        periodo = crear_periodo_cobro(ruta, fecha_inicio, fecha_fin, mes, anio)
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
                fecha_inicio, fecha_fin = ruta.rango_periodo(mes, anio)
                
                # Evitar duplicados
                if not PeriodoCobro.objects.filter(ruta=ruta, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin).exists():
                    from .period_utils import crear_periodo_cobro
                    crear_periodo_cobro(ruta, fecha_inicio, fecha_fin, mes, anio)
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
            
        allowed_fields = [
            'incluir_fines_semana',
            'excluir_feriados',
            'valor_diario',
            'valor_mensual',
            'dia_inicio_periodo',
            'dia_fin_periodo',
        ]
        update_data = {k: v for k, v in fields_to_update.items() if k in allowed_fields}
        
        if not update_data:
            return Response({"detail": "No hay campos válidos para actualizar."}, status=status.HTTP_400_BAD_REQUEST)
            
        updated_count = RutaTransporte.objects.filter(id__in=ruta_ids).update(**update_data)
        
        return Response({
            "status": "success",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='recepcion-servicio')
    def recepcion_servicio(self, request, pk=None):
        """PDF de recepción unitaria (sin folio). Solo gestiones mensuales."""
        from .pdf_gestion import build_recepcion_servicio_pdf

        ruta = self.get_object()
        est_id = request.query_params.get('establecimiento_id')
        periodo_id = request.query_params.get('periodo_id')
        establecimiento = None
        if est_id:
            try:
                establecimiento = Establecimiento.objects.select_related('tipo').get(pk=est_id)
            except Establecimiento.DoesNotExist:
                return Response(
                    {'error': 'Establecimiento no encontrado.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            establecimientos = list(ruta.establecimientos.select_related('tipo').all())
            if len(establecimientos) == 1:
                establecimiento = establecimientos[0]
            elif not establecimientos:
                return Response(
                    {'error': 'La línea no tiene establecimientos.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {'error': 'Indique establecimiento_id.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        periodo = None
        if not periodo_id:
            return Response(
                {
                    'error': 'Indique el periodo de la recepción.',
                    'hint': 'Seleccione un periodo antes de descargar el PDF.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            periodo = PeriodoCobro.objects.get(pk=periodo_id, ruta=ruta)
        except PeriodoCobro.DoesNotExist:
            return Response(
                {'error': 'Periodo no encontrado para esta línea.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        monto_junji = request.query_params.get('monto_junji')
        if monto_junji is not None and monto_junji != '':
            try:
                monto_junji = int(monto_junji)
            except (TypeError, ValueError):
                return Response(
                    {'error': 'monto_junji inválido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            monto_junji = None

        incluir_periodo = request.query_params.get('incluir_periodo')
        if incluir_periodo is None or incluir_periodo == '':
            incluir_periodo = None
        elif str(incluir_periodo).lower() in ('0', 'false', 'no'):
            incluir_periodo = False
        else:
            incluir_periodo = True

        return build_recepcion_servicio_pdf(
            ruta,
            establecimiento,
            periodo=periodo,
            user=request.user,
            monto_junji=monto_junji,
            incluir_periodo=incluir_periodo,
        )


class PeriodoCobroViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'calendario': 'contratos.view_periodocobro',
        'total': 'contratos.view_periodocobro',
        'generate_pdf': 'contratos.view_periodocobro',
        'toggle_dia': 'contratos.change_ausenciaruta',
        'bulk_toggle_dia': 'contratos.change_ausenciaruta',
        'volumen_dia': 'contratos.change_periodocobro',
        'bulk_volumen_dia': 'contratos.change_periodocobro',
        'cerrar': 'contratos.change_periodocobro',
        'datos_recepcion': 'contratos.change_periodocobro',
        'montos_mixto': 'contratos.change_periodocobro',
    }
    queryset = PeriodoCobro.objects.select_related('ruta', 'ruta__servicio').prefetch_related(
        'ausencias', 'volumenes_dia',
    ).all()
    serializer_class = PeriodoCobroSerializer
    filterset_fields = ['ruta', 'estado', 'anio_referencia', 'mes_referencia']
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['fecha_inicio']
    ordering = ['-fecha_inicio']

    @action(detail=True, methods=['get'])
    def calendario(self, request, pk=None):
        periodo = self.get_object()
        ruta = periodo.ruta
        servicio = ruta.servicio if ruta.servicio_id else None
        ausencias = periodo.ausencias.values_list('fecha', flat=True)
        volumenes_dia = {
            fecha.isoformat(): _fmt_m3(vol)
            for fecha, vol in periodo.volumenes_dia.values_list('fecha', 'volumen_m3')
        }
        return Response({
            "fecha_inicio": periodo.fecha_inicio,
            "fecha_fin": periodo.fecha_fin,
            "ausencias": list(ausencias),
            "regla": {
                "incluir_fines_semana": ruta.incluir_fines_semana,
                "excluir_feriados": ruta.excluir_feriados
            },
            "estado": periodo.estado,
            "monto_total_calculado": periodo.monto_total_calculado,
            "nombre_estandarizado": periodo.nombre_estandarizado,
            "monto_fijo": periodo.monto_fijo or 0,
            "monto_variable": periodo.monto_variable or 0,
            "volumen_m3": _fmt_m3(periodo.volumen_m3_total()),
            "volumenes_dia": volumenes_dia,
            "precio_m3": ruta.precio_m3 or 0,
            "nro_factura": periodo.nro_factura or '',
            "fecha_servicio": periodo.fecha_servicio,
            "incluir_periodo_en_rc": bool(periodo.incluir_periodo_en_rc),
            "es_mensual_mixto": bool(servicio and servicio.es_mensual_mixto),
            "es_mensual": bool(servicio and servicio.es_mensual),
            "es_volumetrico": bool(servicio and servicio.es_volumetrico),
            "usa_asistencia": bool(
                servicio
                and (
                    not servicio.es_linea_por_establecimiento
                    or servicio.modalidad_cobro == servicio.MODALIDAD_MENSUAL_POR_EST
                )
            ),
        })

    @action(detail=True, methods=['get'])
    def total(self, request, pk=None):
        periodo = self.get_object()
        total_dinero = periodo.calcular_total_dinamico()
        ruta = periodo.ruta
        servicio = ruta.servicio if ruta.servicio_id else None

        if servicio and servicio.es_mensual_mixto:
            return Response({
                "total": total_dinero,
                "dias_base": periodo.dias_base,
                "ausencias": periodo.dias_base - periodo.dias_trabajados,
                "dias_cobrar": periodo.dias_trabajados,
                "estado": periodo.estado,
                "es_mensual_mixto": True,
                "monto_fijo": periodo.monto_fijo or 0,
                "monto_variable": periodo.monto_variable or 0,
            })

        if servicio and servicio.es_volumetrico:
            vol_total = periodo.volumen_m3_total()
            return Response({
                "total": total_dinero,
                "estado": periodo.estado,
                "es_volumetrico": True,
                "volumen_m3": _fmt_m3(vol_total),
                "cantidad_servicios": periodo.volumenes_dia.count(),
                "precio_m3": ruta.precio_m3 or 0,
            })

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
            "estado": periodo.estado,
            "es_mensual_mixto": False,
            "monto_fijo": periodo.monto_fijo or 0,
            "monto_variable": periodo.monto_variable or 0,
        })

    @action(detail=True, methods=['get'], url_path='generate-pdf')
    def generate_pdf(self, request, pk=None):
        """PDF de cobro del periodo según modalidad de la gestión."""
        from .pdf_gestion import build_cobro_periodo_pdf

        periodo = self.get_object()
        return build_cobro_periodo_pdf(periodo, user=request.user)

    @action(detail=True, methods=['patch'], url_path='datos-recepcion')
    def datos_recepcion(self, request, pk=None):
        """
        Actualiza datos de recepción del periodo (no transporte):
        nro_factura, fecha_servicio; y si es mixto también montos.
        """
        periodo = self.get_object()
        servicio = periodo.ruta.servicio if periodo.ruta.servicio_id else None
        if not servicio or not servicio.permite_recepcion_servicio:
            return Response(
                {'error': 'Solo aplica a gestiones mensuales o volumétricas (no transporte).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if periodo.estado == 'CERRADO':
            return Response(
                {'error': 'El periodo está cerrado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = {}
        if 'nro_factura' in request.data:
            data['nro_factura'] = (request.data.get('nro_factura') or '')[:100]
        if 'fecha_servicio' in request.data:
            raw = request.data.get('fecha_servicio')
            if not raw:
                data['fecha_servicio'] = None
            else:
                try:
                    if hasattr(raw, 'isoformat'):
                        data['fecha_servicio'] = raw
                    else:
                        data['fecha_servicio'] = datetime.datetime.strptime(
                            str(raw)[:10], '%Y-%m-%d'
                        ).date()
                except (TypeError, ValueError):
                    return Response(
                        {'fecha_servicio': 'Formato inválido (YYYY-MM-DD).'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        if 'incluir_periodo_en_rc' in request.data:
            raw = request.data.get('incluir_periodo_en_rc')
            if isinstance(raw, str):
                data['incluir_periodo_en_rc'] = raw.lower() in ('1', 'true', 'yes', 'si', 'sí')
            else:
                data['incluir_periodo_en_rc'] = bool(raw)
        if servicio.es_mensual_mixto:
            if 'monto_fijo' in request.data:
                try:
                    data['monto_fijo'] = int(request.data.get('monto_fijo') or 0)
                except (TypeError, ValueError):
                    return Response(
                        {'monto_fijo': 'Valor inválido.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            if 'monto_variable' in request.data:
                try:
                    data['monto_variable'] = int(request.data.get('monto_variable') or 0)
                except (TypeError, ValueError):
                    return Response(
                        {'monto_variable': 'Valor inválido.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        if servicio.es_volumetrico and 'volumen_m3' in request.data:
            return Response(
                {
                    'volumen_m3': (
                        'Use el calendario del periodo para registrar m³ por día '
                        '(varios servicios en el mes).'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not data:
            return Response({'detail': 'Sin cambios.'}, status=status.HTTP_400_BAD_REQUEST)
        for key, value in data.items():
            setattr(periodo, key, value)
        periodo.save(update_fields=list(data.keys()))
        return Response(PeriodoCobroSerializer(periodo).data)

    @action(detail=True, methods=['patch'], url_path='montos-mixto')
    def montos_mixto(self, request, pk=None):
        """Compat: redirige a datos-recepcion (montos mixto + factura/fecha)."""
        return self.datos_recepcion(request, pk=pk)

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

    @action(detail=True, methods=['post'], url_path='volumen-dia')
    def volumen_dia(self, request, pk=None):
        """Registra o elimina m³ de un día (modalidad volumétrica)."""
        fecha_str = request.data.get('fecha')
        raw_vol = request.data.get('volumen_m3')
        if not fecha_str:
            return Response({'fecha': 'Requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fecha = datetime.datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'fecha': 'Formato inválido (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                periodo = PeriodoCobro.objects.select_for_update().prefetch_related(
                    'volumenes_dia',
                ).get(pk=pk)
                servicio = periodo.ruta.servicio if periodo.ruta.servicio_id else None
                if not servicio or not servicio.es_volumetrico:
                    return Response(
                        {'error': 'Solo aplica a gestiones volumétricas.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if periodo.estado == 'CERRADO':
                    return Response({'detail': 'Periodo cerrado.'}, status=status.HTTP_400_BAD_REQUEST)
                if not (periodo.fecha_inicio <= fecha <= periodo.fecha_fin):
                    return Response({'fecha': 'Fuera de rango.'}, status=status.HTTP_400_BAD_REQUEST)

                ruta = periodo.ruta
                if not ruta.incluir_fines_semana and fecha.weekday() >= 5:
                    return Response({'fecha': 'Fin de semana excluido por la línea.'}, status=status.HTTP_400_BAD_REQUEST)
                if ruta.excluir_feriados and FeriadoNacional.objects.filter(fecha=fecha).exists():
                    return Response({'fecha': 'Feriado excluido por la línea.'}, status=status.HTTP_400_BAD_REQUEST)

                if raw_vol in (None, '', 0, '0'):
                    VolumenDiaPeriodo.objects.filter(periodo=periodo, fecha=fecha).delete()
                    status_label = 'eliminado'
                else:
                    from decimal import Decimal, InvalidOperation
                    try:
                        vol = Decimal(str(raw_vol).replace(',', '.'))
                        if vol <= 0:
                            raise InvalidOperation
                    except (InvalidOperation, ValueError):
                        return Response(
                            {'volumen_m3': 'Indique un volumen válido en m³.'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    VolumenDiaPeriodo.objects.update_or_create(
                        periodo=periodo,
                        fecha=fecha,
                        defaults={'volumen_m3': vol},
                    )
                    status_label = 'guardado'

                periodo.sync_volumen_m3_cache()
                periodo.save(update_fields=['volumen_m3'])
                vol_total = periodo.volumen_m3_total()
                return Response({
                    'status': status_label,
                    'volumen_m3': _fmt_m3(vol_total),
                    'cantidad_servicios': periodo.volumenes_dia.count(),
                    'total': periodo.calcular_total_dinamico(),
                })
        except PeriodoCobro.DoesNotExist:
            return Response({'detail': 'Periodo no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, 'message_dict') else {'detail': exc.messages}
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='bulk-volumen-dia')
    def bulk_volumen_dia(self, request):
        """Registra o elimina m³ de un día en varios periodos (planilla volumétrica)."""
        periodo_ids = request.data.get('periodo_ids') or []
        fecha_str = request.data.get('fecha')
        raw_vol = request.data.get('volumen_m3')
        if not periodo_ids or not fecha_str:
            return Response(
                {'detail': 'periodo_ids y fecha son requeridos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            fecha = datetime.datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'fecha': 'Formato inválido (YYYY-MM-DD).'}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal, InvalidOperation
        vol = None
        if raw_vol not in (None, '', 0, '0'):
            try:
                vol = Decimal(str(raw_vol).replace(',', '.'))
                if vol <= 0:
                    raise InvalidOperation
            except (InvalidOperation, ValueError):
                return Response(
                    {'volumen_m3': 'Indique un volumen válido en m³.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        results = []
        try:
            with transaction.atomic():
                periodos = PeriodoCobro.objects.select_for_update().filter(
                    id__in=periodo_ids,
                ).select_related('ruta', 'ruta__servicio').prefetch_related('volumenes_dia')
                for periodo in periodos:
                    servicio = periodo.ruta.servicio if periodo.ruta.servicio_id else None
                    if not servicio or not servicio.es_volumetrico:
                        results.append({'id': periodo.id, 'status': 'error', 'detail': 'No volumétrico'})
                        continue
                    if periodo.estado == 'CERRADO':
                        results.append({'id': periodo.id, 'status': 'error', 'detail': 'Periodo cerrado'})
                        continue
                    if not (periodo.fecha_inicio <= fecha <= periodo.fecha_fin):
                        results.append({'id': periodo.id, 'status': 'error', 'detail': 'Fuera de rango'})
                        continue
                    ruta = periodo.ruta
                    if not ruta.incluir_fines_semana and fecha.weekday() >= 5:
                        results.append({'id': periodo.id, 'status': 'error', 'detail': 'Fin de semana'})
                        continue
                    if ruta.excluir_feriados and FeriadoNacional.objects.filter(fecha=fecha).exists():
                        results.append({'id': periodo.id, 'status': 'error', 'detail': 'Feriado'})
                        continue
                    if vol is None:
                        VolumenDiaPeriodo.objects.filter(periodo=periodo, fecha=fecha).delete()
                        results.append({'id': periodo.id, 'status': 'eliminado'})
                    else:
                        VolumenDiaPeriodo.objects.update_or_create(
                            periodo=periodo,
                            fecha=fecha,
                            defaults={'volumen_m3': vol},
                        )
                        results.append({'id': periodo.id, 'status': 'guardado'})
                    periodo.sync_volumen_m3_cache()
                    periodo.save(update_fields=['volumen_m3'])
            return Response({'results': results}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

                servicio = periodo.ruta.servicio if periodo.ruta.servicio_id else None
                if servicio and servicio.es_volumetrico:
                    periodo.sync_volumen_m3_cache()

                monto_total = periodo.calcular_total_dinamico()

                periodo.estado = 'CERRADO'
                periodo.monto_total_calculado = monto_total
                update_fields = ['estado', 'monto_total_calculado']
                if servicio and servicio.es_volumetrico:
                    update_fields.append('volumen_m3')
                periodo.save(update_fields=update_fields)

                logger.info(f"Periodo {periodo.id} CERRADO exitosamente. Monto total congelado: {monto_total}. Usuario: {request.user}")
                return Response({"status": "cerrado", "monto_total": monto_total})
                
        except Exception as e:
            logger.error(f"Error al cerrar periodo {pk}: {str(e)}")
            return Response({"detail": "Error interno al cerrar el periodo."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AusenciaRutaViewSet(viewsets.ModelViewSet):
    queryset = AusenciaRuta.objects.all()
    serializer_class = AusenciaRutaSerializer
    filterset_fields = ['periodo', 'fecha']
    permission_classes = _DEFAULT_PERMS

class FeriadoNacionalViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'bulk_create': 'contratos.add_feriadonacional',
        'sincronizar': 'contratos.add_feriadonacional',
    }
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
    permission_classes = _DEFAULT_PERMS
