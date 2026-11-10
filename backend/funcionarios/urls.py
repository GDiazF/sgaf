from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SubdireccionViewSet,
    DepartamentoViewSet,
    UnidadViewSet,
    FuncionarioViewSet,
    ControlAnexosViewSet,
    GrupoViewSet,
    CalidadJuridicaViewSet,
    GradoViewSet,
    CargoViewSet,
)

router = DefaultRouter()
router.register('subdirecciones', SubdireccionViewSet)
router.register('departamentos', DepartamentoViewSet)
router.register('unidades', UnidadViewSet)
router.register('funcionarios', FuncionarioViewSet)
router.register('grupos', GrupoViewSet)
router.register('calidades-juridicas', CalidadJuridicaViewSet)
router.register('grados', GradoViewSet)
router.register('cargos', CargoViewSet)
router.register('control-anexos', ControlAnexosViewSet, basename='control-anexos')

urlpatterns = [
    path('', include(router.urls)),
]
