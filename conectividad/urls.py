from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EscuelaRedViewSet

router = DefaultRouter()
router.register(r'monitoreo', EscuelaRedViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
