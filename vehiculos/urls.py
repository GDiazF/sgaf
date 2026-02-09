from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegistroMensualViewSet

router = DefaultRouter()
router.register(r'vehiculos/registros', RegistroMensualViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
