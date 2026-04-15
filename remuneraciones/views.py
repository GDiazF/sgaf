from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import MapeoBanco, MapeoMedioPago, MapeoBancoDirecto, ValeVistaConfig
from .serializers import (
    MapeoBancoSerializer, MapeoMedioPagoSerializer,
    MapeoBancoDirectoSerializer, ValeVistaConfigSerializer
)
from django.http import HttpResponse
from .services import generar_archivo_bancos, generar_archivo_vale_vista

class BancoUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            buffer, filename = generar_archivo_bancos(file_obj)
            
            response = HttpResponse(
                buffer.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ValeVistaUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            buffer, filename = generar_archivo_vale_vista(file_obj)
            
            response = HttpResponse(
                buffer.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MapeoBancoViewSet(viewsets.ModelViewSet):
    queryset = MapeoBanco.objects.all()
    serializer_class = MapeoBancoSerializer
    permission_classes = [IsAuthenticated]

class MapeoMedioPagoViewSet(viewsets.ModelViewSet):
    queryset = MapeoMedioPago.objects.all()
    serializer_class = MapeoMedioPagoSerializer
    permission_classes = [IsAuthenticated]

class MapeoBancoDirectoViewSet(viewsets.ModelViewSet):
    queryset = MapeoBancoDirecto.objects.all()
    serializer_class = MapeoBancoDirectoSerializer
    permission_classes = [IsAuthenticated]

class ValeVistaConfigViewSet(viewsets.ModelViewSet):
    queryset = ValeVistaConfig.objects.all()
    serializer_class = ValeVistaConfigSerializer
    permission_classes = [IsAuthenticated]
