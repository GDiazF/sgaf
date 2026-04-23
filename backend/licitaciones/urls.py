from django.urls import path
from .views import ListarDocumentosMPView, VisorLicitacionesView

urlpatterns = [
    path('buscar/', ListarDocumentosMPView.as_view(), name='buscar-documento'),
    path('visor/', VisorLicitacionesView.as_view(), name='visor-licitaciones'),
]
