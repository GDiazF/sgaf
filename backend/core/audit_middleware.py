from django.utils.deprecation import MiddlewareMixin
from auditlog.context import set_actor
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth.models import AnonymousUser

class JWTAuditlogMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not request.user or isinstance(request.user, AnonymousUser):
            try:
                # Intentar autenticar vía JWT si el middleware estándar de Django falló
                auth = JWTAuthentication().authenticate(request)
                if auth:
                    user, token = auth
                    request.user = user
                    set_actor(user)
            except Exception:
                pass
        return None
