from django.urls import path
from .views import BancoUploadView, ValeVistaUploadView

urlpatterns = [
    path('procesar-banco/', BancoUploadView.as_view(), name='procesar-banco'),
    path('procesar-vale-vista/', ValeVistaUploadView.as_view(), name='procesar-vale-vista'),
]
