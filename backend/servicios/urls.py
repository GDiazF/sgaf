from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProveedorViewSet,
    TipoDocumentoViewSet,
    ServicioViewSet,
    TipoProveedorViewSet,
    RegistroPagoViewSet,
    RecepcionConformeViewSet,
    CDPViewSet,
    TipoEntregaViewSet,
    FacturaAdquisicionViewSet,
    CompraAgilViewSet,
)

router = DefaultRouter()
router.register(r'tipos-proveedores', TipoProveedorViewSet)
router.register(r'proveedores', ProveedorViewSet)
router.register(r'tipos-documentos', TipoDocumentoViewSet)
router.register(r'servicios', ServicioViewSet)
router.register(r'registros-pagos', RegistroPagoViewSet)
router.register(r'recepciones-conformes', RecepcionConformeViewSet)
router.register(r'cdps', CDPViewSet)
router.register(r'tipos-entrega', TipoEntregaViewSet)
router.register(r'facturas-adquisicion', FacturaAdquisicionViewSet)
router.register(r'compras-agiles', CompraAgilViewSet, basename='compras-agiles')

urlpatterns = [
    path('', include(router.urls)),
]
