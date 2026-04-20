from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CategoriaBienestar, Beneficio, BeneficioArchivo
from .serializers import CategoriaBienestarSerializer, BeneficioSerializer, BeneficioArchivoSerializer

class CategoriaBienestarViewSet(viewsets.ModelViewSet):
    queryset = CategoriaBienestar.objects.all()
    serializer_class = CategoriaBienestarSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class BeneficioViewSet(viewsets.ModelViewSet):
    queryset = Beneficio.objects.all()
    serializer_class = BeneficioSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'estado']
    search_fields = ['titulo', 'descripcion']
    ordering_fields = ['orden', 'creado_en']
    ordering = ['orden']

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)


    @action(detail=False, methods=['patch'])
    def reorder(self, request):
        """Acción masiva para el Drag & Drop"""
        orders = request.data.get('orders', [])
        # orders: list of {id: X, orden: Y, estado: Z}
        for item in orders:
            Beneficio.objects.filter(id=item['id']).update(
                orden=item['orden'],
                estado=item.get('estado', 'BORRADOR')
            )
        return Response({'status': 'reordered'})

class BeneficioArchivoViewSet(viewsets.ModelViewSet):
    queryset = BeneficioArchivo.objects.all()
    serializer_class = BeneficioArchivoSerializer
