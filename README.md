# 🚀 SGAF - Sistema de Gestión y Administración de Flota (Edición Portable)

Esta versión del sistema ha sido refactorizada para ser completamente agnóstica a la infraestructura. Puede ser desplegada en cualquier servidor o usada localmente sin cambiar una sola línea de código.

## 📂 Estructura del Proyecto
- `/backend`: Lógica de Django y API.
- `/frontend`: Aplicación React (Vite).
- `/docker`: Configuraciones de contenedores y Nginx.
- `/scripts`: Herramientas de mantenimiento (Backups/Restauración).

---

## 🛠️ Configuración Rápida (Deployment)

### 1. Preparar el Entorno
Copia el archivo de ejemplo y configura tus credenciales:
```bash
cp .env.example .env
nano .env
```
*Asegúrate de poner la IP o Dominio del servidor en `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS`.*

### 2. Despliegue con Docker (Producción)
Desde la raíz del proyecto, ejecuta:
```bash
docker compose up -d --build
```
Esto levantará:
- **Base de Datos**: PostgreSQL 16.
- **Backend**: Django (Gunicorn).
- **Frontend**: Servido por Nginx en el puerto 80.

### 3. Inicialización
```bash
# Aplicar migraciones
docker exec -it sgaf_backend_prod python manage.py migrate

# Crear superusuario administrador
docker exec -it sgaf_backend_prod python manage.py createsuperuser

# Recopilar archivos estáticos
docker exec -it sgaf_backend_prod python manage.py collectstatic --no-input
```

---

## 💻 Uso Local (Desarrollo/Soporte)
Si quieres correrlo en tu PC sin Docker:
1. Crea un entorno virtual y activa: `python -m venv venv`
2. Instala dependencias: `pip install -r backend/requirements.txt`
3. Ejecuta: `python backend/manage.py runserver`
*Nota: El sistema usará automáticamente **SQLite** si no detecta las variables de Postgres en el .env local.*

---

## 🗄️ Mantenimiento de Base de Datos
Los scripts se encuentran en la carpeta `/scripts`.

- **Respaldar**: `./scripts/backup_db.sh` (Genera un .sql.gz en `/respaldos`).
- **Restaurar**: `./scripts/restore_db.sh ruta/al/archivo.sql.gz`

---

## 🔐 Seguridad
- **DEBUG**: Siempre debe estar en `False` en servidores de producción.
- **SECRET_KEY**: Nunca compartas este valor fuera del archivo `.env`.
- **Base de Datos**: Los datos de producción se guardan de forma persistente en `./docker/postgres_data`.

---
*Desarrollado para SLEP Iquique.*
