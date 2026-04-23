from django.urls import path
from .views import ProcesarDocumentosBancoView

urlpatterns = [
    path('procesar-banco/', ProcesarDocumentosBancoView.as_view(), name='procesar_banco'),
]
