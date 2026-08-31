from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DocumentosCatalogoView, PlantillaDocumentoViewSet

router = DefaultRouter()
router.register(r'plantillas', PlantillaDocumentoViewSet, basename='plantillas-documento')

urlpatterns = [
    path('catalogo/', DocumentosCatalogoView.as_view(), name='documentos-catalogo'),
    path('', include(router.urls)),
]
