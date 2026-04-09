from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BancoUploadView, ValeVistaUploadView,
    MapeoBancoViewSet, MapeoMedioPagoViewSet,
    MapeoBancoDirectoViewSet, ValeVistaConfigViewSet
)

router = DefaultRouter()
router.register(r'mapeo-bancos', MapeoBancoViewSet)
router.register(r'mapeo-medios-pago', MapeoMedioPagoViewSet)
router.register(r'mapeo-bancos-directos', MapeoBancoDirectoViewSet)
router.register(r'vale-vista-config', ValeVistaConfigViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('procesar-banco/', BancoUploadView.as_view(), name='procesar-banco'),
    path('procesar-vale-vista/', ValeVistaUploadView.as_view(), name='procesar-vale-vista'),
]
