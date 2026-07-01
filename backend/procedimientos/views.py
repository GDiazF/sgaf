from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Procedimiento, TipoProcedimiento
from .serializers import ProcedimientoSerializer, TipoProcedimientoSerializer

class TipoProcedimientoViewSet(viewsets.ModelViewSet):
    queryset = TipoProcedimiento.objects.all()
    serializer_class = TipoProcedimientoSerializer
    permission_classes = [permissions.DjangoModelPermissions]

import copy

class DjangoModelViewPermissions(permissions.DjangoModelPermissions):
    def __init__(self):
        self.perms_map = copy.deepcopy(self.perms_map)
        self.perms_map['GET'] = ['%(app_label)s.view_%(model_name)s']

class ProcedimientoViewSet(viewsets.ModelViewSet):
    serializer_class = ProcedimientoSerializer
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        # Si puede editar, puede ver los inactivos
        if user.is_staff or user.has_perm('procedimientos.change_procedimiento'):
            return Procedimiento.objects.all()
        return Procedimiento.objects.filter(activo=True)
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.DjangoModelPermissions()]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo', 'subdireccion', 'departamento', 'unidad']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['created_at', 'titulo']
    
    def perform_create(self, serializer):
        serializer.save(autor=self.request.user, activo=True)
