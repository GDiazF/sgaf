"""
run_local.py — Arranca el servidor Django localmente con SQLite.
Uso: python run_local.py
"""
import os
import sys
import shutil
from pathlib import Path

BASE = Path(__file__).parent
ENV_FILE = BASE / '.env'
ENV_BACKUP = BASE / '.env.prod_backup'
ENV_LOCAL = BASE / '.env.local_dev'

LOCAL_ENV_CONTENT = """\
# .env para DESARROLLO LOCAL — usa SQLite, no Docker
SECRET_KEY=django-insecure-local-dev-key-sgaf-2026
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de datos: SQLite local (sin DB_HOST = usa SQLite)
DB_HOST=
DB_NAME=db.sqlite3

# CORS
CORS_ALLOW_ALL_ORIGINS=True

# Email: desactivado localmente (consola)
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
RESERVAS_ADMIN_EMAIL=

# Frontend
FRONTEND_URL=http://localhost:5173
"""

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else 'run'

    if action == 'setup':
        # Crear .env.local_dev si no existe
        if not ENV_LOCAL.exists():
            ENV_LOCAL.write_text(LOCAL_ENV_CONTENT, encoding='utf-8')
            print(f"Creado: {ENV_LOCAL}")

        # Hacer backup del .env de produccion
        if ENV_FILE.exists() and not ENV_BACKUP.exists():
            shutil.copy(ENV_FILE, ENV_BACKUP)
            print(f"Backup de .env en: {ENV_BACKUP}")

        # Reemplazar .env con el local
        shutil.copy(ENV_LOCAL, ENV_FILE)
        print("OK - .env reemplazado con configuracion local (SQLite)")

        # Ejecutar migraciones
        os.system(f'python manage.py migrate')

        # Crear superusuario local si no existe
        os.system(
            'python -c "'
            'import django; django.setup();'
            'from django.contrib.auth.models import User;'
            "u,c = User.objects.get_or_create(username=chr(97)+chr(100)+chr(109)+chr(105)+chr(110));"
            "u.set_password(chr(97)+chr(100)+chr(109)+chr(105)+chr(110)+'1234');"
            'u.is_superuser=True; u.is_staff=True; u.save();'
            'print(chr(10)+\"Usuario: admin / admin1234\")'
            '"'
        )
        print("\nSetup completado. Ahora corre: python run_local.py")
        return

    if action == 'restore':
        if ENV_BACKUP.exists():
            shutil.copy(ENV_BACKUP, ENV_FILE)
            print("OK - .env de produccion restaurado")
        else:
            print("No hay backup de .env para restaurar")
        return

    # Accion por defecto: ejecutar el servidor
    print("=" * 50)
    print("  SGAF - Servidor de Desarrollo Local")
    print("  Backend : http://localhost:8000")
    print("  Frontend: http://localhost:5173 (npm run dev)")
    print("=" * 50)
    print()

    # Verificar que el .env local este activo
    if ENV_FILE.exists():
        content = ENV_FILE.read_text(encoding='utf-8')
        if 'DB_HOST=db' in content or ('DB_HOST=' not in content and 'postgresql' in content):
            print("AVISO: El .env apunta a PostgreSQL. Ejecuta primero:")
            print("       python run_local.py setup")
            sys.exit(1)

    os.execv(sys.executable, [sys.executable, 'manage.py', 'runserver', '8000'])


if __name__ == '__main__':
    main()
