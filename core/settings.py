import os
from pathlib import Path
from datetime import timedelta
from decouple import config


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-default-key-change-it')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'django_otp',
    'django_otp.plugins.otp_totp',
    # Local apps
    'django_filters',
    'rest_framework_simplejwt',
    # Apps
    'core',
    'bienestar',
    'conectividad',
    'contratos',
    'establecimientos',
    'funcionarios',
    'impresoras',
    'insights',
    'licitaciones',
    'notificaciones',
    'orden_compra',
    'personal_ti',
    'prestamo_llaves',
    'procedimientos',
    'remuneraciones',
    'servicios',
    'solicitudes_reservas',
    'tesoreria',
    'usuarios_google',
    'vehiculos',
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

# Database
# Priorizamos variables individuales para evitar conflictos
import os

DB_NAME = os.environ.get('DB_NAME') or config('DB_NAME', default=None)

if DB_NAME:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': DB_NAME,
            'USER': os.environ.get('DB_USER') or config('DB_USER', default='postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD') or config('DB_PASSWORD', default=''),
            'HOST': os.environ.get('DB_HOST') or config('DB_HOST', default='db'),
            'PORT': os.environ.get('DB_PORT') or config('DB_PORT', default='5432'),
        }
    }
else:
    # Intentamos con DATABASE_URL como segunda opción
    DATABASE_URL = os.environ.get('DATABASE_URL') or config('DATABASE_URL', default=None)
    if DATABASE_URL:
        import dj_database_url
        DATABASES = {'default': dj_database_url.config(default=DATABASE_URL)}
    else:
        # Por defecto a SQLite (Desarrollo Local)
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'es-cl'
TIME_ZONE = 'America/Santiago'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
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
# CORS & CSRF

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://10.0.100.44:3000',
    'http://10.0.100.44:5173',
    'http://10.0.100.44',
]

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
