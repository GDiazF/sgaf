from rest_framework import viewsets
from .models import Establecimiento
from .serializers import EstablecimientoSerializer

class EstablecimientoViewSet(viewsets.ModelViewSet):
    queryset = Establecimiento.objects.all()
    serializer_class = EstablecimientoSerializer
