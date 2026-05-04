from django.urls import path
from .views import ConciliacionDataView

urlpatterns = [
    path('data/', ConciliacionDataView.as_view(), name='conciliacion-data'),
]
