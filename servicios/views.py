from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.http import HttpResponse
import pandas as pd
import io
import datetime
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago, RecepcionConforme, CDP
from establecimientos.models import Establecimiento
from .serializers import ProveedorSerializer, TipoDocumentoSerializer, ServicioSerializer, TipoProveedorSerializer, RegistroPagoSerializer, RecepcionConformeSerializer, CDPSerializer

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
        from reportlab.lib.units import inch

        rc = self.get_object()
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            alignment=1, # Center
            spaceAfter=20
        )
        normal_style = styles['Normal']

        # Header (Logo placeholder + Title)
        # Assuming logo is at a static path or skipped if not found.
        # elements.append(Image('path/to/logo.png', width=2*inch, height=1*inch))
        elements.append(Paragraph("SERVICIO LOCAL DE EDUCACIÓN PÚBLICA IQUIQUE", styles['Heading3']))
        elements.append(Paragraph("DEPARTAMENTO DE ADMINISTRACIÓN Y FINANZAS", styles['Normal']))
        elements.append(Spacer(1, 0.2 * inch))
        
        elements.append(Paragraph(f"RECEPCIÓN CONFORME N° {rc.folio}", title_style))
        elements.append(Spacer(1, 0.2 * inch))

        # Metadata Table
        data_meta = [
            ["Fecha Emisión:", rc.fecha_emision.strftime('%d/%m/%Y')],
            ["Proveedor:", rc.proveedor.nombre],
            ["RUT:", rc.proveedor.rut or "-"],
            ["Tipo:", rc.proveedor.tipo_proveedor.nombre if rc.proveedor.tipo_proveedor else "-"]
        ]
        t_meta = Table(data_meta, colWidths=[1.5*inch, 4*inch])
        t_meta.setStyle(TableStyle([
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(t_meta)
        elements.append(Spacer(1, 0.3 * inch))

        # Payments Table
        elements.append(Paragraph("Detalle de Pagos Recibidos:", styles['Heading4']))
        elements.append(Spacer(1, 0.1 * inch))

        headers = ["Fecha Pago", "Nro Documento", "Servicio / Cliente", "Monto"]
        data_body = [headers]
        
        total_monto = 0
        for pago in rc.registros.all():
            monto_fmt = f"${pago.monto_total:,}".replace(",", ".")
            fecha_fmt = pago.fecha_pago.strftime('%d/%m/%Y')
            cliente_fmt = pago.servicio.numero_cliente
            row = [fecha_fmt, pago.nro_documento, cliente_fmt, monto_fmt]
            data_body.append(row)
            total_monto += pago.monto_total
        
        # Total Row
        data_body.append(["", "", "TOTAL", f"${total_monto:,}".replace(",", ".")])

        t_body = Table(data_body, colWidths=[1.5*inch, 1.5*inch, 2.5*inch, 1.5*inch])
        t_body.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ALIGN', (-1,0), (-1,-1), 'RIGHT'), # Align amounts to right
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f1f5f9')), # Total row bg
            ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-2), 1, colors.black),
            ('linebelow', (0,-2), (-1,-2), 2, colors.black), # Thick line above total
        ]))
        elements.append(t_body)
        elements.append(Spacer(1, 0.3 * inch))

        # Observations
        if rc.observaciones:
            elements.append(Paragraph("Observaciones:", styles['Heading4']))
            elements.append(Paragraph(rc.observaciones, normal_style))
            elements.append(Spacer(1, 0.4 * inch))

        # Signatures
        elements.append(Spacer(1, 1 * inch))
        
        # Signature Table
        sig_data = [
            ["__________________________", "__________________________"],
            ["Firma Responsable", "V°B° Jefatura"]
        ]
        t_sig = Table(sig_data, colWidths=[3.5*inch, 3.5*inch])
        t_sig.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(t_sig)

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
