from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProcedimientoViewSet, TipoProcedimientoViewSet

router = DefaultRouter()
router.register(r'procedimientos', ProcedimientoViewSet, basename='procedimiento')
router.register(r'tipos', TipoProcedimientoViewSet, basename='tipo-procedimiento')

urlpatterns = [
    path('', include(router.urls)),
]
