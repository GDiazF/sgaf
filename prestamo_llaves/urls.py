from rest_framework.routers import DefaultRouter
from .views import EstablecimientoViewSet, SolicitanteViewSet, ActivoViewSet, PrestamoViewSet, TipoActivoViewSet

router = DefaultRouter()
# router.register(r'establecimientos', EstablecimientoViewSet) # Moved to own app
router.register(r'tipo-activos', TipoActivoViewSet)
router.register(r'solicitantes', SolicitanteViewSet)
router.register(r'activos', ActivoViewSet)
router.register(r'prestamos', PrestamoViewSet)

urlpatterns = router.urls
