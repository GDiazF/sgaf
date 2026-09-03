"""Autorización para firma digital: permiso Django + grupo de firmantes."""

from rest_framework.permissions import IsAuthenticated

PERM_FIRMAR = 'firma_digital.can_firmar'
PERM_PROBAR_FIRMA = 'firma_digital.can_probar_firma'


def funcionario_en_grupo_firmante(funcionario) -> bool:
    if not funcionario:
        return False
    return funcionario.grupos.filter(activo=True, es_firmante=True).exists()


def user_puede_firmar(user) -> bool:
    """
    Superusuario: siempre.
    Resto: permiso can_firmar + Funcionario activo en un Grupo con es_firmante.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if user.is_superuser:
        return True
    if not user.has_perm(PERM_FIRMAR):
        return False
    try:
        funcionario = user.funcionario_profile
    except Exception:
        return False
    if not funcionario or not funcionario.estado:
        return False
    return funcionario_en_grupo_firmante(funcionario)


def user_puede_probar_firma(user) -> bool:
    """Laboratorio / firma-prueba: solo permiso Django (sin grupo de firmantes)."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if user.is_superuser:
        return True
    return user.has_perm(PERM_PROBAR_FIRMA)


class CanFirmarDigital(IsAuthenticated):
    """Permite firmar solo a quienes pasan user_puede_firmar()."""

    message = (
        'No está autorizado a firmar digitalmente. '
        'Requiere el permiso «Puede firmar digitalmente» y pertenecer a un '
        'grupo de firmantes activo.'
    )

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return user_puede_firmar(request.user)


class CanProbarFirmaDigital(IsAuthenticated):
    """Laboratorio firma-prueba: permiso «Puede usar firma digital (prueba)»."""

    message = (
        'No está autorizado al laboratorio de firma digital. '
        'Requiere el permiso «Puede usar firma digital (prueba)».'
    )

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return user_puede_probar_firma(request.user)


class CanFirmarOProbarFirma(IsAuthenticated):
    """Config / preview: bandeja operativa o laboratorio de prueba."""

    message = (
        'No está autorizado a operaciones de firma digital. '
        'Requiere permiso de bandeja o de laboratorio de prueba.'
    )

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        user = request.user
        return user_puede_firmar(user) or user_puede_probar_firma(user)
