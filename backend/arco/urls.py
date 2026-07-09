from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SolicitudARCOViewSet

router = DefaultRouter()
router.register(r'arco', SolicitudARCOViewSet, basename='solicitudes-arco')

urlpatterns = [
    path('', include(router.urls)),
]
