import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY
SECRET_KEY = config('SECRET_KEY', default='django-insecure-default-key-portable-version')
DEBUG = config('DEBUG', default=True, cast=bool)

# Portabilidad de Hosts: Se leen de una lista separada por comas en el .env
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,10.0.100.28', cast=Csv())

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_otp',
    'django_otp.plugins.otp_totp',
    'django_filters',
    'rest_framework_simplejwt',
    # Apps del Sistema
    'comunicaciones',
    'core',
    'bienestar',
    'contratos',
    'establecimientos',
    'funcionarios',
    'insights',
    'licitaciones',
    'notificaciones.apps.NotificacionesConfig',
    'orden_compra',
    'personal_ti',
    'prestamo_llaves',
    'procedimientos',
    'remuneraciones',
    'documentacion_servicios.apps.DocumentacionServiciosConfig',
    'servicios',
    'solicitudes_reservas',
    'tesoreria',
    'vehiculos',
    'tickets',
    'ejecutivos',
    'personalizacion_sistema',
    'arco',
    'documentos.apps.DocumentosConfig',
    'firma_digital',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'core.audit_middleware.AuditRequestMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ────────────────────────────────────────────────────────────
# BASE DE DATOS BLINDADA
# ────────────────────────────────────────────────────────────
DB_NAME = config('DB_NAME', default=None)

if not DEBUG and not DB_NAME:
    # CAPA DE SEGURIDAD 1: Si es producción y falta Postgres, lanzar error fatal.
    raise ValueError("ERROR CRÍTICO: No se puede iniciar en PRODUCCIÓN sin configuración de PostgreSQL (DB_NAME falta en .env)")

if DB_NAME:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': config('DB_USER'),
            'PASSWORD': config('DB_PASSWORD'),
            'HOST': config('DB_HOST', default='db'),
            'PORT': config('DB_PORT', default='5432'),
        }
    }
else:
    # Por defecto en local si no hay env de DB, usa SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Internationalization
LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True

# Archivos Estáticos
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# REST & JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated',],
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ────────────────────────────────────────────────────────────
# CORS & CSRF DINÁMICOS
# ────────────────────────────────────────────────────────────
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)

# Se leen desde el .env. Por ejemplo: FRONTEND_URL=http://localhost:5173,http://10.0.100.119
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://10.0.100.28:5173', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default='http://localhost:5173,http://10.0.100.28:5173', cast=Csv())
CORS_EXPOSE_HEADERS = [
    'Content-Disposition',
    'X-SGAF-Documento-Codigo',
    'X-SGAF-Pendiente-Id',
]

X_FRAME_OPTIONS = 'SAMEORIGIN'

# ────────────────────────────────────────────────────────────
# CORREO Y OTROS
# ────────────────────────────────────────────────────────────
FRONTEND_URL        = config('FRONTEND_URL', default='http://localhost:5173')
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT          = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = f'SGAF Portal <{EMAIL_HOST_USER}>'
RESERVAS_ADMIN_EMAIL = config('RESERVAS_ADMIN_EMAIL', default='')

OTP_TOTP_ISSUER = 'SGAF - SLEP Iquique'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Límites de subida aumentados para procesamiento de múltiples PDFs
DATA_UPLOAD_MAX_MEMORY_SIZE = 209715200  # 200MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 209715200  # 200MB

# ────────────────────────────────────────────────────────────
# FIRMA-DEP (sidecar NestJS) — credenciales FirmaGob viven allí
# ────────────────────────────────────────────────────────────
FIRMA_DEP_URL = config('FIRMA_DEP_URL', default='http://127.0.0.1:4010/api/v1')
FIRMA_DEP_CLIENT_ID = config('FIRMA_DEP_CLIENT_ID', default='sgaf-backend')
FIRMA_DEP_API_KEY = config('FIRMA_DEP_API_KEY', default='dev-key')
FIRMA_DEP_TIMEOUT_MS = config('FIRMA_DEP_TIMEOUT_MS', default=120000, cast=int)

# Entity / purpose labels (solo UI y registro local; JWT lo arma firma-dep)
FIRMAGOB_ENTITY = config(
    'FIRMAGOB_ENTITY',
    default='Servicio Local de Educación Pública de Iquique',
)
FIRMAGOB_RUN = config('FIRMAGOB_RUN', default='')
FIRMAGOB_PURPOSE = config('FIRMAGOB_PURPOSE', default='Propósito General')
# Legacy (ya no se usan para firmar; mantenidos por compatibilidad de .env antiguos)
FIRMAGOB_API_URL = config('FIRMAGOB_API_URL', default='')
FIRMAGOB_API_TOKEN = config('FIRMAGOB_API_TOKEN', default='')
FIRMAGOB_SECRET = config('FIRMAGOB_SECRET', default='')

# ────────────────────────────────────────────────────────────
# SEGURIDAD EN PRODUCCIÓN (Art. 14 quinquies — Ley 21.719)
# ────────────────────────────────────────────────────────────
if not DEBUG:
    # Forzar HTTPS (configurable en .env, por defecto False para pruebas locales/intranet)
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # HTTP Strict Transport Security (1 año) - Solo si se fuerza SSL
    SECURE_HSTS_SECONDS = 31536000 if SECURE_SSL_REDIRECT else 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_SSL_REDIRECT
    SECURE_HSTS_PRELOAD = SECURE_SSL_REDIRECT

    # Cookies seguras (requiere HTTPS)
    SESSION_COOKIE_SECURE = SECURE_SSL_REDIRECT
    CSRF_COOKIE_SECURE = SECURE_SSL_REDIRECT
    SESSION_COOKIE_HTTPONLY = True

    # Headers de protección
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True

    # Expiración de sesión por inactividad (30 min)
    SESSION_COOKIE_AGE = 1800
    SESSION_SAVE_EVERY_REQUEST = True
