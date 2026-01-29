from rest_framework.routers import DefaultRouter
from .views import EstablecimientoViewSet

router = DefaultRouter()
router.register(r'establecimientos', EstablecimientoViewSet)

urlpatterns = router.urls
