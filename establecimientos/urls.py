from rest_framework.routers import DefaultRouter
from .views import EstablecimientoViewSet, TelefonoEstablecimientoViewSet, TipoEstablecimientoViewSet

router = DefaultRouter()
router.register(r'establecimientos', EstablecimientoViewSet)
router.register(r'telefonos-establecimientos', TelefonoEstablecimientoViewSet)
router.register(r'tipos-establecimiento', TipoEstablecimientoViewSet)

urlpatterns = router.urls
