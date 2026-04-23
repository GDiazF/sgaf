from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RecursoReservableViewSet, SolicitudReservaViewSet, BloqueoHorarioViewSet, ReservaSettingViewSet

router = DefaultRouter()
router.register(r'recursos', RecursoReservableViewSet)
router.register(r'solicitudes', SolicitudReservaViewSet)
router.register(r'bloqueos', BloqueoHorarioViewSet, basename='bloqueo')
router.register(r'settings', ReservaSettingViewSet, basename='reserva-setting')

urlpatterns = [
    path('', include(router.urls)),
]
