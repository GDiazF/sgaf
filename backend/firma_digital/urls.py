from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    FirmaGobConfigView,
    FirmaGobPreviewView,
    FirmaGobProbarView,
    FirmaPendienteViewSet,
    SelloFirmaViewSet,
    ValidarDocumentoHashView,
    ValidarDocumentoView,
)

router = DefaultRouter()
router.register(r'sellos', SelloFirmaViewSet, basename='sellos-firma')
router.register(r'pendientes', FirmaPendienteViewSet, basename='firmas-pendientes')

urlpatterns = [
    path('', include(router.urls)),
    path('config/', FirmaGobConfigView.as_view(), name='firma-digital-config'),
    path('preview/', FirmaGobPreviewView.as_view(), name='firma-digital-preview'),
    path('probar/', FirmaGobProbarView.as_view(), name='firma-digital-probar'),
    path(
        'validar/verificar-archivo/',
        ValidarDocumentoHashView.as_view(),
        name='firma-digital-validar-archivo',
    ),
    path('validar/', ValidarDocumentoView.as_view(), name='firma-digital-validar'),
    path(
        'validar/<str:codigo>/',
        ValidarDocumentoView.as_view(),
        name='firma-digital-validar-codigo',
    ),
]
