from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.http import HttpResponse
import pandas as pd
import io
import datetime
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago, RecepcionConforme, CDP, TipoEntrega, FacturaAdquisicion
from establecimientos.models import Establecimiento
from .serializers import (
    ProveedorSerializer, TipoDocumentoSerializer, ServicioSerializer, 
    TipoProveedorSerializer, RegistroPagoSerializer, RecepcionConformeSerializer, 
    CDPSerializer, TipoEntregaSerializer, FacturaAdquisicionSerializer
)

class TipoProveedorViewSet(viewsets.ModelViewSet):
    queryset = TipoProveedor.objects.all()
    serializer_class = TipoProveedorSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filterset_fields = {
        'tipo_proveedor': ['exact'],
    }
    ordering_fields = ['nombre', 'rut', 'tipo_proveedor__nombre']
    search_fields = ['nombre', 'rut']

class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_documento', 'numero_cliente']
    ordering_fields = ['establecimiento__nombre', 'proveedor__nombre', 'numero_cliente']
    search_fields = ['numero_cliente', 'establecimiento__nombre', 'proveedor__nombre']

class RegistroPagoViewSet(viewsets.ModelViewSet):
    queryset = RegistroPago.objects.all().order_by('-fecha_pago')
    serializer_class = RegistroPagoSerializer
    filterset_fields = {
        'establecimiento': ['exact'],
        'servicio': ['exact'],
        'fecha_pago': ['exact', 'gte', 'lte'],
        'recepcion_conforme': ['exact', 'isnull'],
        'servicio__proveedor': ['exact'],
        'servicio__proveedor__tipo_proveedor': ['exact']
    }
    ordering_fields = ['fecha_pago', 'fecha_emision', 'fecha_vencimiento', 'monto_total', 'nro_documento', 'establecimiento__nombre']
    search_fields = ['nro_documento', 'servicio__numero_cliente', 'establecimiento__nombre']

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """Genera una plantilla de Excel simplificada para la carga masiva."""
        cols = [
            'Nro Cliente', 'Nro Documento', 'Monto Total', 'Monto Interes', 
            'Fecha Emision (DD/MM/YYYY)', 'Fecha Vencimiento (DD/MM/YYYY)', 
            'Fecha Pago (DD/MM/YYYY)'
        ]
        df = pd.DataFrame(columns=cols)
        
        # Add a sample row
        df.loc[0] = [
            '10002000', 'FAC-123', 50000, 0, 
            '01/01/2026', '15/01/2026', '20/01/2026'
        ]

        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Pagos')
        
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="plantilla_pagos.xlsx"'
        return response

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No se proporcionó ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            df = pd.read_excel(file)
        except Exception as e:
            return Response({'error': f'Error al leer el archivo Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        errors = []
        pagos_to_create = []

        # Required columns mapping
        col_map = {
            'Nro Cliente': 'nro_cliente',
            'Nro Documento': 'nro_documento',
            'Monto Total': 'monto_total',
            'Monto Interes': 'monto_interes',
            'Fecha Emision (DD/MM/YYYY)': 'fecha_emision',
            'Fecha Vencimiento (DD/MM/YYYY)': 'fecha_vencimiento',
            'Fecha Pago (DD/MM/YYYY)': 'fecha_pago'
        }

        # Check missing columns
        missing_cols = [c for c in col_map.keys() if c not in df.columns]
        if missing_cols:
            return Response({'error': f'Faltan las siguientes columnas: {", ".join(missing_cols)}'}, status=status.HTTP_400_BAD_REQUEST)

        def parse_date(date_val, row_idx, col_name):
            if pd.isna(date_val):
                return None
            if isinstance(date_val, (datetime.date, datetime.datetime)):
                return date_val
            
            date_str = str(date_val).strip()
            # Try multiple formats
            for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'):
                try:
                    return datetime.datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            
            errors.append(f"Fila {row_idx + 2}: Formato de fecha '{date_str}' inválido en '{col_name}'. Use DD/MM/YYYY o DD-MM-YYYY.")
            return None

        for index, row in df.iterrows():
            nro_cli = str(row['Nro Cliente']).strip()
            nro_doc = str(row['Nro Documento']).strip()
            
            # 1. Validate Service by Nro Cliente
            services_qs = Servicio.objects.filter(numero_cliente=nro_cli)
            
            if not services_qs.exists():
                errors.append(f"Fila {index + 2}: No existe un servicio con el Nro Cliente '{nro_cli}'.")
                continue
            
            if services_qs.count() > 1:
                errors.append(f"Fila {index + 2}: Se encontró más de un servicio con el Nro Cliente '{nro_cli}'. Use una carga manual para este caso.")
                continue

            srv = services_qs.first()
            est = srv.establecimiento
            prov = srv.proveedor

            # 4. Parse Dates
            f_emision = parse_date(row['Fecha Emision (DD/MM/YYYY)'], index, 'Fecha Emision')
            f_vencimiento = parse_date(row['Fecha Vencimiento (DD/MM/YYYY)'], index, 'Fecha Vencimiento')
            f_pago = parse_date(row['Fecha Pago (DD/MM/YYYY)'], index, 'Fecha Pago')

            if not f_emision or not f_vencimiento or not f_pago:
                continue # Error already added by parse_date

            # 5. Validate Amounts
            try:
                m_total = int(row['Monto Total'])
                m_interes = int(row['Monto Interes']) if not pd.isna(row['Monto Interes']) else 0
            except ValueError:
                errors.append(f"Fila {index + 2}: Los montos deben ser valores numéricos enteros.")
                continue

            pagos_to_create.append(RegistroPago(
                servicio=srv,
                establecimiento=est,
                fecha_emision=f_emision,
                fecha_vencimiento=f_vencimiento,
                fecha_pago=f_pago,
                nro_documento=nro_doc,
                monto_interes=m_interes,
                monto_total=m_total
            ))

        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        if not pagos_to_create:
            return Response({'error': 'No se encontraron registros válidos para subir.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                RegistroPago.objects.bulk_create(pagos_to_create)
            return Response({'message': f'Se han cargado exitosamente {len(pagos_to_create)} registros.'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Error al guardar en la base de datos: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RecepcionConformeViewSet(viewsets.ModelViewSet):
    queryset = RecepcionConforme.objects.all().order_by('-fecha_emision', '-id')
    serializer_class = RecepcionConformeSerializer
    filterset_fields = ['proveedor', 'estado']
    ordering_fields = ['fecha_emision', 'folio', 'proveedor__nombre', 'id']
    search_fields = ['folio', 'proveedor__nombre']

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        import io
        from django.http import FileResponse
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, mm
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.colors import HexColor
        from django.conf import settings
        from reportlab.lib.utils import ImageReader
        import os

        # Page Size Folio (216x330mm)
        FOLIO = (216*mm, 330*mm)

        # Spanish Month Names
        MESES = {
            1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
            5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
            9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
        }

        rc = self.get_object()
        buffer = io.BytesIO()
        
        # Custom margins
        doc = SimpleDocTemplate(
            buffer,
            pagesize=FOLIO,
            rightMargin=50,
            leftMargin=50,
            topMargin=40,
            bottomMargin=40
        )

        # Container for elements
        elements = []
        
        # Styles from reference code
        styles = getSampleStyleSheet()
        
        # Corporate Colors
        color_verde = HexColor('#92D050')
        color_amarillo = HexColor('#FFD400')
        color_rosado = HexColor('#F68A91')
        color_rojo = HexColor('#E33E41')
        color_celeste = HexColor('#48C1EB')
        color_azul = HexColor('#3E7AB7')
        strip_colors = [color_verde, color_amarillo, color_rosado, color_rojo, color_celeste, color_azul]

        def draw_color_strips(canvas, doc):
            canvas.saveState()
            page_w, page_h = doc.pagesize
            h_strip = 12
            n = len(strip_colors)
            w_seg = page_w / n
            
            # Top strip
            for i, color in enumerate(strip_colors):
                canvas.setFillColor(color)
                canvas.rect(i * w_seg, page_h - h_strip, w_seg, h_strip, stroke=0, fill=1)
            
            # Bottom strip
            for i, color in enumerate(strip_colors):
                canvas.setFillColor(color)
                canvas.rect(i * w_seg, 0, w_seg, h_strip, stroke=0, fill=1)
            
            canvas.restoreState()

        azul_oscuro = HexColor('#1F4970')
        gris_claro = HexColor('#F5F5F5')
        gris_lineas = HexColor('#CCCCCC')

        styles.add(ParagraphStyle(
            name='MainTitle',
            parent=styles['Heading1'],
            alignment=TA_CENTER,
            fontSize=12,
            spaceAfter=15,
            spaceBefore=15,
            fontName='Helvetica-Bold'
        ))
        
        styles.add(ParagraphStyle(
            name='SignatureTitle',
            parent=styles['Heading1'],
            alignment=TA_CENTER,
            fontSize=10,
            spaceAfter=4,
            spaceBefore=4,
            fontName='Helvetica-Bold'
        ))
        
        styles.add(ParagraphStyle(
            name='NormalText',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            spaceBefore=10,
            spaceAfter=10,
            alignment=4 # Justified
        ))

        styles.add(ParagraphStyle(
            name='FolioStyle',
            parent=styles['Normal'],
            alignment=2, # Right
            fontSize=9,
            fontName='Helvetica-Bold',
            spaceAfter=5
        ))

        # Helper for proportional scaling (Manually fixed for ReportLab Image)
        def get_scaled_image(path, max_w, max_h):
            img_reader = ImageReader(path)
            iw, ih = img_reader.getSize()
            aspect = ih / float(iw)
            
            w = max_w
            h = w * aspect
            
            if h > max_h:
                h = max_h
                w = h / aspect
                
            return Image(path, width=w, height=h)

        # Logos paths
        logo_slep_path = os.path.join(settings.BASE_DIR, 'frontend', 'public', 'Logo SLEP.png')
        logo_iquique_path = os.path.join(settings.BASE_DIR, 'frontend', 'public', 'Iquique.png')

        header_data = [[]]
        if os.path.exists(logo_iquique_path):
            # Decrease Iquique logo size slightly
            img_iquique = get_scaled_image(logo_iquique_path, 1.6*inch, 0.9*inch)
            header_data[0].append(img_iquique)
        else:
            header_data[0].append("")

        header_data[0].append(Paragraph("", styles['Normal'])) # Spacer

        if os.path.exists(logo_slep_path):
            # Enlarge SLEP logo size as requested
            img_slep = get_scaled_image(logo_slep_path, 1.8*inch, 1.5*inch)
            header_data[0].append(img_slep)
        else:
            header_data[0].append("")

        header_table = Table(header_data, colWidths=[2*inch, 3*inch, 2*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (0,0), 'LEFT'),
            ('ALIGN', (2,0), (2,0), 'RIGHT'),
            ('ALIGN', (1,0), (1,0), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 40))

        # Title
        elements.append(Paragraph("RECEPCIÓN CONFORME", styles['MainTitle']))

        # Intro Paragraph
        first_pago = rc.registros.first()
        est_name = first_pago.establecimiento.nombre if first_pago else "Establecimiento no definido"
        prov_name = rc.proveedor.nombre
        fecha = rc.fecha_emision
        intro_text = (
            f"En Iquique, a {fecha.day} de {MESES.get(fecha.month)} de {fecha.year} "
            f"en el establecimiento {est_name}, se procede a dar recepción conforme a las boletas "
            f"de {prov_name}, se adjunta listado."
        )
        elements.append(Paragraph(intro_text, styles['NormalText']))
        
        # Folio Right Aligned above table
        elements.append(Paragraph(f"FOLIO: {rc.folio}", styles['FolioStyle']))
        elements.append(Spacer(1, 5))

        # Detail Table
        headers = ['N° Cliente', 'Establecimiento', 'Factura', 'Monto JUNJI', 'Monto Final']
        data_body = [headers]
        
        for pago in rc.registros.all():
            monto_junji = pago.monto_total - pago.monto_interes
            row = [
                pago.servicio.numero_cliente,
                Paragraph(pago.establecimiento.nombre, 
                         ParagraphStyle(
                             'EstStyle',
                             parent=styles['Normal'],
                             fontSize=9,
                             leading=11,
                             wordWrap='LTR',
                         )),
                pago.nro_documento,
                f"${monto_junji:,}".replace(",", "."),
                f"${pago.monto_total:,}".replace(",", ".")
            ]
            data_body.append(row)
        
        # Calculate available width (8.5 inch - 100 points margins)
        available_width = FOLIO[0] - 100
        col_widths = [
            available_width * 0.12,  # N° Cliente
            available_width * 0.41,  # Establecimiento
            available_width * 0.17,  # Factura
            available_width * 0.15,  # Monto JUNJI
            available_width * 0.15   # Monto Final
        ]

        t_body = Table(data_body, colWidths=col_widths)
        t_body.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            ('ALIGN', (0,1), (2,1), 'LEFT'),
            ('ALIGN', (3,1), (-1,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTNAME', (0,1), (-1,1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BACKGROUND', (0,0), (-1,0), azul_oscuro),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('BACKGROUND', (0,1), (-1,-1), gris_claro),
            ('GRID', (0,0), (-1,-1), 0.5, gris_lineas),
            ('BOX', (0,0), (-1,-1), 1, azul_oscuro),
            ('TOPPADDING', (0,0), (-1,0), 6),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('TOPPADDING', (0,1), (-1,-1), 12),
            ('BOTTOMPADDING', (0,1), (-1,-1), 12),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ]))
        elements.append(t_body)
        elements.append(Spacer(1, 180))

        # Signature Section
        firmante = rc.firmante

        if firmante:
            # Signature Line
            sig_line = Table([[""]], colWidths=[2.5*inch])
            sig_line.setStyle(TableStyle([
                ('LINEABOVE', (0,0), (-1,-1), 0.8, azul_oscuro),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            elements.append(sig_line)

            sig_p_style = ParagraphStyle(
                'SigText', parent=styles['Normal'], fontSize=8.5, alignment=TA_CENTER, fontName='Helvetica-Bold', leading=10,
                spaceBefore=0, spaceAfter=0
            )

            # 1. Name
            elements.append(Paragraph(firmante.nombre_funcionario.upper(), sig_p_style))
            # 2. Cargo
            # 2. Cargo + Dept/Subdiv
            cargo_line = firmante.cargo.upper() if firmante.cargo else ""
            org_unit = ""
            if firmante.departamento:
                d_name = firmante.departamento.nombre.upper()
                org_unit = f"DEPARTAMENTO {d_name}" if "DEPARTAMENTO" not in d_name else d_name
            elif firmante.subdireccion:
                s_name = firmante.subdireccion.nombre.upper()
                org_unit = s_name if "SUBDIRECCIÓN" in s_name else f"SUBDIRECCIÓN {s_name}"
            else:
                org_unit = "DIRECCIÓN"
            
            if cargo_line and org_unit:
                elements.append(Paragraph(f"{cargo_line} DE {org_unit}", sig_p_style))
            elif cargo_line or org_unit:
                elements.append(Paragraph(cargo_line or org_unit, sig_p_style))

            # 3. Administrador del Contrato
            elements.append(Paragraph("ADMINISTRADOR DEL CONTRATO", sig_p_style))
            # 4. Institution
            elements.append(Paragraph("SERVICIO LOCAL DE EDUCACIÓN PÚBLICA DE IQUIQUE", sig_p_style))
        else:
            # Fallback for generic signature line
            signature_width = 200
            signature_line = Table([['']], colWidths=[signature_width])
            signature_line.setStyle(TableStyle([
                ('LINEABOVE', (0,0), (-1,-1), 1, azul_oscuro),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('TOPPADDING', (0,0), (-1,-1), 5),
            ]))
            elements.append(signature_line)
            elements.append(Spacer(1, 5))
            elements.append(Paragraph("RECIBE CONFORME", styles['SignatureTitle']))

        doc.build(elements)
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f'RC_{rc.folio}.pdf')

    @action(detail=True, methods=['post'])
    def anular(self, request, pk=None):
        from .models import HistorialRecepcionConforme
        rc = self.get_object()
        
        if rc.estado == 'ANULADA':
            return Response({'error': 'Esta RC ya se encuentra anulada.'}, status=400)
            
        # 1. Liberate payments
        count_released = rc.registros.count()
        rc.registros.update(recepcion_conforme=None)
        
        # 2. Update state
        rc.estado = 'ANULADA'
        rc.save()
        
        # 3. Log history
        user = request.user.username if request.user else 'Sistema'
        HistorialRecepcionConforme.objects.create(
            recepcion_conforme=rc,
            accion='ANULACION',
            detalle=f"Documento anulado. Se liberaron {count_released} pagos asociados.",
            usuario=user
        )
        
        return Response({'status': 'RC anulada exitosamente.'})

class CDPViewSet(viewsets.ModelViewSet):
    queryset = CDP.objects.all().order_by('-fecha_subida')
    serializer_class = CDPSerializer
    filterset_fields = ['nombre'] # Add more if needed
    search_fields = ['nombre', 'descripcion']

class TipoEntregaViewSet(viewsets.ModelViewSet):
    queryset = TipoEntrega.objects.all()
    serializer_class = TipoEntregaSerializer

class FacturaAdquisicionViewSet(viewsets.ModelViewSet):
    queryset = FacturaAdquisicion.objects.all()
    serializer_class = FacturaAdquisicionSerializer
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_entrega', 'cdp']
    search_fields = ['descripcion', 'proveedor__nombre', 'id']

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        import io
        from django.http import FileResponse
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, mm
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib.colors import HexColor
        from django.conf import settings
        from reportlab.lib.utils import ImageReader
        from django.utils import timezone
        import os

        # Page Size Folio (216x330mm)
        FOLIO = (216*mm, 330*mm)

        # Spanish Month Names
        MESES = {
            1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
            5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
            9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
        }

        factura = self.get_object()
        buffer = io.BytesIO()
        
        # Margins for content
        doc = SimpleDocTemplate(
            buffer,
            pagesize=FOLIO,
            rightMargin=50,
            leftMargin=50,
            topMargin=60, # Increased for color strip
            bottomMargin=60  # Increased for color strip
        )

        elements = []
        styles = getSampleStyleSheet()

        # Corporate Colors
        color_verde = HexColor('#92D050')
        color_amarillo = HexColor('#FFD400')
        color_rosado = HexColor('#F68A91')
        color_rojo = HexColor('#E33E41')
        color_celeste = HexColor('#48C1EB')
        color_azul = HexColor('#3E7AB7')
        strip_colors = [color_verde, color_amarillo, color_rosado, color_rojo, color_celeste, color_azul]

        def draw_color_strips(canvas, doc):
            canvas.saveState()
            page_w, page_h = doc.pagesize
            h_strip = 12
            n = len(strip_colors)
            w_seg = page_w / n
            
            # Top strip
            for i, color in enumerate(strip_colors):
                canvas.setFillColor(color)
                canvas.rect(i * w_seg, page_h - h_strip, w_seg, h_strip, stroke=0, fill=1)
            
            # Bottom strip
            for i, color in enumerate(strip_colors):
                canvas.setFillColor(color)
                canvas.rect(i * w_seg, 0, w_seg, h_strip, stroke=0, fill=1)
            
            canvas.restoreState()
        
        # Styles from user snippet
        title_style = ParagraphStyle(
            "OCTitle",
            parent=styles["Heading2"],
            fontSize=11,
            textColor=colors.black,
            alignment=TA_CENTER,
            spaceAfter=8,
            fontName='Helvetica-Bold'
        )

        section_style = ParagraphStyle(
            "OCSection",
            parent=styles["Normal"],
            fontSize=9,
            textColor=colors.black,
            alignment=TA_LEFT,
            spaceBefore=6,
            spaceAfter=4,
            fontName='Helvetica-Bold'
        )

        cell_label_style = ParagraphStyle(
            "OCLabel",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.black,
            alignment=TA_LEFT,
            leading=10,
        )

        cell_value_style = ParagraphStyle(
            "OCValue",
            parent=styles["Normal"],
            fontSize=8,
            textColor=colors.black,
            alignment=TA_LEFT,
            leading=10,
        )

        # Helper for proportional scaling
        def get_scaled_image(path, max_w, max_h):
            img_reader = ImageReader(path)
            iw, ih = img_reader.getSize()
            aspect = ih / float(iw)
            w = max_w
            h = w * aspect
            if h > max_h:
                h = max_h
                w = h / aspect
            return Image(path, width=w, height=h)

        # Logos
        logo_dep_path = os.path.join(settings.BASE_DIR, 'frontend', 'public', 'Logo DEP.png')
        logo_slep_path = os.path.join(settings.BASE_DIR, 'frontend', 'public', 'Logo SLEP.png')

        header_data = [[]]
        if os.path.exists(logo_dep_path):
            header_data[0].append(get_scaled_image(logo_dep_path, 1.8*inch, 0.9*inch))
        else:
            header_data[0].append("")

        header_data[0].append(Paragraph("", styles['Normal'])) # Spacer

        if os.path.exists(logo_slep_path):
            header_data[0].append(get_scaled_image(logo_slep_path, 1.8*inch, 1.2*inch))
        else:
            header_data[0].append("")

        header_table = Table(header_data, colWidths=[2.5*inch, 2.2*inch, 2.5*inch])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (0,0), 'LEFT'),
            ('ALIGN', (2,0), (2,0), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 15))

        # Folio Table (Right Aligned)
        folio_label = Paragraph("<b>Folio</b>", cell_label_style)
        folio_value = Paragraph(f"<b>{factura.folio}</b>", cell_label_style)
        folio_table = Table([[folio_label, folio_value]], colWidths=[0.8*inch, 1.4*inch])
        folio_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.8, colors.black),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        
        folio_wrapper = Table([[ "", folio_table ]], colWidths=[doc.width - 2.2*inch, 2.2*inch])
        folio_wrapper.setStyle(TableStyle([
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(folio_wrapper)
        elements.append(Spacer(1, 10))

        # Title
        acta_table = Table([[Paragraph("ACTA DE RECEPCIÓN CONFORME", title_style)]], colWidths=[doc.width])
        acta_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.8, colors.black),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(acta_table)
        elements.append(Spacer(1, 12))

        # Section: Identificación Producto
        elements.append(Paragraph("<b>IDENTIFICACIÓN DEL PRODUCTO O SERVICIO ADQUIRIDO</b>", section_style))
        fecha_recepcion = factura.fecha_recepcion.strftime("%d-%m-%Y")
        
        producto_rows = [
            ["NÚMERO DE ORDEN DE COMPRA", ""], # Empty as requested
            ["NÚMERO DE FACTURA", str(factura.nro_factura or "")], # Use new field
            ["NÚMERO DE CERTIFICADO DE PRESUPUESTO", factura.cdp],
            ["DESCRIPCIÓN DE PRODUCTO O SERVICIO ADQUIRIDO", factura.descripcion],
            ["FECHA DE RECEPCIÓN CONFORME", fecha_recepcion],
            ["ENTREGA PARCIALIZADA O TOTAL DE PRODUCTO Y/O SERVICIO", str(factura.tipo_entrega)],
        ]
        
        producto_table = Table(
            [[Paragraph(label, cell_label_style), Paragraph(value, cell_value_style)] for label, value in producto_rows],
            colWidths=[doc.width * 0.45, doc.width * 0.55]
        )
        producto_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(producto_table)
        elements.append(Spacer(1, 12))

        # Section: Identificación Proveedor
        elements.append(Paragraph("<b>IDENTIFICACIÓN DEL PROVEEDOR</b>", section_style))
        proveedor_rows = [
            ["NOMBRE O RAZÓN SOCIAL DEL PROVEEDOR", factura.proveedor.nombre],
            ["ROL ÚNICO TRIBUTARIO (RUT)", factura.proveedor.rut or "-"],
        ]
        proveedor_table = Table(
            [[Paragraph(label, cell_label_style), Paragraph(value, cell_value_style)] for label, value in proveedor_rows],
            colWidths=[doc.width * 0.45, doc.width * 0.55]
        )
        proveedor_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.6, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(proveedor_table)
        elements.append(Spacer(1, 12))

        # Section: Pago
        elements.append(Paragraph("<b>PAGO</b>", section_style))
        def format_clp(valor):
            return f"$ {valor:,}".replace(",", ".")

        pago_rows = [
            ["TOTAL NETO", format_clp(factura.total_neto)],
            ["IMPUESTOS", format_clp(factura.iva)],
            ["TOTAL A PAGAR", format_clp(factura.total_pagar)],
        ]
        # Match image width (approx 60% of doc width)
        pago_table = Table(
            [[Paragraph(label, cell_label_style), Paragraph(value, cell_value_style)] for label, value in pago_rows],
            colWidths=[2.2*inch, 1.8*inch]
        )
        pago_table.setStyle(TableStyle([
            ("GRID", (0, 0), (-1, -1), 0.8, colors.black),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ]))
        # Wrap in another table to keep it left-aligned but short
        pago_wrapper = Table([[pago_table]], colWidths=[doc.width])
        pago_wrapper.setStyle(TableStyle([
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ]))
        elements.append(pago_wrapper)
        elements.append(Spacer(1, 80))

        # Signature
        firmante = factura.firmante

        if firmante:
            # Signature Line
            sig_line = Table([[""]], colWidths=[2.5*inch])
            sig_line.setStyle(TableStyle([
                ('LINEABOVE', (0,0), (-1,-1), 0.8, colors.black),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
            elements.append(sig_line)

            sig_p_style = ParagraphStyle(
                'SigText', parent=styles['Normal'], fontSize=8.5, alignment=TA_CENTER, fontName='Helvetica-Bold', leading=10,
                spaceBefore=0, spaceAfter=0
            )

            # 1. Name
            elements.append(Paragraph(firmante.nombre_funcionario.upper(), sig_p_style))
            # 2. Cargo + Dept/Subdiv
            cargo_line = firmante.cargo.upper() if firmante.cargo else ""
            org_unit = ""
            if firmante.departamento:
                d_name = firmante.departamento.nombre.upper()
                org_unit = f"DEPARTAMENTO {d_name}" if "DEPARTAMENTO" not in d_name else d_name
            elif firmante.subdireccion:
                s_name = firmante.subdireccion.nombre.upper()
                org_unit = s_name if "SUBDIRECCIÓN" in s_name else f"SUBDIRECCIÓN {s_name}"
            else:
                org_unit = "DIRECCIÓN"
            
            if cargo_line and org_unit:
                elements.append(Paragraph(f"{cargo_line} DE {org_unit}", sig_p_style))
            elif cargo_line or org_unit:
                elements.append(Paragraph(cargo_line or org_unit, sig_p_style))

            # 3. Administrador del Contrato
            elements.append(Paragraph("ADMINISTRADOR DEL CONTRATO", sig_p_style))
            # 4. Institution
            elements.append(Paragraph("SERVICIO LOCAL DE EDUCACIÓN PÚBLICA DE IQUIQUE", sig_p_style))
        else:
            # Fallback if no signer found
            signature_line = Table([['']], colWidths=[2.5*inch])
            signature_line.setStyle(TableStyle([
                ('LINEABOVE', (0,0), (-1,-1), 1, colors.black),
                ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ]))
            elements.append(signature_line)
            elements.append(Spacer(1, 5))
            elements.append(Paragraph("RECIBE CONFORME", ParagraphStyle(
                'SigStyle', parent=styles['Normal'], fontSize=9, alignment=TA_CENTER, fontName='Helvetica-Bold'
            )))

        doc.build(elements, onFirstPage=draw_color_strips, onLaterPages=draw_color_strips)
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f'RC_Adquisicion_{factura.folio}.pdf')
