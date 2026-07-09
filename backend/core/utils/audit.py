from core.models import AuditLog
from core.utils.thread_local import get_current_user, get_current_request

def log_audit(action, model_name, object_id, details="", user=None):
    """
    Registra un evento en el log de auditoría. 
    Intenta obtener el usuario actual del request a través del thread-local si no se especifica,
    e igualmente captura la dirección IP del cliente desde el contexto del request.
    """
    if not user:
        user = get_current_user()
    
    if user and user.is_anonymous:
        user = None

    request = get_current_request()
    ip_address = None
    if request:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(',')[0].strip()
        else:
            ip_address = request.META.get('REMOTE_ADDR')

    AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=str(object_id) if object_id else None,
        details=details,
        ip_address=ip_address
    )

