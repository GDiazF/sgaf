from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaBienestarViewSet, BeneficioViewSet, BeneficioArchivoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaBienestarViewSet)
router.register(r'beneficios', BeneficioViewSet)
router.register(r'archivos', BeneficioArchivoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
