from copy import copy
import json

from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import DjangoModelPermissions, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .import_export import (
    build_import_create_data,
    export_filename,
    parse_import_document,
    plantilla_to_export_payload,
)
from .models import PlantillaDocumento
from .page_sizes import page_sizes_payload
from .propositos import propositos_payload
from .renderer import build_preview_html, render_pdf_bytes
from .serializers import PlantillaDocumentoSerializer
from .variables import build_blank_context, build_sample_context, catalog_payload


class DocumentosDjangoModelPermissions(DjangoModelPermissions):
    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': ['%(app_label)s.view_%(model_name)s'],
        'HEAD': ['%(app_label)s.view_%(model_name)s'],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }


class PlantillaDocumentoViewSet(viewsets.ModelViewSet):
    queryset = PlantillaDocumento.objects.select_related(
        'creado_por', 'actualizado_por',
    ).all()
    serializer_class = PlantillaDocumentoSerializer
    permission_classes = [IsAuthenticated, DocumentosDjangoModelPermissions]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    search_fields = ['nombre', 'descripcion']
    filterset_fields = ['activa', 'tamano_pagina', 'proposito']
    ordering_fields = ['nombre', 'actualizado_en', 'creado_en', 'proposito']

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user, actualizado_por=self.request.user)

    def perform_update(self, serializer):
        serializer.save(actualizado_por=self.request.user)

    def get_permissions(self):
        if self.action in ('preview', 'preview_pdf', 'render', 'duplicar', 'exportar', 'importar'):
            return [IsAuthenticated()]
        return super().get_permissions()

    def _assert_perm(self, codename):
        user = self.request.user
        if user.is_superuser or user.has_perm(f'documentos.{codename}'):
            return None
        return Response({'detail': 'Sin permiso.'}, status=status.HTTP_403_FORBIDDEN)

    def _merge_context(self, extra=None, *, sample=True, proposito=None):
        usuario = self.request.user.get_full_name() or self.request.user.username
        ctx = (
            build_sample_context(usuario_nombre=usuario, proposito=proposito)
            if sample
            else build_blank_context(usuario_nombre=usuario)
        )
        if extra:
            ctx.update({k: v for k, v in extra.items() if v is not None})
        return ctx

    @action(detail=True, methods=['post'])
    def duplicar(self, request, pk=None):
        denied = self._assert_perm('add_plantilladocumento')
        if denied:
            return denied
        original = self.get_object()
        clone = PlantillaDocumento.objects.get(pk=original.pk)
        clone.pk = None
        clone.id = None
        clone.nombre = f'{original.nombre} (copia)'
        clone.proposito = 'borrador'
        clone.creado_por = request.user
        clone.actualizado_por = request.user
        clone.save()
        return Response(self.get_serializer(clone).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def exportar(self, request, pk=None):
        denied = self._assert_perm('view_plantilladocumento')
        if denied:
            return denied
        plantilla = self.get_object()
        payload = plantilla_to_export_payload(plantilla)
        content = json.dumps(payload, ensure_ascii=False, indent=2)
        response = HttpResponse(content, content_type='application/json; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{export_filename(plantilla)}"'
        return response

    @action(detail=False, methods=['post'], url_path='importar')
    def importar(self, request):
        denied = self._assert_perm('add_plantilladocumento')
        if denied:
            return denied

        raw = None
        upload = request.FILES.get('archivo')
        if upload is not None:
            try:
                raw = upload.read()
            except OSError:
                return Response(
                    {'error': 'No se pudo leer el archivo.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif isinstance(request.data, dict) and request.data.get('plantilla'):
            raw = request.data
        elif request.body:
            raw = request.body

        if raw is None:
            return Response(
                {'error': 'Indique un archivo JSON (.sgaf-plantilla.json).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            plantilla_data = parse_import_document(raw)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        mantener = str(request.data.get('mantener_proposito', '')).lower() in ('1', 'true', 'yes', 'on')
        nombre_override = (request.data.get('nombre') or '').strip() or None

        try:
            create_data = build_import_create_data(
                plantilla_data,
                mantener_proposito=mantener,
                nombre_override=nombre_override,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=create_data)
        serializer.is_valid(raise_exception=True)
        serializer.save(creado_por=request.user, actualizado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        denied = self._assert_perm('view_plantilladocumento')
        if denied:
            return denied
        plantilla = copy(self.get_object())
        payload = request.data if isinstance(request.data, dict) else {}
        draft = {field: payload.get(field, getattr(plantilla, field)) for field in [
            'cuerpo_html', 'encabezado_html', 'pie_html', 'tamano_pagina', 'orientacion',
            'ancho_mm', 'alto_mm', 'margen_superior_mm', 'margen_inferior_mm',
            'margen_izquierdo_mm', 'margen_derecho_mm',
        ]}
        for field, value in draft.items():
            setattr(plantilla, field, value if value is not None else getattr(plantilla, field))
        context = self._merge_context(
            payload.get('contexto'),
            proposito=payload.get('proposito') or getattr(plantilla, 'proposito', None),
        )
        html = build_preview_html(plantilla, context)
        return Response({'html': html})

    @action(detail=True, methods=['post'])
    def render(self, request, pk=None):
        denied = self._assert_perm('view_plantilladocumento')
        if denied:
            return denied
        plantilla = copy(self.get_object())
        payload = request.data if isinstance(request.data, dict) else {}
        context = self._merge_context(
            payload.get('contexto'),
            proposito=payload.get('proposito') or getattr(plantilla, 'proposito', None),
        )
        try:
            pdf = render_pdf_bytes(plantilla, context)
        except Exception as exc:
            return Response(
                {'error': f'No se pudo generar el PDF: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        filename = f'{plantilla.nombre or "documento"}.pdf'
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    @action(detail=True, methods=['post'], url_path='preview-pdf')
    def preview_pdf(self, request, pk=None):
        denied = self._assert_perm('view_plantilladocumento')
        if denied:
            return denied
        plantilla = copy(self.get_object())
        payload = request.data if isinstance(request.data, dict) else {}
        for field in [
            'cuerpo_html', 'encabezado_html', 'pie_html', 'tamano_pagina', 'orientacion',
            'ancho_mm', 'alto_mm', 'margen_superior_mm', 'margen_inferior_mm',
            'margen_izquierdo_mm', 'margen_derecho_mm',
        ]:
            if field in payload and payload[field] is not None:
                setattr(plantilla, field, payload[field])
        context = self._merge_context(
            payload.get('contexto'),
            proposito=payload.get('proposito') or getattr(plantilla, 'proposito', None),
        )
        try:
            pdf = render_pdf_bytes(plantilla, context)
        except Exception as exc:
            return Response(
                {'error': f'No se pudo generar el PDF: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="vista-previa.pdf"'
        return response


class DocumentosCatalogoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .propositos import BORRADOR_PROPOSITO, PROPOSITOS_PLANTILLAS_MULTIPLES

        proposito = request.query_params.get('proposito') or None
        ocupados = []
        for proposito_key in (
            PlantillaDocumento.objects
            .exclude(proposito=BORRADOR_PROPOSITO)
            .values_list('proposito', flat=True)
            .distinct()
        ):
            if proposito_key in PROPOSITOS_PLANTILLAS_MULTIPLES:
                continue
            ocupados.append(proposito_key)
        return Response({
            'variables': catalog_payload(proposito=proposito),
            'page_sizes': page_sizes_payload(),
            'propositos': propositos_payload(),
            'propositos_ocupados': ocupados,
        })
