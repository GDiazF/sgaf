from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroMensualViewSet, VehiculoViewSet, VehiculoDocumentoViewSet, VehiculoTipoDocumentoViewSet, VehiculoTipoCombustibleViewSet

router = DefaultRouter()
router.register(r'vehiculos/registros', RegistroMensualViewSet, basename='registros')
router.register(r'vehiculos/flota', VehiculoViewSet, basename='flota')
router.register(r'vehiculos/documentos', VehiculoDocumentoViewSet, basename='documentos')
router.register(r'vehiculos/tipos-documento', VehiculoTipoDocumentoViewSet, basename='tipos-documento')
router.register(r'vehiculos/tipos-combustible', VehiculoTipoCombustibleViewSet, basename='tipos-combustible')

urlpatterns = [
    path('', include(router.urls)),
]
