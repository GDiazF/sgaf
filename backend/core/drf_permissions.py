"""Permisos DRF compartidos — exigen view_* en lecturas."""
from rest_framework.permissions import BasePermission, DjangoModelPermissions, IsAuthenticated


class SgafModelPermissions(DjangoModelPermissions):
    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': ['%(app_label)s.view_%(model_name)s'],
        'HEAD': ['%(app_label)s.view_%(model_name)s'],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }


def user_has_perm(user, codename: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.is_superuser or user.has_perm(codename)


def make_perm_class(codename: str):
    class _RequirePerm(BasePermission):
        def has_permission(self, request, view):
            return user_has_perm(request.user, codename)

    _RequirePerm.__name__ = f'RequirePerm_{codename.replace(".", "_")}'
    return _RequirePerm


class SgafPermissionMixin:
    """
    ViewSet mixin: acciones @action con permiso distinto al HTTP method por defecto.
    sgaf_action_permissions = {'toggle_dia': 'contratos.change_ausenciaruta', ...}
    """

    sgaf_action_permissions = {}

    def get_permissions(self):
        action = getattr(self, 'action', None)
        codename = self.sgaf_action_permissions.get(action)
        if codename:
            return [IsAuthenticated(), make_perm_class(codename)()]
        return [IsAuthenticated(), SgafModelPermissions()]
