from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    IncidenteVehiculoViewSet,
    MantencionPreventivaViewSet,
    RegistroMensualViewSet,
    ReparacionVehiculoViewSet,
    VehiculoDocumentoViewSet,
    VehiculoTipoCombustibleViewSet,
    VehiculoTipoDocumentoViewSet,
    VehiculoViewSet,
)

router = DefaultRouter()
router.register(r'vehiculos/registros', RegistroMensualViewSet, basename='registros')
router.register(r'vehiculos/flota', VehiculoViewSet, basename='flota')
router.register(r'vehiculos/documentos', VehiculoDocumentoViewSet, basename='documentos')
router.register(r'vehiculos/tipos-documento', VehiculoTipoDocumentoViewSet, basename='tipos-documento')
router.register(r'vehiculos/tipos-combustible', VehiculoTipoCombustibleViewSet, basename='tipos-combustible')
router.register(
    r'vehiculos/mantenciones-preventivas',
    MantencionPreventivaViewSet,
    basename='mantenciones-preventivas',
)
router.register(r'vehiculos/incidentes', IncidenteVehiculoViewSet, basename='incidentes')
router.register(r'vehiculos/reparaciones', ReparacionVehiculoViewSet, basename='reparaciones')

urlpatterns = [
    path('', include(router.urls)),
]
