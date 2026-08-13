"""PDF compartido RC_ADQ: ROC (contrato), RCF (sin OC) y RCA (compra ágil)."""

import io
import os

from django.http import FileResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch, mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from core.utils.report_utils import get_report_assets
from servicios.pdf.branding import draw_color_strips

MESES = {
    1: 'enero',
    2: 'febrero',
    3: 'marzo',
    4: 'abril',
    5: 'mayo',
    6: 'junio',
    7: 'julio',
    8: 'agosto',
    9: 'septiembre',
    10: 'octubre',
    11: 'noviembre',
    12: 'diciembre',
}


def _get_scaled_image(path, max_w, max_h):
    img_reader = ImageReader(path)
    iw, ih = img_reader.getSize()
    aspect = ih / float(iw)
    w = max_w
    h = w * aspect
    if h > max_h:
        h = max_h
        w = h / aspect
    return Image(path, width=w, height=h)


def _format_clp(valor):
    return f'$ {valor:,}'.replace(',', '.')


def build_rc_adq_pdf(factura):
    """
    Genera el Acta de Recepción Conforme (RC_ADQ) para una FacturaAdquisicion.
    Sirve ROC (contrato), RCF (sin OC) y RCA (compra ágil).
    """
    folio_size = (216 * mm, 330 * mm)
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=folio_size,
        rightMargin=50,
        leftMargin=50,
        topMargin=60,
        bottomMargin=60,
    )

    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'OCTitle',
        parent=styles['Heading2'],
        fontSize=11,
        textColor=colors.black,
        alignment=TA_CENTER,
        spaceAfter=8,
        fontName='Helvetica-Bold',
    )
    section_style = ParagraphStyle(
        'OCSection',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.black,
        alignment=TA_LEFT,
        spaceBefore=6,
        spaceAfter=4,
        fontName='Helvetica-Bold',
    )
    cell_label_style = ParagraphStyle(
        'OCLabel',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black,
        alignment=TA_LEFT,
        leading=10,
    )
    cell_value_style = ParagraphStyle(
        'OCValue',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.black,
        alignment=TA_LEFT,
        leading=10,
    )

    assets = get_report_assets('RC_ADQ')
    header_data = [[]]

    if assets['logo_izquierdo'] and os.path.exists(assets['logo_izquierdo']):
        header_data[0].append(_get_scaled_image(assets['logo_izquierdo'], 1.8 * inch, 0.9 * inch))
    else:
        header_data[0].append('')

    header_data[0].append(Paragraph('', styles['Normal']))

    if assets['logo_derecho'] and os.path.exists(assets['logo_derecho']):
        header_data[0].append(_get_scaled_image(assets['logo_derecho'], 1.8 * inch, 1.2 * inch))
    else:
        header_data[0].append('')

    header_table = Table(header_data, colWidths=[2.5 * inch, 2.2 * inch, 2.5 * inch])
    header_table.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]
        )
    )
    elements.append(header_table)
    elements.append(Spacer(1, 15))

    folio_label = Paragraph('<b>Folio</b>', cell_label_style)
    folio_value = Paragraph(f'<b>{factura.folio}</b>', cell_label_style)
    folio_table = Table([[folio_label, folio_value]], colWidths=[0.8 * inch, 1.4 * inch])
    folio_table.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]
        )
    )
    folio_wrapper = Table([['', folio_table]], colWidths=[doc.width - 2.2 * inch, 2.2 * inch])
    folio_wrapper.setStyle(
        TableStyle(
            [
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]
        )
    )
    elements.append(folio_wrapper)
    elements.append(Spacer(1, 10))

    acta_table = Table(
        [[Paragraph('ACTA DE RECEPCIÓN CONFORME', title_style)]],
        colWidths=[doc.width],
    )
    acta_table.setStyle(
        TableStyle(
            [
                ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(acta_table)
    elements.append(Spacer(1, 12))

    elements.append(
        Paragraph(
            '<b>IDENTIFICACIÓN DEL PRODUCTO OR SERVICIO ADQUIRIDO</b>',
            section_style,
        )
    )
    fecha_recepcion = factura.fecha_recepcion.strftime('%d-%m-%Y')
    establecimientos_str = ', '.join([e.nombre for e in factura.establecimientos.all()])

    descripcion_final = factura.descripcion or ''
    period_str = ''
    if factura.periodo:
        m_name = MESES.get(factura.periodo.month, '').upper()
        period_str = f'{m_name} {factura.periodo.year}'

    if period_str and period_str.lower() not in descripcion_final.lower():
        if descripcion_final:
            descripcion_final += f' - {period_str}'
        else:
            descripcion_final = period_str

    if establecimientos_str and establecimientos_str.lower() not in descripcion_final.lower():
        est_list = [f'- {e.nombre}' for e in factura.establecimientos.all()]
        vertical_est_str = '<br/>' + '<br/>'.join(est_list)
        if descripcion_final:
            descripcion_final += vertical_est_str
        else:
            descripcion_final = vertical_est_str.replace('<br/>', '', 1)

    nro_oc_final = factura.nro_oc
    if not nro_oc_final and factura.contrato:
        nro_oc_final = factura.contrato.nro_oc

    producto_rows = [
        ['NÚMERO DE ORDEN DE COMPRA', str(nro_oc_final or '-')],
        ['NÚMERO DE FACTURA', str(factura.nro_factura or '')],
        ['NÚMERO DE CERTIFICADO DE PRESUPUESTO', factura.cdp],
        ['DESCRIPCIÓN DE PRODUCTO O SERVICIO ADQUIRIDO', descripcion_final],
        ['FECHA DE RECEPCIÓN CONFORME', fecha_recepcion],
        [
            'ENTREGA PARCIALIZADA O TOTAL DE PRODUCTO Y/O SERVICIO',
            str(factura.tipo_entrega),
        ],
    ]
    producto_table = Table(
        [
            [Paragraph(label, cell_label_style), Paragraph(value, cell_value_style)]
            for label, value in producto_rows
        ],
        colWidths=[doc.width * 0.45, doc.width * 0.55],
    )
    producto_table.setStyle(
        TableStyle(
            [
                ('GRID', (0, 0), (-1, -1), 0.6, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(producto_table)
    elements.append(Spacer(1, 12))

    elements.append(Paragraph('<b>IDENTIFICACIÓN DEL PROVEEDOR</b>', section_style))
    proveedor_rows = [
        ['NOMBRE O RAZÓN SOCIAL DEL PROVEEDOR', factura.proveedor.nombre],
        ['ROL ÚNICO TRIBUTARIO (RUT)', factura.proveedor.rut or '-'],
    ]
    proveedor_table = Table(
        [
            [Paragraph(label, cell_label_style), Paragraph(value, cell_value_style)]
            for label, value in proveedor_rows
        ],
        colWidths=[doc.width * 0.45, doc.width * 0.55],
    )
    proveedor_table.setStyle(
        TableStyle(
            [
                ('GRID', (0, 0), (-1, -1), 0.6, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]
        )
    )
    elements.append(proveedor_table)
    elements.append(Spacer(1, 12))

    elements.append(Paragraph('<b>PAGO</b>', section_style))
    pago_rows = [
        ['TOTAL NETO', _format_clp(factura.total_neto)],
        ['IMPUESTOS', _format_clp(factura.iva)],
        ['TOTAL A PAGAR', _format_clp(factura.total_pagar)],
    ]
    pago_table = Table(
        [
            [Paragraph(label, cell_label_style), Paragraph(value, cell_value_style)]
            for label, value in pago_rows
        ],
        colWidths=[2.2 * inch, 1.8 * inch],
    )
    pago_table.setStyle(
        TableStyle(
            [
                ('GRID', (0, 0), (-1, -1), 0.8, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ]
        )
    )
    pago_wrapper = Table([[pago_table]], colWidths=[doc.width])
    pago_wrapper.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ]
        )
    )
    elements.append(pago_wrapper)
    elements.append(Spacer(1, 80))

    sig_p_style = ParagraphStyle(
        'SigText',
        parent=styles['Normal'],
        fontSize=8.5,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold',
        leading=10,
        spaceBefore=0,
        spaceAfter=0,
    )

    firmante = factura.firmante
    if firmante:
        name = firmante.nombre_funcionario.upper()
        cargo = firmante.cargo.upper() if firmante.cargo else ''
        org_unit = ''
        if firmante.departamento:
            d_name = firmante.departamento.nombre.upper()
            org_unit = f'DEPARTAMENTO {d_name}' if 'DEPARTAMENTO' not in d_name else d_name
        elif firmante.subdireccion:
            s_name = firmante.subdireccion.nombre.upper()
            org_unit = s_name if 'SUBDIRECCIÓN' in s_name else f'SUBDIRECCIÓN {s_name}'
        else:
            org_unit = 'DIRECCIÓN'
        cargo_line = f'{cargo} DE {org_unit}' if cargo and org_unit else (cargo or org_unit)
        firmante_details = [
            [Spacer(1, 40)],
            [Paragraph('_________________________________', sig_p_style)],
            [Paragraph(name, sig_p_style)],
            [Paragraph(cargo_line, sig_p_style)],
        ]
    else:
        firmante_details = [
            [Spacer(1, 40)],
            [Paragraph('_________________________________', sig_p_style)],
            [Paragraph('FIRMANTE DEL DOCUMENTO', sig_p_style)],
        ]

    t_right = Table(firmante_details, colWidths=[4 * inch])
    t_right.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ]
        )
    )
    main_sig_table = Table([[t_right]], colWidths=[doc.width])
    main_sig_table.setStyle(
        TableStyle(
            [
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]
        )
    )
    elements.append(main_sig_table)

    doc.build(elements, onFirstPage=draw_color_strips, onLaterPages=draw_color_strips)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename=f'{factura.folio}.pdf')
