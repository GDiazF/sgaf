from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GoogleUserViewSet, GoogleUploadLogViewSet, GoogleOrgUnitViewSet

router = DefaultRouter()
router.register(r'usuarios', GoogleUserViewSet)
router.register(r'logs', GoogleUploadLogViewSet)
router.register(r'unidades', GoogleOrgUnitViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
