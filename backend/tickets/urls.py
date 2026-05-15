from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TicketViewSet, TicketCategoryViewSet, SupportAgentViewSet

router = DefaultRouter()
router.register(r'tickets', TicketViewSet, basename='ticket')
router.register(r'categorias', TicketCategoryViewSet, basename='ticket-category')
router.register(r'agentes', SupportAgentViewSet, basename='support-agent')

urlpatterns = [
    path('', include(router.urls)),
]
