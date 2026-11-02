from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CertificadoEditorView, HerramientaPdfViewSet, PlantillaFirmaView

router = DefaultRouter()
router.register(r'herramientas', HerramientaPdfViewSet, basename='editor-pdf-herramientas')

urlpatterns = [
    path('certificado/', CertificadoEditorView.as_view(), name='editor-pdf-certificado'),
    path('firma-plantilla/', PlantillaFirmaView.as_view(), name='editor-pdf-firma-plantilla'),
    path('', include(router.urls)),
]
