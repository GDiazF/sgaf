from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Establecimiento, TelefonoEstablecimiento
from .serializers import EstablecimientoSerializer, TelefonoEstablecimientoSerializer

from .pagination import LargeResultsSetPagination

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
