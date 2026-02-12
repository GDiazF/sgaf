from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Establecimiento, TelefonoEstablecimiento, TipoEstablecimiento
from .serializers import EstablecimientoSerializer, TelefonoEstablecimientoSerializer, TipoEstablecimientoSerializer

from .pagination import LargeResultsSetPagination

class TipoEstablecimientoViewSet(viewsets.ModelViewSet):
    queryset = TipoEstablecimiento.objects.all()
    serializer_class = TipoEstablecimientoSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering_fields = ['nombre']

class EstablecimientoViewSet(viewsets.ModelViewSet):
    queryset = Establecimiento.objects.all()
    serializer_class = EstablecimientoSerializer
    pagination_class = LargeResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['tipo']
    ordering_fields = ['nombre', 'rbd']
    search_fields = ['nombre', 'rbd']

class TelefonoEstablecimientoViewSet(viewsets.ModelViewSet):
    queryset = TelefonoEstablecimiento.objects.all()
    serializer_class = TelefonoEstablecimientoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['establecimiento', 'es_principal']
    search_fields = ['numero', 'etiqueta']
