from django.urls import include, path
from rest_framework.routers import DefaultRouter

from notificaciones.views import (
    FuenteVivaViewSet,
    JobProgramadoViewSet,
    NotificacionViewSet,
    TipoNotificacionViewSet,
)

router = DefaultRouter()
router.register('tipos', TipoNotificacionViewSet, basename='tipo-notificacion')
router.register('fuentes-vivas-admin', FuenteVivaViewSet, basename='fuente-viva')
router.register('jobs', JobProgramadoViewSet, basename='job-programado')
router.register('', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('', include(router.urls)),
]
