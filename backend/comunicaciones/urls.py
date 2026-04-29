from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CuentaSMTPViewSet, PlantillaCorreoViewSet

router = DefaultRouter()
router.register(r'cuentas-smtp', CuentaSMTPViewSet)
router.register(r'plantillas', PlantillaCorreoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
