from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PersonalTIViewSet, FuncionTIViewSet, ContratoTIViewSet

router = DefaultRouter()
router.register(r'personal-ti', PersonalTIViewSet, basename='personal-ti')
router.register(r'funciones-ti', FuncionTIViewSet, basename='funciones-ti')
router.register(r'contratos-ti', ContratoTIViewSet, basename='contratos-ti')

urlpatterns = [
    path('', include(router.urls)),
]
