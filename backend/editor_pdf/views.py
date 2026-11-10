from django.db import transaction
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .catalogo import CATALOGO
from .certs import certificado_para
from .models import HerramientaPdf
from .plantilla import (
    VARIABLES,
    guardar_imagen,
    imagen_de,
    obtener_plantilla,
    render_plantilla,
    texto_para,
    valores_de,
)
from .serializers import HerramientaPdfSerializer


def _puede(user, codename):
    return bool(user and user.is_authenticated and (user.is_superuser or user.has_perm(codename)))


class PuedeVerEditor(BasePermission):
    def has_permission(self, request, view):
        return _puede(request.user, 'editor_pdf.view_herramientapdf') or _puede(
            request.user, 'editor_pdf.change_herramientapdf'
        )


class PuedeCambiarCatalogo(BasePermission):
    def has_permission(self, request, view):
        return _puede(request.user, 'editor_pdf.change_herramientapdf')


def sync_catalogo():
    existing = set(HerramientaPdf.objects.values_list('slug', flat=True))
    nuevos = []
    for orden, (slug, categoria, nombre, descripcion) in enumerate(CATALOGO, start=1):
        if slug in existing:
            continue
        nuevos.append(HerramientaPdf(
            slug=slug,
            categoria=categoria,
            nombre=nombre,
            descripcion=descripcion,
            orden=orden,
            visible=True,
        ))
        existing.add(slug)
    if nuevos:
        HerramientaPdf.objects.bulk_create(nuevos)


class HerramientaPdfViewSet(ModelViewSet):
    serializer_class = HerramientaPdfSerializer
    pagination_class = None
    http_method_names = ['get', 'patch', 'head', 'options']
    lookup_field = 'slug'

    def get_permissions(self):
        if self.action in ('partial_update', 'update'):
            return [PuedeCambiarCatalogo()]
        return [PuedeVerEditor()]

    def get_queryset(self):
        sync_catalogo()
        qs = HerramientaPdf.objects.all()
        if self.action == 'list' and not _puede(self.request.user, 'editor_pdf.change_herramientapdf'):
            qs = qs.filter(visible=True)
        return qs

    def partial_update(self, request, *args, **kwargs):
        herramienta = self.get_object()
        if 'visible' not in request.data:
            return Response({'visible': 'Indique si la herramienta se muestra.'}, status=400)
        visible = request.data.get('visible')
        if isinstance(visible, str):
            visible = visible.strip().lower() not in ('0', 'false', 'no', '')
        herramienta.visible = bool(visible)
        herramienta.save(update_fields=['visible'])
        return Response(self.get_serializer(herramienta).data)


class CertificadoEditorView(APIView):
    permission_classes = [PuedeVerEditor]

    def get(self, request):
        try:
            funcionario = request.user.funcionario_profile
        except Exception:
            funcionario = None
        if funcionario is None or not getattr(funcionario, 'rut', None):
            return Response(
                {'detail': 'Su usuario no tiene una ficha de funcionario con RUT. No se puede firmar.'},
                status=400,
            )
        if hasattr(funcionario, 'estado') and not funcionario.estado:
            return Response({'detail': 'El funcionario no está activo.'}, status=400)
        try:
            with transaction.atomic():
                payload = certificado_para(funcionario.rut)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        payload['nombre'] = getattr(funcionario, 'nombre_funcionario', '') or ''
        payload['cargo'] = getattr(funcionario, 'cargo_nombre', '') or ''
        payload['texto_firma'] = texto_para(request.user)
        imagen, imagen_tipo = imagen_de(obtener_plantilla())
        if imagen:
            payload['imagen_firma'] = imagen
            payload['imagen_tipo'] = imagen_tipo
        return Response(payload)


class PlantillaFirmaView(APIView):
    permission_classes = [PuedeCambiarCatalogo]

    def get(self, request):
        plantilla = obtener_plantilla()
        valores, con_ficha = valores_de(request.user)
        return Response(self._payload(plantilla.texto, valores, con_ficha))

    def put(self, request):
        texto = request.data.get('texto')
        if not isinstance(texto, str) or not texto.strip():
            return Response({'detail': 'Escriba el texto de la firma.'}, status=400)
        texto = texto.replace('\r\n', '\n')
        if len(texto) > 800:
            return Response({'detail': 'El texto admite hasta 800 caracteres.'}, status=400)
        plantilla = obtener_plantilla()
        plantilla.texto = texto
        campos = ['texto', 'actualizado_en']
        try:
            if request.data.get('quitar_imagen'):
                plantilla.imagen = None
                plantilla.imagen_tipo = ''
                campos.extend(['imagen', 'imagen_tipo'])
            elif request.data.get('imagen'):
                guardar_imagen(plantilla, request.data.get('imagen'), request.data.get('imagen_tipo'))
                campos.extend(['imagen', 'imagen_tipo'])
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)
        plantilla.save(update_fields=campos)
        valores, con_ficha = valores_de(request.user)
        return Response(self._payload(plantilla.texto, valores, con_ficha))

    def _payload(self, texto, valores, con_ficha):
        plantilla = obtener_plantilla()
        imagen, imagen_tipo = imagen_de(plantilla)
        return {
            'texto': texto,
            'con_ficha': con_ficha,
            'imagen': imagen,
            'imagen_tipo': imagen_tipo,
            'variables': [
                {'clave': clave, 'etiqueta': etiqueta, 'ejemplo': valores.get(clave, '')}
                for clave, etiqueta in VARIABLES
            ],
            'vista_previa': render_plantilla(texto, valores),
        }
