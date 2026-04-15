"""
URL configuration for key_system project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from core.views import (
    UserProfileView, UserViewSet, GroupViewSet, PermissionListView, 
    ChangePasswordView, AvatarUploadView, PasswordResetRequestView, PasswordResetConfirmView,
    AuditLogViewSet, LinkInteresViewSet
)

router = DefaultRouter()
router.register(r'admin/users', UserViewSet, basename='admin-users')
router.register(r'admin/roles', GroupViewSet, basename='admin-roles')
router.register(r'admin/audit-log', AuditLogViewSet, basename='admin-audit-log')
router.register(r'links-interes', LinkInteresViewSet, basename='links-interes')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', UserProfileView.as_view(), name='user-profile'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/auth/avatar/', AvatarUploadView.as_view(), name='avatar-upload'),
    path('api/auth/password-reset-request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('api/auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('api/admin/permissions/', PermissionListView.as_view(), name='admin-permissions'),
    path('api/', include(router.urls)),
    path('api/', include('prestamo_llaves.urls')),
    path('api/', include('establecimientos.urls')),
    path('api/', include('servicios.urls')),
    path('api/contratos/', include('contratos.urls')),
    path('api/', include('funcionarios.urls')),
    path('api/', include('impresoras.urls')),
    path('api/', include('vehiculos.urls')),
    path('api/remuneraciones/', include('remuneraciones.urls')),
    path('api/licitaciones/', include('licitaciones.urls')),
    path('api/orden_compra/', include('orden_compra.urls')),
    path('api/reservas/', include('solicitudes_reservas.urls')),
    path('api/', include('personal_ti.urls')),
    path('api/tesoreria/', include('tesoreria.urls')),
    path('api/procedimientos/', include('procedimientos.urls')),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
