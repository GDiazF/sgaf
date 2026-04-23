from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InsightsViewSet

router = DefaultRouter()
router.register(r'main', InsightsViewSet, basename='insights')

urlpatterns = [
    path('', include(router.urls)),
]
