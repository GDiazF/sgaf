import base64
import hashlib
from django.conf import settings
from cryptography.fernet import Fernet

def get_encryption_key():
    """
    Deriva una clave de 32 bytes compatible con Fernet a partir del SECRET_KEY de Django.
    Esto hace que sea portátil y evite requerir variables de entorno adicionales.
    """
    secret_key = getattr(settings, 'SECRET_KEY', 'django-insecure-default-key-portable-version')
    key_bytes = secret_key.encode('utf-8')
    digest = hashlib.sha256(key_bytes).digest()
    return base64.urlsafe_b64encode(digest)

def encrypt_value(value: str) -> str:
    """
    Cifra un valor de texto usando Fernet y devuelve la representación en base64 de los bytes cifrados.
    """
    if not value:
        return ""
    key = get_encryption_key()
    fernet = Fernet(key)
    encrypted_bytes = fernet.encrypt(value.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_value(value: str) -> str:
    """
    Descifra un valor de texto usando Fernet. 
    Si el valor no se puede descifrar (por ejemplo, es texto plano heredado), 
    devuelve el valor original para evitar caídas del sistema.
    """
    if not value:
        return ""
    key = get_encryption_key()
    fernet = Fernet(key)
    try:
        decrypted_bytes = fernet.decrypt(value.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception:
        # Fallback para datos antiguos que aún no han sido migrados o cifrados
        return value
