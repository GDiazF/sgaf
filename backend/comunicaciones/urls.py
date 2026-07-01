from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CuentaSMTPViewSet, DestinatariosCorreoOperativoViewSet, PlantillaCorreoViewSet

router = DefaultRouter()
router.register(r'cuentas-smtp', CuentaSMTPViewSet)
router.register(r'plantillas', PlantillaCorreoViewSet)
router.register(r'destinatarios-operativos', DestinatariosCorreoOperativoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
