from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProcesoCompraViewSet, EstadoContratoViewSet, CategoriaContratoViewSet, ContratoViewSet, OrientacionLicitacionViewSet, DocumentoContratoViewSet

router = DefaultRouter()
router.register(r'procesos', ProcesoCompraViewSet)
router.register(r'estados', EstadoContratoViewSet)
router.register(r'categorias', CategoriaContratoViewSet)
router.register(r'orientaciones', OrientacionLicitacionViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'documentos', DocumentoContratoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
