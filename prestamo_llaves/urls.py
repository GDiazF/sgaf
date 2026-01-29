from rest_framework.routers import DefaultRouter
from .views import EstablecimientoViewSet, SolicitanteViewSet, LlaveViewSet, PrestamoViewSet

router = DefaultRouter()
# router.register(r'establecimientos', EstablecimientoViewSet) # Moved to own app
router.register(r'solicitantes', SolicitanteViewSet)
router.register(r'llaves', LlaveViewSet)
router.register(r'prestamos', PrestamoViewSet)

urlpatterns = router.urls
