from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginBackgroundImageViewSet

router = DefaultRouter()
router.register(r'login/backgrounds', LoginBackgroundImageViewSet, basename='login-backgrounds')

urlpatterns = [
    path('', include(router.urls)),
]
