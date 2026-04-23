from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroMensualViewSet, VehiculoViewSet

router = DefaultRouter()
router.register(r'vehiculos/registros', RegistroMensualViewSet, basename='registros')
router.register(r'vehiculos/flota', VehiculoViewSet, basename='flota')

urlpatterns = [
    path('', include(router.urls)),
]
