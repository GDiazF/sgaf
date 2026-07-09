import threading

_thread_locals = threading.local()

def get_current_request():
    """
    Retorna el objeto request actual del hilo de ejecución.
    """
    return getattr(_thread_locals, 'request', None)

def set_current_request(request):
    """
    Establece el objeto request para el hilo actual.
    """
    _thread_locals.request = request

def clear_current_request():
    """
    Limpia la referencia al objeto request.
    """
    if hasattr(_thread_locals, 'request'):
        delattr(_thread_locals, 'request')

def get_current_user():
    """
    Retorna el usuario actual. Primero intenta resolverlo dinámicamente desde el request
    (lo que permite capturar la autenticación diferida de DRF) y luego del valor directo.
    """
    request = get_current_request()
    if request:
        user = getattr(request, 'user', None)
        if user and not user.is_anonymous:
            return user
    return getattr(_thread_locals, 'user', None)

def set_current_user(user):
    """
    Establece el usuario del request de manera directa.
    """
    _thread_locals.user = user

def clear_current_user():
    """
    Limpia la referencia al usuario del request.
    """
    if hasattr(_thread_locals, 'user'):
        delattr(_thread_locals, 'user')
