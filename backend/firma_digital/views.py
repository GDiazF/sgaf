from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse, HttpResponse

from .authz import CanFirmarDigital, CanFirmarOProbarFirma, CanProbarFirmaDigital
from .client import (
    PURPOSE_ATENDIDO,
    FirmaGobError,
    firmagob_http_status,
    normalize_otp,
)
from .models import DocumentoFirmado, FirmaPendiente, SelloFirma
from .preview import PdfPreviewError, render_page_preview
from .queue import (
    firmar_pendiente,
    rechazar_firma,
    usuario_es_firmante_de,
)
from .registry import documento_a_dict, normalizar_codigo, registrar_documento, sha256_hex
from .resolve import resolver_sello, rut_to_firmagob_run
from .serializers import FirmaPendienteSerializer, SelloFirmaSerializer
from .stamp import (
    DEFAULT_STAMP_HEIGHT_PT,
    DEFAULT_STAMP_WIDTH_PT,
)


def _read_pdf(request):
    uploaded = request.FILES.get('file') or request.FILES.get('pdf')
    if not uploaded:
        return None, Response(
            {'error': 'Debe adjuntar un archivo PDF en el campo "file".'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    name = (uploaded.name or '').lower()
    content_type = (uploaded.content_type or '').lower()
    if not (name.endswith('.pdf') or 'pdf' in content_type):
        return None, Response(
            {'error': 'Solo se permiten archivos PDF.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pdf_bytes = uploaded.read()
    if not pdf_bytes:
        return None, Response(
            {'error': 'El archivo PDF está vacío.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return {'file': uploaded, 'bytes': pdf_bytes}, None


def _parse_int(value, default=None):
    if value is None or value == '':
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _get_funcionario(user):
    try:
        return user.funcionario_profile
    except Exception:
        return None


class SelloFirmaViewSet(viewsets.ModelViewSet):
    """Mantenedor de sellos por Subdirección / Departamento / Unidad."""

    queryset = SelloFirma.objects.select_related(
        'subdireccion', 'departamento', 'unidad'
    ).all()
    serializer_class = SelloFirmaSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre', 'actualizado_en', 'activo']
    ordering = ['nombre']

    def get_queryset(self):
        qs = super().get_queryset()
        nivel = self.request.query_params.get('nivel')
        if nivel == 'subdireccion':
            qs = qs.filter(subdireccion__isnull=False)
        elif nivel == 'departamento':
            qs = qs.filter(departamento__isnull=False)
        elif nivel == 'unidad':
            qs = qs.filter(unidad__isnull=False)
        activo = self.request.query_params.get('activo')
        if activo in ('1', 'true', 'True'):
            qs = qs.filter(activo=True)
        elif activo in ('0', 'false', 'False'):
            qs = qs.filter(activo=False)
        return qs


class FirmaGobConfigView(APIView):
    """Expone configuración no sensible + sello resuelto + estado firma-dep."""

    permission_classes = [CanFirmarOProbarFirma]

    def get(self, request):
        from django.conf import settings

        from .dep_client import capabilities

        funcionario = _get_funcionario(request.user)
        resuelto = resolver_sello(funcionario)
        run_efectivo = getattr(settings, 'FIRMAGOB_RUN', '') or ''
        if funcionario:
            run_from_rut = rut_to_firmagob_run(funcionario.rut)
            if run_from_rut:
                run_efectivo = run_from_rut

        dep_caps = None
        dep_error = None
        try:
            dep_caps = capabilities()
        except FirmaGobError as exc:
            dep_error = exc.message

        return Response(
            {
                'api_url': getattr(settings, 'FIRMA_DEP_URL', ''),
                'entity': getattr(settings, 'FIRMAGOB_ENTITY', ''),
                'run': run_efectivo,
                'purpose': PURPOSE_ATENDIDO,
                'requires_otp': True,
                'via': 'firma-dep',
                'firma_dep_configured': bool(getattr(settings, 'FIRMA_DEP_URL', '')),
                'api_token_configured': bool(
                    dep_caps and (dep_caps.get('enabled') or dep_caps.get('supports'))
                ),
                'secret_configured': bool(dep_caps),
                'default_stamp_width_pt': DEFAULT_STAMP_WIDTH_PT,
                'default_stamp_height_pt': DEFAULT_STAMP_HEIGHT_PT,
                'sello_resuelto': resuelto.to_dict(request) if resuelto else None,
                'funcionario': (
                    {
                        'nombre': funcionario.nombre_funcionario,
                        'cargo': funcionario.cargo,
                        'rut': funcionario.rut,
                    }
                    if funcionario
                    else None
                ),
                'firma_dep': dep_caps,
                'firma_dep_error': dep_error,
                'signature_modes': {
                    'atendida': True,
                    'desatendida': bool(
                        (dep_caps or {})
                        .get('supports', {})
                        .get('signatureModes', {})
                        .get('desatendida', True)
                    ),
                },
            }
        )


class FirmaGobPreviewView(APIView):
    """Renderiza una página del PDF para ubicar el sello visual."""

    permission_classes = [CanFirmarOProbarFirma]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        pdf, err = _read_pdf(request)
        if err:
            return err

        page = _parse_int(request.data.get('page'), 1) or 1
        page_index = max(0, page - 1)

        try:
            preview = render_page_preview(pdf['bytes'], page_index=page_index, scale=1.5)
        except PdfPreviewError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(preview)


class FirmaGobProbarView(APIView):
    """
    Endpoint de prueba: firma PDF vía firma-dep.
    mode=atendida (OTP) | desatendida (sin OTP, solo lab).
    """

    permission_classes = [CanProbarFirmaDigital]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        from django.conf import settings

        from .dep_client import (
            MODE_ATENDIDA,
            MODE_DESATENDIDA,
            get_pdf_page_size_pt,
            pdf_box_to_seal_margins_cm,
            seal_page_from_pdf_page,
            sign_pdf_atendida,
            sign_pdf_desatendida,
            validation_url_for,
        )

        pdf, err = _read_pdf(request)
        if err:
            return err

        mode = (request.data.get('mode') or MODE_ATENDIDA).strip().lower()
        if mode not in (MODE_ATENDIDA, MODE_DESATENDIDA):
            return Response(
                {'error': 'mode debe ser "atendida" o "desatendida".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp = None
        if mode == MODE_ATENDIDA:
            try:
                otp = normalize_otp(request.data.get('otp'))
            except FirmaGobError as exc:
                return Response({'error': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        funcionario = _get_funcionario(request.user)
        entity = (request.data.get('entity') or '').strip() or (
            getattr(settings, 'FIRMAGOB_ENTITY', '') or None
        )

        # Override de lab (FirmaPrueba) tiene prioridad sobre el RUT del perfil.
        override_rut = (request.data.get('rut') or '').strip()
        if override_rut:
            rut = override_rut
            signer_name = (request.data.get('signer_name') or '').strip() or (
                (funcionario.nombre_funcionario if funcionario else '') or 'Firmante de prueba'
            )
            role = (request.data.get('signer_role') or '').strip() or (
                (funcionario.cargo if funcionario else '') or ''
            )
        elif funcionario and funcionario.rut:
            rut = funcionario.rut
            signer_name = (funcionario.nombre_funcionario or '').strip()
            role = (funcionario.cargo or '').strip()
        else:
            rut = (getattr(settings, 'FIRMAGOB_RUN', '') or '').strip()
            signer_name = (request.data.get('signer_name') or '').strip() or 'Firmante de prueba'
            role = (request.data.get('signer_role') or '').strip()

        if mode == MODE_DESATENDIDA and not override_rut:
            return Response(
                {
                    'error': (
                        'En modo desatendida indique un RUT de prueba en el campo override '
                        '(CERT sandbox: 22.222.222-2) o el RUT de un certificado Desatendido real.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not rut:
            return Response(
                {
                    'error': (
                        'No se pudo determinar el RUT del firmante. '
                        'Vincule un funcionario o envíe el campo rut '
                        '(ej. 11.111.111-1 en CERT atendida, 22.222.222-2 desatendida).'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        with_stamp = str(request.data.get('with_stamp', '1')).lower() not in (
            '0',
            'false',
            'no',
        )
        seal_page = None
        seal_top = 2.0
        seal_left = 1.5
        if with_stamp:
            llx = _parse_int(request.data.get('llx'))
            lly = _parse_int(request.data.get('lly'))
            urx = _parse_int(request.data.get('urx'))
            ury = _parse_int(request.data.get('ury'))
            page = (request.data.get('page') or 'LAST').strip() or 'LAST'
            seal_page = seal_page_from_pdf_page(page)
            if None not in (llx, lly, urx, ury) and urx > llx and ury > lly:
                _w, page_h = get_pdf_page_size_pt(pdf['bytes'], seal_page)
                seal_top, seal_left = pdf_box_to_seal_margins_cm(
                    llx=llx,
                    ury=ury,
                    page_height_pt=page_h,
                )

        try:
            if mode == MODE_DESATENDIDA:
                signed = sign_pdf_desatendida(
                    pdf['bytes'],
                    rut=rut,
                    file_name=pdf['file'].name or 'documento.pdf',
                    entity=entity,
                    validation_url=validation_url_for(),
                    visible_seal=with_stamp,
                    seal_page=seal_page,
                    seal_top_margin_cm=round(seal_top, 2),
                    seal_left_margin_cm=round(seal_left, 2),
                )
                purpose = 'Desatendido'
            else:
                signed = sign_pdf_atendida(
                    pdf['bytes'],
                    rut=rut,
                    otp=otp,
                    file_name=pdf['file'].name or 'documento.pdf',
                    entity=entity,
                    validation_url=validation_url_for(),
                    visible_seal=with_stamp,
                    seal_page=seal_page,
                    seal_top_margin_cm=round(seal_top, 2),
                    seal_left_margin_cm=round(seal_left, 2),
                )
                purpose = PURPOSE_ATENDIDO
        except FirmaGobError as exc:
            http_status = firmagob_http_status(exc)
            body = {'error': exc.message}
            if exc.payload is not None:
                body['detail'] = exc.payload
            return Response(body, status=http_status)

        out_name = pdf['file'].name or 'documento.pdf'
        if out_name.lower().endswith('.pdf'):
            out_name = out_name[:-4] + '_firmado.pdf'
        else:
            out_name = out_name + '_firmado.pdf'

        registro = registrar_documento(
            pdf_bytes=signed,
            nombre_archivo=out_name,
            origen='prueba',
            purpose=purpose,
            firmante_nombre=signer_name,
            firmante_run=rut_to_firmagob_run(rut),
            firmante_cargo=role,
            user=request.user,
        )

        response = HttpResponse(signed, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{out_name}"'
        response['X-SGAF-Documento-Codigo'] = registro.codigo
        response['Access-Control-Expose-Headers'] = (
            'Content-Disposition, X-SGAF-Documento-Codigo'
        )
        return response


class ValidarDocumentoView(APIView):
    """Consulta pública de un documento firmado por código SGAF-AAAA-NNNN."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, codigo=None):
        code = normalizar_codigo(codigo or request.query_params.get('codigo') or '')
        if not code:
            return Response(
                {'error': 'Indique el código del documento (ej. SGAF-2026-0001).'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            doc = DocumentoFirmado.objects.get(codigo__iexact=code)
        except DocumentoFirmado.DoesNotExist:
            return Response(
                {
                    'valido': False,
                    'codigo': code,
                    'error': 'No se encontró un documento con ese código en SGAF.',
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(documento_a_dict(doc))


class ValidarDocumentoHashView(APIView):
    """Compara el hash de un PDF subido con el registro (opcional, público)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        code = normalizar_codigo(request.data.get('codigo') or '')
        uploaded = request.FILES.get('file') or request.FILES.get('pdf')
        if not code:
            return Response(
                {'error': 'Indique el código del documento.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not uploaded:
            return Response(
                {'error': 'Adjunte el PDF a verificar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            doc = DocumentoFirmado.objects.get(codigo__iexact=code)
        except DocumentoFirmado.DoesNotExist:
            return Response(
                {
                    'valido': False,
                    'codigo': code,
                    'coincide': False,
                    'error': 'No se encontró un documento con ese código en SGAF.',
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        file_hash = sha256_hex(uploaded.read())
        coincide = file_hash == doc.hash_sha256
        payload = documento_a_dict(doc)
        payload.update(
            {
                'coincide': coincide,
                'mensaje': (
                    'El archivo coincide con el registro de SGAF.'
                    if coincide
                    else 'El archivo no coincide con el hash registrado (posible alteración u otro archivo).'
                ),
            }
        )
        return Response(payload, status=status.HTTP_200_OK if coincide else status.HTTP_409_CONFLICT)


class FirmaPendienteViewSet(viewsets.ReadOnlyModelViewSet):
    """Bandeja de firmas del usuario (pendientes / firmados / rechazados)."""

    serializer_class = FirmaPendienteSerializer
    permission_classes = [CanFirmarDigital]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['titulo', 'codigo_interno', 'origen']
    ordering_fields = ['creado_en', 'firmado_en', 'titulo']
    ordering = ['-creado_en']

    def get_queryset(self):
        qs = FirmaPendiente.objects.select_related(
            'firmante', 'grupo_firmante', 'solicitado_por', 'documento_registro'
        )
        user = self.request.user
        if not user.is_superuser:
            try:
                func = user.funcionario_profile
            except Exception:
                return qs.none()
            qs = qs.filter(firmante=func)
        estado = self.request.query_params.get('estado')
        if estado in (
            FirmaPendiente.ESTADO_PENDIENTE,
            FirmaPendiente.ESTADO_FIRMADO,
            FirmaPendiente.ESTADO_RECHAZADO,
        ):
            qs = qs.filter(estado=estado)
        return qs

    @action(detail=False, methods=['get'])
    def contadores(self, request):
        qs = self.get_queryset().order_by()
        # Re-base without estado filter
        base = FirmaPendiente.objects.select_related('firmante')
        user = request.user
        if not user.is_superuser:
            try:
                func = user.funcionario_profile
            except Exception:
                return Response({'pendiente': 0, 'firmado': 0, 'rechazado': 0})
            base = base.filter(firmante=func)
        return Response(
            {
                'pendiente': base.filter(estado=FirmaPendiente.ESTADO_PENDIENTE).count(),
                'firmado': base.filter(estado=FirmaPendiente.ESTADO_FIRMADO).count(),
                'rechazado': base.filter(estado=FirmaPendiente.ESTADO_RECHAZADO).count(),
            }
        )

    @action(detail=True, methods=['get'])
    def documento(self, request, pk=None):
        """Sirve el PDF almacenado (paquete RC+anexos) o el firmado según estado."""
        pendiente = self.get_object()
        campo = pendiente.archivo_firmado if pendiente.estado == FirmaPendiente.ESTADO_FIRMADO and pendiente.archivo_firmado else pendiente.archivo_origen
        if not campo:
            return Response(
                {'error': 'Este ítem no tiene archivo PDF almacenado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            campo.open('rb')
        except Exception:
            return Response(
                {'error': 'No se pudo abrir el archivo PDF.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        filename = (campo.name or 'documento.pdf').split('/')[-1]
        response = FileResponse(campo, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'])
    def rechazar(self, request, pk=None):
        pendiente = self.get_object()
        try:
            rechazar_firma(pendiente, request.user, request.data.get('motivo') or '')
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FirmaPendienteSerializer(pendiente, context={'request': request}).data)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def firmar(self, request, pk=None):
        pendiente = self.get_object()
        pdf, err = _read_pdf(request)
        if err:
            return err
        try:
            otp = normalize_otp(request.data.get('otp'))
        except FirmaGobError as exc:
            return Response({'error': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        llx = _parse_int(request.data.get('llx'))
        lly = _parse_int(request.data.get('lly'))
        urx = _parse_int(request.data.get('urx'))
        ury = _parse_int(request.data.get('ury'))
        page = (request.data.get('page') or 'LAST').strip() or 'LAST'
        if None in (llx, lly, urx, ury):
            return Response(
                {'error': 'Debe indicar la posición del sello (llx, lly, urx, ury).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            pendiente, registro, signed = firmar_pendiente(
                pendiente,
                request.user,
                otp=otp,
                pdf_bytes=pdf['bytes'],
                llx=llx,
                lly=lly,
                urx=urx,
                ury=ury,
                page=page,
            )
        except PermissionError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except FirmaGobError as exc:
            http_status = firmagob_http_status(exc)
            body = {'error': exc.message}
            if exc.payload is not None:
                body['detail'] = exc.payload
            return Response(body, status=http_status)

        out_name = f'{pendiente.codigo_interno}_firmado.pdf'
        response = HttpResponse(signed, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{out_name}"'
        response['X-SGAF-Documento-Codigo'] = registro.codigo
        response['X-SGAF-Pendiente-Id'] = str(pendiente.id)
        response['Access-Control-Expose-Headers'] = (
            'Content-Disposition, X-SGAF-Documento-Codigo, X-SGAF-Pendiente-Id'
        )
        return response
