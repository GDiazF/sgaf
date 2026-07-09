from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from core.utils.thread_local import (
    set_current_user, clear_current_user,
    set_current_request, clear_current_request
)

class AuditRequestMiddleware(MiddlewareMixin):
    """
    Middleware que captura el request y el usuario autenticado (ya sea por sesión o token JWT)
    y los almacena en almacenamiento thread-local para que los signals y utilidades
    de Django puedan auditar las operaciones con el actor correcto.
    """
    def process_request(self, request):
        set_current_request(request)
        
        user = getattr(request, 'user', None)
        
        # Si el usuario es anónimo, intentar autenticación JWT para endpoints de la API
        if not user or isinstance(user, AnonymousUser):
            try:
                auth = JWTAuthentication().authenticate(request)
                if auth:
                    user, token = auth
                    request.user = user
            except Exception:
                pass
                
        if user and not isinstance(user, AnonymousUser):
            set_current_user(user)
        else:
            set_current_user(None)
        return None

    def process_response(self, request, response):
        clear_current_request()
        clear_current_user()
        return response

    def process_exception(self, request, exception):
        clear_current_request()
        clear_current_user()
        return None
