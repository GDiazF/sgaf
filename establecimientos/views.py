from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Establecimiento
from .serializers import EstablecimientoSerializer

class EstablecimientoViewSet(viewsets.ModelViewSet):
    queryset = Establecimiento.objects.all()
    serializer_class = EstablecimientoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo']
    ordering_fields = ['nombre', 'rbd', 'administracion']
    search_fields = ['nombre', 'rbd', 'administracion']
