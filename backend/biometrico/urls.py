from django.urls import path
from .views import BiometricoSyncView, BiometricoConfigView, BiometricoLocalDataView, BiometricoUsuarioEditView, BiometricoUsuarioCreateView

urlpatterns = [
    path('sync/', BiometricoSyncView.as_view(), name='biometrico-sync'),
    path('config/', BiometricoConfigView.as_view(), name='biometrico-config'),
    path('local-data/', BiometricoLocalDataView.as_view(), name='biometrico-local-data'),
    path('usuarios/add/', BiometricoUsuarioCreateView.as_view(), name='biometrico-usuario-create'),
    path('usuarios/<str:emp_id>/', BiometricoUsuarioEditView.as_view(), name='biometrico-usuario-edit'),
]
