from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago, RecepcionConforme
from .serializers import ProveedorSerializer, TipoDocumentoSerializer, ServicioSerializer, TipoProveedorSerializer, RegistroPagoSerializer, RecepcionConformeSerializer

class TipoProveedorViewSet(viewsets.ModelViewSet):
    queryset = TipoProveedor.objects.all()
    serializer_class = TipoProveedorSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filterset_fields = ['tipo_proveedor']

class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_documento', 'numero_cliente']

class RegistroPagoViewSet(viewsets.ModelViewSet):
    queryset = RegistroPago.objects.all().order_by('-fecha_pago')
    serializer_class = RegistroPagoSerializer
    filterset_fields = ['establecimiento', 'servicio', 'fecha_pago', 'recepcion_conforme', 'servicio__proveedor']

class RecepcionConformeViewSet(viewsets.ModelViewSet):
    queryset = RecepcionConforme.objects.all().order_by('-fecha_emision', '-id')
    serializer_class = RecepcionConformeSerializer
    filterset_fields = ['proveedor', 'fecha_emision']

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
