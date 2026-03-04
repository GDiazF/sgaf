from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PersonalTIViewSet

router = DefaultRouter()
router.register(r'personal-ti', PersonalTIViewSet, basename='personal-ti')

urlpatterns = [
    path('', include(router.urls)),
]
