from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, DjangoModelPermissions
from rest_framework.response import Response
from .models import LoginBackgroundImage, LoginBackgroundConfig
from .serializers import (
    LoginBackgroundImageSerializer,
    LoginBackgroundImagePublicSerializer,
    LoginBackgroundImageReorderSerializer,
    LoginBackgroundConfigSerializer,
)
from establecimientos.models import Establecimiento


class LoginBackgroundImageViewSet(viewsets.ModelViewSet):
    queryset = LoginBackgroundImage.objects.select_related('establecimiento', 'created_by').all()
    serializer_class = LoginBackgroundImageSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions]
    ordering = ['orden', 'id']

    def get_permissions(self):
        if self.action in ['active', 'public_config']:
            return [AllowAny()]
        return [permission() for permission in self.permission_classes]

    def get_serializer_class(self):
        if self.action == 'active':
            return LoginBackgroundImagePublicSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        queryset = LoginBackgroundImage.objects.active_for_public_login()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        item = self.get_object()
        item.activa = not item.activa
        item.save(update_fields=['activa', 'updated_at'])
        return Response({'id': item.id, 'activa': item.activa})

    @action(detail=False, methods=['patch'], url_path='reorder')
    def reorder(self, request):
        serializer = LoginBackgroundImageReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_map = {entry['id']: entry['orden'] for entry in serializer.validated_data['orders']}
        order_values = list(order_map.values())
        if len(order_values) != len(set(order_values)):
            return Response({'detail': 'No se permiten numeros de orden duplicados.'}, status=400)

        # Avoid collisions with records outside the reordered set.
        duplicated_with_others = LoginBackgroundImage.objects.filter(orden__in=order_values).exclude(
            id__in=order_map.keys()
        )
        if duplicated_with_others.exists():
            return Response({'detail': 'Uno o mas numeros de orden ya estan en uso.'}, status=400)

        items = LoginBackgroundImage.objects.filter(id__in=order_map.keys())

        for item in items:
            item.orden = order_map[item.id]
            item.save(update_fields=['orden', 'updated_at'])

        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'], url_path='establecimientos')
    def establecimientos(self, request):
        queryset = Establecimiento.objects.filter(activo=True).order_by('nombre').values('id', 'nombre')
        return Response(list(queryset))

    @action(detail=False, methods=['get'], url_path='public-config')
    def public_config(self, request):
        config, _ = LoginBackgroundConfig.objects.get_or_create(id=1, defaults={'rotation_seconds': 8})
        serializer = LoginBackgroundConfigSerializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['get', 'patch'], url_path='config')
    def config(self, request):
        config, _ = LoginBackgroundConfig.objects.get_or_create(id=1, defaults={'rotation_seconds': 8})
        if request.method == 'GET':
            serializer = LoginBackgroundConfigSerializer(config)
            return Response(serializer.data)

        serializer = LoginBackgroundConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(updated_by=request.user)
        return Response(LoginBackgroundConfigSerializer(instance).data)
