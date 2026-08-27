from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from documentacion_servicios.models import (
    CampoDefinicion,
    RegistroServicioDoc,
    TipoRegistroServicio,
)
from documentacion_servicios.serializers import (
    CampoDefinicionSerializer,
    RegistroServicioDocSerializer,
    TipoRegistroServicioSerializer,
)


class IsAuthenticatedOrRead(permissions.IsAuthenticated):
    pass


class CanConfigureTipos(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        return user.has_perm('documentacion_servicios.configure_tiporegistroservicio')


def _doc_perm(user, codename):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return user.has_perm(f'documentacion_servicios.{codename}')


class CanViewRegistrosDoc(permissions.BasePermission):
    def has_permission(self, request, view):
        return _doc_perm(request.user, 'view_registroserviciodoc')


class CanAddRegistroDoc(permissions.BasePermission):
    def has_permission(self, request, view):
        return _doc_perm(request.user, 'add_registroserviciodoc')


class CanChangeRegistroDoc(permissions.BasePermission):
    def has_permission(self, request, view):
        return _doc_perm(request.user, 'change_registroserviciodoc')


class CanDeleteRegistroDoc(permissions.BasePermission):
    def has_permission(self, request, view):
        return _doc_perm(request.user, 'delete_registroserviciodoc')


class TipoRegistroServicioViewSet(viewsets.ModelViewSet):
    queryset = TipoRegistroServicio.objects.prefetch_related('campos').all()
    serializer_class = TipoRegistroServicioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), CanConfigureTipos()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('list', 'retrieve'):
            # Operativo: solo activos; config ve todos si ?all=1
            if self.request.query_params.get('all') != '1':
                qs = qs.filter(activo=True)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        from documentacion_servicios.notify import sync_tipos_notificacion_para_tipo

        sync_tipos_notificacion_para_tipo(instance)

    def perform_update(self, serializer):
        instance = serializer.save()
        from documentacion_servicios.notify import sync_tipos_notificacion_para_tipo

        sync_tipos_notificacion_para_tipo(instance)


class CampoDefinicionViewSet(viewsets.ModelViewSet):
    serializer_class = CampoDefinicionSerializer
    permission_classes = [permissions.IsAuthenticated, CanConfigureTipos]

    def get_queryset(self):
        qs = CampoDefinicion.objects.select_related('tipo').all()
        tipo_id = self.request.query_params.get('tipo')
        if tipo_id:
            qs = qs.filter(tipo_id=tipo_id)
        return qs

    def perform_create(self, serializer):
        tipo_id = self.request.data.get('tipo')
        instance = serializer.save(tipo_id=tipo_id)
        from documentacion_servicios.notify import sync_tipos_notificacion_para_tipo

        sync_tipos_notificacion_para_tipo(instance.tipo)

    def perform_update(self, serializer):
        instance = serializer.save()
        from documentacion_servicios.notify import sync_tipos_notificacion_para_tipo

        sync_tipos_notificacion_para_tipo(instance.tipo)


class RegistroServicioDocViewSet(viewsets.ModelViewSet):
    serializer_class = RegistroServicioDocSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ['tipo', 'proveedor', 'establecimiento']
    ordering_fields = [
        'folio',
        'fecha_servicio',
        'creado_en',
        'proveedor__nombre',
        'establecimiento__nombre',
    ]
    ordering = ['-fecha_servicio', '-creado_en']

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'meta', 'descargar_zip'):
            return [permissions.IsAuthenticated(), CanViewRegistrosDoc()]
        if self.action == 'create':
            return [permissions.IsAuthenticated(), CanAddRegistroDoc()]
        if self.action in ('update', 'partial_update', 'enviar_correo'):
            return [permissions.IsAuthenticated(), CanChangeRegistroDoc()]
        if self.action == 'destroy':
            return [permissions.IsAuthenticated(), CanDeleteRegistroDoc()]
        return super().get_permissions()

    def get_queryset(self):
        qs = RegistroServicioDoc.objects.select_related(
            'tipo', 'proveedor', 'establecimiento', 'creado_por'
        )
        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo_id=tipo)
        proveedor = self.request.query_params.get('proveedor')
        if proveedor:
            qs = qs.filter(proveedor_id=proveedor)
        establecimiento = self.request.query_params.get('establecimiento')
        if establecimiento:
            qs = qs.filter(establecimiento_id=establecimiento)
        fecha_desde = self.request.query_params.get('fecha_desde')
        if fecha_desde:
            qs = qs.filter(fecha_servicio__gte=fecha_desde)
        fecha_hasta = self.request.query_params.get('fecha_hasta')
        if fecha_hasta:
            qs = qs.filter(fecha_servicio__lte=fecha_hasta)
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(folio__icontains=q)
        return qs

    @action(detail=False, methods=['get'], url_path='meta')
    def meta(self, request):
        """Tipos activos con campos para armar UI."""
        tipos = TipoRegistroServicio.objects.filter(activo=True).prefetch_related('campos')
        return Response(TipoRegistroServicioSerializer(tipos, many=True).data)

    @action(detail=False, methods=['post'], url_path='descargar-zip')
    def descargar_zip(self, request):
        """Empaqueta archivos de los registros indicados en un ZIP."""
        import io
        import zipfile
        from pathlib import Path

        from django.http import HttpResponse

        raw_ids = request.data.get('ids') or []
        try:
            ids = [int(x) for x in raw_ids]
        except (TypeError, ValueError):
            return Response({'detail': 'ids inválidos.'}, status=status.HTTP_400_BAD_REQUEST)
        if not ids:
            return Response(
                {'detail': 'Seleccione al menos un registro.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = (
            self.get_queryset()
            .filter(pk__in=ids)
            .exclude(archivo='')
            .exclude(archivo__isnull=True)
        )
        if not qs.exists():
            return Response(
                {'detail': 'Ningún registro seleccionado tiene archivo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buf = io.BytesIO()
        used_names = set()
        with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
            for reg in qs:
                try:
                    f = reg.archivo
                    if not f:
                        continue
                    base = Path(f.name).name
                    stem = Path(base).stem
                    suffix = Path(base).suffix
                    if reg.folio:
                        safe_folio = ''.join(
                            c if c.isalnum() or c in '-_' else '_' for c in reg.folio
                        )
                        candidate = f'{safe_folio}_{reg.pk}{suffix}'
                    else:
                        candidate = f'{stem}_{reg.pk}{suffix}'
                    name = candidate
                    n = 1
                    while name in used_names:
                        name = f'{Path(candidate).stem}_{n}{suffix}'
                        n += 1
                    used_names.add(name)
                    with f.open('rb') as fh:
                        zf.writestr(name, fh.read())
                except Exception:
                    continue

        if not used_names:
            return Response(
                {'detail': 'No se pudo leer ningún archivo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        buf.seek(0)
        resp = HttpResponse(buf.getvalue(), content_type='application/zip')
        resp['Content-Disposition'] = 'attachment; filename="documentacion_servicios.zip"'
        return resp

    @action(detail=True, methods=['post'], url_path='enviar-correo')
    def enviar_correo(self, request, pk=None):
        """Envía el documento al correo del establecimiento y del director/a."""
        import mimetypes
        from pathlib import Path

        from comunicaciones.utils import (
            enviar_correo_maestro,
            migrar_configuracion_antigua,
            resolver_logo_slep,
        )
        from establecimientos.email_utils import correos_envio_establecimiento

        reg = self.get_object()
        est = reg.establecimiento
        if not est:
            return Response(
                {'detail': 'El registro no tiene establecimiento.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        destinatarios = correos_envio_establecimiento(est)

        if not destinatarios:
            return Response(
                {
                    'detail': (
                        f'«{est.nombre}» no tiene correo institucional ni del director/a.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not reg.archivo:
            return Response(
                {'detail': 'El registro no tiene documento para adjuntar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        migrar_configuracion_antigua()

        fecha = reg.fecha_servicio.strftime('%d/%m/%Y') if reg.fecha_servicio else ''
        logo_path = resolver_logo_slep()
        logo_cid = 'logo_slep' if logo_path else None
        imagenes_inline = (
            [{'cid': logo_cid, 'path': logo_path}] if logo_path else None
        )

        contexto = {
            'tipo_nombre': reg.tipo.nombre,
            'establecimiento': est.nombre,
            'fecha_servicio': fecha,
            'folio': reg.folio or '',
            'nombre': est.nombre,
            'logo_cid': logo_cid or '',
        }

        try:
            nombre = Path(reg.archivo.name).name
            mimetype = mimetypes.guess_type(nombre)[0] or 'application/octet-stream'
            with reg.archivo.open('rb') as fh:
                contenido = fh.read()
            adjunto = {
                'nombre': nombre,
                'contenido': contenido,
                'mimetype': mimetype,
            }
        except Exception:
            return Response(
                {'detail': 'No se pudo leer el archivo adjunto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enviados = []
        fallidos = []
        for email in destinatarios:
            ok = enviar_correo_maestro(
                'DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO',
                [email],
                contexto,
                archivo_adjunto=adjunto,
                imagenes_inline=imagenes_inline,
            )
            if ok:
                enviados.append(email)
            else:
                fallidos.append(email)

        if not enviados:
            return Response(
                {'detail': 'No se pudo enviar el correo. Revise SMTP y la plantilla.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        if fallidos:
            return Response(
                {
                    'detail': (
                        f'Se envió a {", ".join(enviados)}, pero falló para: '
                        f'{", ".join(fallidos)}. Revise los correos del establecimiento.'
                    ),
                    'destinatarios': enviados,
                    'fallidos': fallidos,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        from django.utils import timezone

        reg.correo_enviado_en = timezone.now()
        reg.save(update_fields=['correo_enviado_en'])
        dest_label = ', '.join(enviados)
        return Response({
            'status': 'ok',
            'destinatario': dest_label,
            'destinatarios': enviados,
            'correo_enviado_en': reg.correo_enviado_en,
        })
