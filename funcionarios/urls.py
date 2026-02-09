from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubdireccionViewSet,
    DepartamentoViewSet,
    UnidadViewSet,
    FuncionarioViewSet,
    ControlAnexosViewSet
)

router = DefaultRouter()
router.register('subdirecciones', SubdireccionViewSet)
router.register('departamentos', DepartamentoViewSet)
router.register('unidades', UnidadViewSet)
router.register('funcionarios', FuncionarioViewSet)
router.register('control-anexos', ControlAnexosViewSet, basename='control-anexos')

urlpatterns = [
    path('', include(router.urls)),
]
