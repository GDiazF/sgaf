from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.core.files.base import ContentFile
from django.http import HttpResponse
import pandas as pd
import io
import datetime
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago, RecepcionConforme, CDP, TipoEntrega, FacturaAdquisicion
from establecimientos.models import Establecimiento
from .serializers import (
    ProveedorSerializer, TipoDocumentoSerializer, ServicioSerializer, 
    TipoProveedorSerializer, RegistroPagoSerializer, RecepcionConformeSerializer,
    RecepcionConformeListSerializer,
    CDPSerializer, TipoEntregaSerializer, FacturaAdquisicionSerializer,
    CompraAgilSerializer,
)
from reportlab.lib.colors import HexColor
from core.utils.report_utils import get_report_assets
from core.drf_permissions import SgafModelPermissions, SgafPermissionMixin

_DEFAULT_PERMS = [permissions.IsAuthenticated, SgafModelPermissions]


class RegistroPagoSearchFilter(filters.SearchFilter):
    """También busca montos/RBD si el término trae puntos o separadores (ej. 150.000)."""

    def get_search_terms(self, request):
        terms = super().get_search_terms(request)
        extra = []
        for term in terms:
            digits = ''.join(c for c in term if c.isdigit())
            if digits and digits != term:
                extra.append(digits)
        return [*terms, *extra]

# Sufijo estándar para PDF corporativo en carga masiva: {nro_documento}_CORP.pdf
PAGO_PDF_CORPORATE_SUFFIX = 'CORP'

class TipoProveedorViewSet(viewsets.ModelViewSet):
    queryset = TipoProveedor.objects.all()
    serializer_class = TipoProveedorSerializer
    permission_classes = _DEFAULT_PERMS

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = _DEFAULT_PERMS
    pagination_class = None # Desactivar paginación para ver todos los proveedores en selectores
    filterset_fields = {
        'tipo_proveedor': ['exact'],
    }
    ordering_fields = ['nombre', 'rut', 'tipo_proveedor__nombre']
    search_fields = ['nombre', 'rut', 'tipo_proveedor__nombre']

class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer
    permission_classes = _DEFAULT_PERMS

class ServicioViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'download_template': 'servicios.add_servicio',
        'bulk_upload': 'servicios.add_servicio',
    }
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_documento', 'numero_cliente']
    ordering_fields = ['establecimiento__nombre', 'proveedor__nombre', 'numero_cliente']
    search_fields = ['numero_cliente', 'establecimiento__nombre', 'proveedor__nombre']

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """Genera una plantilla de Excel para la carga masiva de servicios."""
        cols = ['RBD', 'Proveedor', 'Nro Cliente', 'Nro Servicio', 'Tipo Documento']
        df = pd.DataFrame(columns=cols)
        # Sample data
        df.loc[0] = [11475, 'AGUAS ALTIPLANO', '12345678', '9999', 'BOLETA']
        
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Servicios')
        
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="plantilla_servicios.xlsx"'
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
        servicios_to_create = []

        cols_required = ['RBD', 'Proveedor', 'Nro Cliente', 'Tipo Documento']
        missing_cols = [c for c in cols_required if c not in df.columns]
        if missing_cols:
            return Response({'error': f'Faltan las siguientes columnas: {", ".join(missing_cols)}'}, status=status.HTTP_400_BAD_REQUEST)

        for index, row in df.iterrows():
            # Clean values
            rbd_raw = str(row['RBD']).split('.')[0].strip() if not pd.isna(row['RBD']) else ''
            prov_name = str(row['Proveedor']).strip() if not pd.isna(row['Proveedor']) else ''
            nro_cli = str(row['Nro Cliente']).strip() if not pd.isna(row['Nro Cliente']) else ''
            nro_srv = str(row['Nro Servicio']).strip() if 'Nro Servicio' in df.columns and not pd.isna(row['Nro Servicio']) else None
            tipo_doc_name = str(row['Tipo Documento']).strip() if not pd.isna(row['Tipo Documento']) else ''

            if not rbd_raw or not prov_name or not nro_cli:
                errors.append(f"Fila {index + 2}: RBD, Proveedor y Nro Cliente son obligatorios.")
                continue

            # 1. Finding Establishment (Exact)
            try:
                est = Establecimiento.objects.get(rbd=int(rbd_raw))
            except (ValueError, Establecimiento.DoesNotExist):
                errors.append(f"Fila {index + 2}: No se encontró establecimiento con RBD '{rbd_raw}'.")
                continue

            # 2. Finding Provider (Robust: RUT first, then Name exact, then Name contains)
            prov = Proveedor.objects.filter(rut__iexact=prov_name).first()
            if not prov:
                prov = Proveedor.objects.filter(nombre__iexact=prov_name).first()
            if not prov:
                prov = Proveedor.objects.filter(nombre__icontains=prov_name).first()
            
            if not prov:
                errors.append(f"Fila {index + 2}: No se encontró el proveedor '{prov_name}' (por nombre o RUT).")
                continue

            # 3. Finding Document Type (Robust)
            tipo_doc = TipoDocumento.objects.filter(nombre__iexact=tipo_doc_name).first()
            if not tipo_doc:
                tipo_doc = TipoDocumento.objects.filter(nombre__icontains=tipo_doc_name).first()
            
            if not tipo_doc:
                errors.append(f"Fila {index + 2}: No se encontró tipo de documento '{tipo_doc_name}'.")
                continue

            # 4. Check if service already exists (Globally unique Nro Cliente as requested)
            if Servicio.objects.filter(numero_cliente=nro_cli).exists():
                 errors.append(f"Fila {index + 2}: El Nro Cliente '{nro_cli}' ya está registrado en el sistema. Debe ser único y no pertenecer a varios establecimientos.")
                 continue

            servicios_to_create.append(Servicio(
                proveedor=prov,
                establecimiento=est,
                numero_cliente=nro_cli,
                numero_servicio=nro_srv,
                tipo_documento=tipo_doc
            ))

        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        if not servicios_to_create:
            return Response({'error': 'No se encontraron servicios válidos para subir.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                Servicio.objects.bulk_create(servicios_to_create)
            return Response({'message': f'Se han cargado exitosamente {len(servicios_to_create)} servicios.'}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Error al guardar en la base de datos: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegistroPagoViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'export_excel': 'servicios.view_registropago',
        'download_template': 'servicios.add_registropago',
        'bulk_upload': 'servicios.add_registropago',
        'bulk_upload_files': 'servicios.change_registropago',
        'generate_pdf': 'servicios.view_registropago',
    }
    queryset = RegistroPago.objects.all().order_by('-fecha_pago')
    serializer_class = RegistroPagoSerializer
    filter_backends = [
        DjangoFilterBackend,
        RegistroPagoSearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = {
        'establecimiento': ['exact'],
        'establecimiento__tipo__area_gestion': ['exact'],
        'servicio': ['exact'],
        'fecha_pago': ['exact', 'gte', 'lte'],
        'recepcion_conforme': ['exact', 'isnull'],
        'servicio__proveedor': ['exact'],
        'servicio__proveedor__tipo_proveedor': ['exact']
    }
    ordering_fields = ['fecha_pago', 'fecha_emision', 'fecha_vencimiento', 'monto_total', 'nro_documento', 'establecimiento__nombre']
    search_fields = [
        'nro_documento',
        'servicio__numero_cliente',
        'servicio__numero_servicio',
        'establecimiento__nombre',
        'monto_str',
        'rbd_str',
    ]

    def get_queryset(self):
        from django.db.models import CharField
        from django.db.models.functions import Cast

        return (
            RegistroPago.objects.select_related(
                'servicio',
                'servicio__proveedor',
                'establecimiento',
                'recepcion_conforme',
            )
            .annotate(
                monto_str=Cast('monto_total', CharField()),
                rbd_str=Cast('establecimiento__rbd', CharField()),
            )
            .order_by('-fecha_pago')
        )

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exporta los pagos filtrados a Excel."""
        from django_filters.rest_framework import DjangoFilterBackend
        
        # We manually apply filters to get the exact same result as the list view
        queryset = self.filter_queryset(self.get_queryset())
        
        data = []
        for p in queryset:
            data.append({
                'Fecha Pago': p.fecha_pago,
                'Establecimiento': p.establecimiento.nombre,
                'RBD': p.establecimiento.rbd,
                'Proveedor': p.servicio.proveedor.nombre,
                'Nro Cliente': p.servicio.numero_cliente,
                'Nro Documento': p.nro_documento,
                'Fecha Emisión': p.fecha_emision,
                'Fecha Vencimiento': p.fecha_vencimiento,
                'Monto Total': p.monto_total,
                'Monto Interes': p.monto_interes,
                'Consumo': p.consumo if p.consumo is not None else '-',
                'Unidad de Medida': p.servicio.unidad_medida if p.servicio.unidad_medida else '-',
                'Tiene RC': 'SÍ' if p.recepcion_conforme else 'NO',
                'Folio RC': p.recepcion_conforme.folio if p.recepcion_conforme else '-'
            })
            
        df = pd.DataFrame(data)
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Reporte Consumos')
            
        buffer.seek(0)
        response = HttpResponse(
            buffer.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="reporte_consumos.xlsx"'
        return response

    @action(detail=False, methods=['get'])
    def download_template(self, request):
        """Genera una plantilla de Excel simplificada para la carga masiva."""
        cols = [
            'Nro Cliente', 'Nro Documento', 'Monto Total', 'Monto Interes', 
            'Fecha Emision (DD/MM/YYYY)', 'Fecha Vencimiento (DD/MM/YYYY)', 
            'Fecha Pago (DD/MM/YYYY)', 'Consumo'
        ]
        df = pd.DataFrame(columns=cols)
        
        # Add a sample row
        df.loc[0] = [
            '10002000', 'FAC-123', 50000, 0, 
            '01/01/2026', '15/01/2026', '20/01/2026', 15.5
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

        def parse_date(date_val, row_idx, col_name, required=True):
            if pd.isna(date_val) or str(date_val).strip() in ('', 'nan', 'None'):
                if required:
                    errors.append(
                        f"Fila {row_idx + 2}: '{col_name}' es obligatoria y está vacía."
                    )
                return None
            if isinstance(date_val, (datetime.date, datetime.datetime)):
                return date_val.date() if isinstance(date_val, datetime.datetime) else date_val

            date_str = str(date_val).strip()
            for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'):
                try:
                    return datetime.datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue

            errors.append(
                f"Fila {row_idx + 2}: Formato de fecha '{date_str}' inválido en '{col_name}'. "
                "Use DD/MM/YYYY o DD-MM-YYYY."
            )
            return None

        emision_autocompletada = 0

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

            # 2. Check for Duplicate Invoice for the same Service
            if RegistroPago.objects.filter(servicio=srv, nro_documento=nro_doc).exists():
                errors.append(f"Fila {index + 2}: La factura '{nro_doc}' ya fue ingresada para el servicio '{nro_cli}'.")
                continue
                
            # 3. Check for duplicates within the Excel file itself
            if any(p.servicio == srv and p.nro_documento == nro_doc for p in pagos_to_create):
                errors.append(f"Fila {index + 2}: La factura '{nro_doc}' para el servicio '{nro_cli}' está repetida dentro del mismo archivo Excel.")
                continue

            # 4. Parse Dates (vencimiento y pago obligatorias; emisión opcional → se usa vencimiento)
            f_emision = parse_date(
                row['Fecha Emision (DD/MM/YYYY)'], index, 'Fecha Emision', required=False
            )
            f_vencimiento = parse_date(
                row['Fecha Vencimiento (DD/MM/YYYY)'], index, 'Fecha Vencimiento', required=True
            )
            f_pago = parse_date(
                row['Fecha Pago (DD/MM/YYYY)'], index, 'Fecha Pago', required=True
            )

            if not f_vencimiento or not f_pago:
                continue

            if not f_emision:
                f_emision = f_vencimiento
                emision_autocompletada += 1

            # 5. Validate Amounts
            try:
                m_total = int(row['Monto Total'])
                m_interes = int(row['Monto Interes']) if not pd.isna(row['Monto Interes']) else 0
            except ValueError:
                errors.append(f"Fila {index + 2}: Los montos deben ser valores numéricos enteros.")
                continue

            # 6. Parse Consumo (Optional)
            consumo_val = None
            if 'Consumo' in row and not pd.isna(row['Consumo']):
                try:
                    # Clean and parse string representation to handle commas or other formatting
                    consumo_str = str(row['Consumo']).strip().replace(',', '.')
                    consumo_val = float(consumo_str)
                except ValueError:
                    errors.append(f"Fila {index + 2}: El valor de consumo '{row['Consumo']}' debe ser numérico.")
                    continue

            pagos_to_create.append(RegistroPago(
                servicio=srv,
                establecimiento=est,
                fecha_emision=f_emision,
                fecha_vencimiento=f_vencimiento,
                fecha_pago=f_pago,
                nro_documento=nro_doc,
                monto_interes=m_interes,
                monto_total=m_total,
                consumo=consumo_val
            ))

        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        if not pagos_to_create:
            return Response({'error': 'No se encontraron registros válidos para subir.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                RegistroPago.objects.bulk_create(pagos_to_create)
            message = f'Se han cargado exitosamente {len(pagos_to_create)} registros.'
            if emision_autocompletada:
                message += (
                    f' En {emision_autocompletada} fila(s) la fecha de emisión estaba vacía '
                    'y se completó con la fecha de vencimiento.'
                )
            return Response(
                {
                    'message': message,
                    'emision_autocompletada': emision_autocompletada,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            return Response({'error': f'Error al guardar en la base de datos: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        """RC de un solo pago (unitario o Monto JUNJI) vía plantilla."""
        from servicios.pdf import build_registro_pago_rc_pdf

        tipo = request.query_params.get('tipo', 'PAGO').upper()
        return build_registro_pago_rc_pdf(
            self.get_object(),
            user=request.user,
            tipo=tipo or None,
        )

    @staticmethod
    def _parse_pago_pdf_filename(filename):
        """Devuelve partes del nombre sin extensión. Último segmento normalizado (CORP, CORP.PDF → CORP)."""
        base_name = filename.rsplit('.', 1)[0].strip()
        parts = [p.strip() for p in base_name.split('_') if p.strip()]
        if parts:
            last = parts[-1].upper()
            if last == 'CORP' or last.startswith('CORP.'):
                parts[-1] = 'CORP'
        return parts

    def _assign_comprobante_to_pagos(self, pagos, uploaded_file, results, label):
        pagos = list(pagos)
        if not pagos:
            results['errors'].append(f"{label}: No se encontraron registros de pago.")
            return 0

        content = uploaded_file.read()
        filename = uploaded_file.name
        for pago in pagos:
            pago.comprobante.save(filename, ContentFile(content), save=True)
        results['success'].append(
            f"{label}: Comprobante asignado a {len(pagos)} registro(s) de pago."
        )
        return len(pagos)

    @action(detail=False, methods=['post'])
    def bulk_upload_files(self, request):
        files = request.FILES.getlist('files')
        if not files:
            return Response({'error': 'No se proporcionaron archivos.'}, status=status.HTTP_400_BAD_REQUEST)

        results = {
            'success': [],
            'errors': [],
            'corporate_assignments': 0,
        }

        for f in files:
            name = f.name
            try:
                if '.' not in name:
                    results['errors'].append(f"Archivo {name}: Debe ser un archivo PDF.")
                    continue

                parts = self._parse_pago_pdf_filename(name)

                if not parts:
                    results['errors'].append(
                        f"Archivo {name}: nombre inválido. Use NroDocumento_NroCliente.pdf "
                        "o NroDocumento_CORP.pdf (corporativa)."
                    )
                    continue

                if len(parts) == 1:
                    doc = parts[0]
                    results['errors'].append(
                        f"Archivo {name}: falta el sufijo. Si es corporativa use {doc}_CORP.pdf; "
                        f"si es una sola boleta use {doc}_NroCliente.pdf."
                    )
                    continue

                # Factura corporativa (estándar único): {nro_documento}_CORP.pdf
                if parts[-1] == 'CORP':
                    nro_doc = '_'.join(parts[:-1])
                    pagos = RegistroPago.objects.filter(nro_documento=nro_doc).select_related('servicio')
                    self._assign_comprobante_to_pagos(
                        pagos,
                        f,
                        results,
                        f"Archivo {name} (corporativa · doc. {nro_doc})",
                    )
                    results['corporate_assignments'] += 1
                    continue

                # Boleta individual: {nro_documento}_{nro_cliente}.pdf (soporta _ en el documento)
                nro_cli = parts[-1]
                nro_doc = '_'.join(parts[:-1])
                pago = RegistroPago.objects.filter(
                    nro_documento=nro_doc,
                    servicio__numero_cliente=nro_cli,
                ).first()

                if not pago:
                    results['errors'].append(
                        f"Archivo {name}: No se encontró pago con documento '{nro_doc}' "
                        f"y Nro Cliente '{nro_cli}'."
                    )
                    continue

                self._assign_comprobante_to_pagos([pago], f, results, f"Archivo {name}")

            except Exception as e:
                results['errors'].append(f"Archivo {name}: Error inesperado: {str(e)}")

        return Response(results, status=status.HTTP_200_OK)

class RecepcionConformeViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'create_historical': 'servicios.add_recepcionconforme',
        'generate_pdf': 'servicios.view_recepcionconforme',
        'anular': 'servicios.delete_recepcionconforme',
    }
    queryset = RecepcionConforme.objects.all().order_by('-fecha_emision', '-id')
    serializer_class = RecepcionConformeSerializer
    permission_classes = _DEFAULT_PERMS
    filterset_fields = {
        'proveedor': ['exact'],
        'estado': ['exact', 'in'],
    }
    ordering_fields = ['fecha_emision', 'folio', 'proveedor__nombre', 'id']
    search_fields = ['folio', 'proveedor__nombre']

    def get_serializer_class(self):
        if self.action == 'list':
            return RecepcionConformeListSerializer
        return RecepcionConformeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == 'list':
            return qs.select_related(
                'proveedor',
                'proveedor__tipo_proveedor',
                'grupo_firmante',
                'firmante',
            )
        return qs.select_related(
            'proveedor',
            'proveedor__tipo_proveedor',
            'grupo_firmante',
            'firmante',
        ).prefetch_related('registros', 'historial')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        firma_map = getattr(self, '_list_firma_map', None)
        if firma_map is not None:
            context['firma_map'] = firma_map
        return context

    def list(self, request, *args, **kwargs):
        from .rc_firma import firma_map_for_rc_ids

        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            self._list_firma_map = firma_map_for_rc_ids([rc.id for rc in page])
        else:
            self._list_firma_map = firma_map_for_rc_ids(
                list(queryset.values_list('id', flat=True)),
            )
        try:
            return super().list(request, *args, **kwargs)
        finally:
            if hasattr(self, '_list_firma_map'):
                del self._list_firma_map

    @action(detail=True, methods=['post'])
    def enviar_a_firmar(self, request, pk=None):
        """Envía o reenvía la RC a la bandeja de firmas (RC + anexos PDF)."""
        rc = self.get_object()
        tipo = (request.data.get('tipo') or 'PAGO').upper()
        try:
            from .rc_firma import enviar_rc_a_firmar

            pendiente = enviar_rc_a_firmar(rc, request.user, tipo=tipo)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).exception('Error enviando RC %s a firmar', rc.pk)
            return Response(
                {'error': f'No se pudo armar el paquete de firma: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {
                'message': 'Documento enviado a la bandeja de firmas.',
                'codigo_interno': pendiente.codigo_interno,
                'pendiente_id': pendiente.id,
                'anexos': (pendiente.meta or {}).get('anexos') or [],
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'])
    def create_historical(self, request):
        from django.db import transaction
        from .models import HistorialRecepcionConforme
        
        proveedor_id = request.data.get('proveedor')
        registros_ids = request.data.get('registros_ids', [])
        
        if not proveedor_id or not registros_ids:
            return Response({'error': 'Proveedor y registros_ids son requeridos.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                # 1. Create RecepcionConforme
                rc = RecepcionConforme.objects.create(
                    proveedor_id=proveedor_id,
                    estado='HISTORICA',
                    observaciones='Recepción conforme histórica cargada por el sistema.'
                )
                
                # 2. Update payments
                RegistroPago.objects.filter(id__in=registros_ids).update(recepcion_conforme=rc)
                
                # 3. Log history
                user = request.user.username if request.user else 'Sistema'
                HistorialRecepcionConforme.objects.create(
                    recepcion_conforme=rc,
                    accion='CREACION_HISTORICA',
                    detalle=f"Recepción Conforme Histórica creada para {len(registros_ids)} pagos.",
                    usuario=user
                )
                
            serializer = self.get_serializer(rc)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        from servicios.pdf import build_recepcion_conforme_pdf

        tipo = request.query_params.get('tipo', '').upper()
        return build_recepcion_conforme_pdf(
            self.get_object(),
            user=request.user,
            tipo=tipo or None,
        )

    @action(detail=True, methods=['post'])
    def anular(self, request, pk=None):
        from .models import HistorialRecepcionConforme
        rc = self.get_object()
        
        if rc.estado == 'ANULADA':
            return Response({'error': 'Esta RC ya se encuentra anulada.'}, status=400)
            
        # 1. Liberate payments
        count_released = rc.registros.count()
        rc.registros.update(recepcion_conforme=None)

        # 1b. Quitar de bandeja de firmas + notificación al firmante
        from firma_digital.notify import cancelar_firmas_origen

        firmas_canceladas = cancelar_firmas_origen(origen='rc', referencia_id=rc.id)
        
        # 2. Update state
        rc.estado = 'ANULADA'
        rc.save()
        
        # 3. Log history
        user = request.user.username if request.user else 'Sistema'
        detalle = f'Documento anulado. Se liberaron {count_released} pagos asociados.'
        if firmas_canceladas:
            detalle += f' Se retiró de la bandeja de firmas ({firmas_canceladas} ítem(s)).'
        HistorialRecepcionConforme.objects.create(
            recepcion_conforme=rc,
            accion='ANULACION',
            detalle=detalle,
            usuario=user
        )
        
        return Response({'status': 'RC anulada exitosamente.'})

class CDPViewSet(viewsets.ModelViewSet):
    queryset = CDP.objects.all().order_by('-fecha_subida')
    serializer_class = CDPSerializer
    filterset_fields = ['nombre'] # Add more if needed
    search_fields = ['nombre', 'descripcion']
    permission_classes = _DEFAULT_PERMS

class TipoEntregaViewSet(viewsets.ModelViewSet):
    queryset = TipoEntrega.objects.all().order_by('nombre')
    serializer_class = TipoEntregaSerializer
    permission_classes = _DEFAULT_PERMS

class FacturaAdquisicionViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'generate_pdf': 'servicios.view_facturaadquisicion',
    }
    """
    Facturas sin OC (RCF). Solo filas con contrato=null y modalidad SIN_OC.
    Compra ágil → /api/compras-agiles/
    Recepciones de contrato (ROC) → contratos/recepciones-contrato/
    """
    queryset = FacturaAdquisicion.objects.filter(
        contrato__isnull=True,
        modalidad=FacturaAdquisicion.MODALIDAD_SIN_OC,
    )
    serializer_class = FacturaAdquisicionSerializer
    permission_classes = _DEFAULT_PERMS
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_entrega', 'cdp']
    search_fields = ['descripcion', 'proveedor__nombre', 'id', 'folio', 'cdp', 'total_pagar']

    def get_queryset(self):
        from servicios.services.factura_sin_oc import FacturaSinOcService

        return FacturaSinOcService.queryset()

    def _reject_contrato(self, data):
        raw = data.get('contrato')
        if raw not in (None, '', 'null', 'None'):
            return Response(
                {'detail': 'Use la API de recepciones de contrato para vincular un contrato.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    def create(self, request, *args, **kwargs):
        err = self._reject_contrato(request.data)
        if err:
            return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        err = self._reject_contrato(request.data)
        if err:
            return err
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(
            contrato=None,
            modalidad=FacturaAdquisicion.MODALIDAD_SIN_OC,
        )

    def perform_update(self, serializer):
        serializer.save(
            contrato=None,
            modalidad=FacturaAdquisicion.MODALIDAD_SIN_OC,
        )

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        from servicios.pdf import build_rc_adq_pdf

        return build_rc_adq_pdf(self.get_object(), user=request.user)


class CompraAgilViewSet(SgafPermissionMixin, viewsets.ModelViewSet):
    sgaf_action_permissions = {
        'generate_pdf': 'servicios.view_facturaadquisicion',
    }
    """
    Recepciones de compra ágil (RCA). Sin contrato, modalidad COMPRA_AGIL, OC obligatoria.
    """
    queryset = FacturaAdquisicion.objects.filter(
        contrato__isnull=True,
        modalidad=FacturaAdquisicion.MODALIDAD_COMPRA_AGIL,
    )
    serializer_class = CompraAgilSerializer
    permission_classes = _DEFAULT_PERMS
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_entrega', 'cdp']
    search_fields = [
        'descripcion', 'proveedor__nombre', 'id', 'folio', 'cdp',
        'total_pagar', 'nro_oc', 'nro_factura',
    ]

    def get_queryset(self):
        from servicios.services.compra_agil import CompraAgilService

        return CompraAgilService.queryset()

    def _validate_compra_agil(self, data, instance=None):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from servicios.services.compra_agil import CompraAgilService

        try:
            CompraAgilService.validate_nro_oc(data.get('nro_oc'), instance=instance)
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, 'message_dict') else {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    def create(self, request, *args, **kwargs):
        err = self._validate_compra_agil(request.data)
        if err:
            return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        err = self._validate_compra_agil(request.data, instance=self.get_object())
        if err:
            return err
        return super().update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(
            contrato=None,
            modalidad=FacturaAdquisicion.MODALIDAD_COMPRA_AGIL,
        )

    def perform_update(self, serializer):
        serializer.save(
            contrato=None,
            modalidad=FacturaAdquisicion.MODALIDAD_COMPRA_AGIL,
        )

    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        from servicios.pdf import build_rc_adq_pdf

        return build_rc_adq_pdf(self.get_object(), user=request.user)