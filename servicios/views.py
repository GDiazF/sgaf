from rest_framework import viewsets
from .models import Proveedor, TipoDocumento, Servicio, TipoProveedor, RegistroPago
from .serializers import ProveedorSerializer, TipoDocumentoSerializer, ServicioSerializer, TipoProveedorSerializer, RegistroPagoSerializer

class TipoProveedorViewSet(viewsets.ModelViewSet):
    queryset = TipoProveedor.objects.all()
    serializer_class = TipoProveedorSerializer

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filterset_fields = ['tipo_proveedor']

class TipoDocumentoViewSet(viewsets.ModelViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer

class ServicioViewSet(viewsets.ModelViewSet):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer
    filterset_fields = ['proveedor', 'establecimiento', 'tipo_documento', 'numero_cliente']

class RegistroPagoViewSet(viewsets.ModelViewSet):
    queryset = RegistroPago.objects.all().order_by('-fecha_pago')
    serializer_class = RegistroPagoSerializer
    filterset_fields = ['establecimiento', 'servicio', 'fecha_pago']
