from django.urls import include, path
from rest_framework.routers import DefaultRouter

from documentacion_servicios.views import (
    CampoDefinicionViewSet,
    RegistroServicioDocViewSet,
    TipoRegistroServicioViewSet,
)

router = DefaultRouter()
router.register('tipos', TipoRegistroServicioViewSet, basename='doc-serv-tipo')
router.register('campos', CampoDefinicionViewSet, basename='doc-serv-campo')
router.register('registros', RegistroServicioDocViewSet, basename='doc-serv-registro')

urlpatterns = [
    path('', include(router.urls)),
]
