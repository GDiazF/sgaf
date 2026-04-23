from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import ProcesoCompra, EstadoContrato, CategoriaContrato, Contrato, OrientacionLicitacion, DocumentoContrato, HistorialContrato
from .serializers import ProcesoCompraSerializer, EstadoContratoSerializer, CategoriaContratoSerializer, ContratoSerializer, OrientacionLicitacionSerializer, DocumentoContratoSerializer

class ProcesoCompraViewSet(viewsets.ModelViewSet):
    queryset = ProcesoCompra.objects.all()
    serializer_class = ProcesoCompraSerializer

class EstadoContratoViewSet(viewsets.ModelViewSet):
    queryset = EstadoContrato.objects.all()
    serializer_class = EstadoContratoSerializer

class CategoriaContratoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaContrato.objects.all()
    serializer_class = CategoriaContratoSerializer

class OrientacionLicitacionViewSet(viewsets.ModelViewSet):
    queryset = OrientacionLicitacion.objects.all()
    serializer_class = OrientacionLicitacionSerializer

class DocumentoContratoViewSet(viewsets.ModelViewSet):
    queryset = DocumentoContrato.objects.all()
    serializer_class = DocumentoContratoSerializer
    filterset_fields = ['contrato']

class ContratoViewSet(viewsets.ModelViewSet):
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['proceso', 'estado', 'categoria', 'orientacion']
    search_fields = ['codigo_mercado_publico', 'descripcion']
    ordering_fields = ['fecha_inicio', 'fecha_termino', 'codigo_mercado_publico']

    def perform_create(self, serializer):
        instance = serializer.save()
        user = self.request.user.username if self.request.user.is_authenticated else "Sistema"
        HistorialContrato.objects.create(
            contrato=instance,
            accion="CREACION",
            detalle="Contrato registrado exitosamente.",
            usuario=user
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        user = self.request.user.username if self.request.user.is_authenticated else "Sistema"
        HistorialContrato.objects.create(
            contrato=instance,
            accion="MODIFICACION",
            detalle="Se actualizaron los datos básicos del contrato.",
            usuario=user
        )
