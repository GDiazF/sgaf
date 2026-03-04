from django.urls import path
from .views import VisorOCView

urlpatterns = [
    path('visor/', VisorOCView.as_view(), name='visor-oc'),
]
