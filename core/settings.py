"""
Django settings — lectura de secretos desde .env
usando python-decouple para separar configuración
del código fuente.
"""

import os
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ────────────────────────────────────────────────────────────
# RUTAS BASE
# ────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-fallback-default-change-me')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,10.0.100.119', cast=Csv())


# ────────────────────────────────────────────────────────────
# APLICACIONES INSTALADAS
# ────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'django_filters',
    'corsheaders',
    'django_otp',
    'django_otp.plugins.otp_totp',
    # Local apps
    'prestamo_llaves',
    'core',
    'establecimientos',
    'servicios',
    'contratos',
    'funcionarios',
    'impresoras',
    'vehiculos',
    'remuneraciones',
    'licitaciones',
    'orden_compra',
    'solicitudes_reservas',
    'personal_ti',
    'tesoreria',
    'procedimientos',
]

# REST_FRAMEWORK, SIMPLE_JWT y CORS se configuran al final del archivo para evitar duplicados.

# ────────────────────────────────────────────────────────────
# MIDDLEWARE
# ────────────────────────────────────────────────────────────
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
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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
# BASE DE DATOS
# SQLite para desarrollo; para producción usar PostgreSQL:
# ────────────────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': config('DB_ENGINE', default='django.db.backends.sqlite3'),
        'NAME': config('DB_NAME', default=BASE_DIR / 'db.sqlite3' if config('DB_ENGINE', default='sqlite3') == 'sqlite3' else 'key_system_db'),
    }
}

# Si existe DB_HOST en el .env, asumimos que estamos en producción/Docker y configuramos PostgreSQL
if config('DB_HOST', default=''):
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='key_system_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', default='5432'),
    }


# ────────────────────────────────────────────────────────────
# VALIDACIÓN DE CONTRASEÑAS
# ────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ────────────────────────────────────────────────────────────
# INTERNACIONALIZACIÓN
# ────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True


# ────────────────────────────────────────────────────────────
# ARCHIVOS ESTÁTICOS Y MEDIA
# ────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ────────────────────────────────────────────────────────────
# DRF + JWT
# ────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '1000/minute',
    },
}

# Permitir ver documentos en IFRAMES
X_FRAME_OPTIONS = 'SAMEORIGIN'
SILENCED_SYSTEM_CHECKS = ['security.W019']

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': False,
}


# ────────────────────────────────────────────────────────────
# CORS
# ────────────────────────────────────────────────────────────
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
CORS_ALLOWED_ORIGINS = [
    'http://10.0.100.25',
    'http://10.0.100.25:5173',
    'http://10.0.100.25:80',
    'http://10.0.100.119',
    'http://10.0.100.119:5173',
    'http://10.0.100.119:80',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost',
    'http://127.0.0.1',
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://10.0.100.25',
    'http://10.0.100.25:5173',
    'http://10.0.100.119',
    'http://10.0.100.119:5173',
    'http://10.0.100.119:80',
]

FRONTEND_URL = config('FRONTEND_URL', default='http://10.0.100.119')


# ────────────────────────────────────────────────────────────
# SEGURIDAD DE FRAMES (iframes)
# ALLOWALL solo para desarrollo; en producción usar SAMEORIGIN
# ────────────────────────────────────────────────────────────
X_FRAME_OPTIONS = 'SAMEORIGIN'


# ────────────────────────────────────────────────────────────
# CORREO SMTP
# ────────────────────────────────────────────────────────────
EMAIL_BACKEND       = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST          = 'smtp.gmail.com'
EMAIL_PORT          = 587
EMAIL_USE_TLS       = True
EMAIL_USE_SSL       = False
EMAIL_HOST_USER     = config('EMAIL_HOST_USER',     default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = f'SLEP Iquique Reservas <{EMAIL_HOST_USER}>'
RESERVAS_ADMIN_EMAIL = config('RESERVAS_ADMIN_EMAIL', default='')
EMAIL_DAILY_LIMIT   = 200

# MFA - Two Factor Authentication
OTP_TOTP_ISSUER = 'SGAF - SLEP Iquique'
