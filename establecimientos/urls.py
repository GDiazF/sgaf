from rest_framework.routers import DefaultRouter
from .views import EstablecimientoViewSet, TelefonoEstablecimientoViewSet

router = DefaultRouter()
router.register(r'establecimientos', EstablecimientoViewSet)
router.register(r'telefonos-establecimientos', TelefonoEstablecimientoViewSet)

urlpatterns = router.urls
