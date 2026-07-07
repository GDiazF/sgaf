from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AsignacionEjecutivoViewSet, GestionEstablecimientoViewSet, SubtareaGestionViewSet

router = DefaultRouter()
router.register(r'asignaciones', AsignacionEjecutivoViewSet)
router.register(r'gestiones', GestionEstablecimientoViewSet)
router.register(r'subtareas', SubtareaGestionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
