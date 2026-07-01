from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProcesoCompraViewSet, EstadoContratoViewSet, CategoriaContratoViewSet, 
    ContratoViewSet, OrientacionLicitacionViewSet, DocumentoContratoViewSet,
    TipoServicioOperativoViewSet, ServicioContratoViewSet, RutaTransporteViewSet, 
    PeriodoCobroViewSet, AusenciaRutaViewSet, FeriadoNacionalViewSet, GrupoPresetRutasViewSet
)

router = DefaultRouter()
router.register(r'procesos', ProcesoCompraViewSet)
router.register(r'estados', EstadoContratoViewSet)
router.register(r'categorias', CategoriaContratoViewSet)
router.register(r'orientaciones', OrientacionLicitacionViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'documentos', DocumentoContratoViewSet)

# Operaciones / Servicios
router.register(r'tipos-servicios', TipoServicioOperativoViewSet)
router.register(r'servicios', ServicioContratoViewSet)
router.register(r'rutas', RutaTransporteViewSet)
router.register(r'periodos', PeriodoCobroViewSet)
router.register(r'ausencias', AusenciaRutaViewSet)
router.register(r'feriados', FeriadoNacionalViewSet)
router.register(r'grupos-preset', GrupoPresetRutasViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
