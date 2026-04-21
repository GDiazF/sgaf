#!/bin/bash

# --------------------------------------------------------
# ⚠️ ACTUALIZADOR DE PRODUCCIÓN SGAF 1.2.0 (MODO BLINDADO)
# --------------------------------------------------------

echo "📥 Descargando última versión de GitHub (Rama: local)..."
git fetch origin
git checkout local
git reset --hard origin/local

# 🛡️ VERIFICACIÓN Y RECONSTRUCCIÓN DEL .ENV
if [ ! -f .env ]; then
    echo "⚠️ .env no encontrado. Reconstruyendo configuración de emergencia..."
    cat <<EOF > .env
DEBUG=False
SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_HOSTS=10.0.100.119,localhost,127.0.0.1
DATABASE_URL=postgres://sgaf_user:sgaf_2024@db:5432/sgaf
DB_NAME=sgaf
DB_USER=sgaf_user
DB_PASSWORD=sgaf_2024
DB_HOST=db
DB_PORT=5432
STATIC_ROOT=/app/staticfiles
MEDIA_ROOT=/app/media
EOF
    chmod 644 .env
    echo "✅ .env restaurado con conexión a Postgres."
else
    # Aseguramos que tenga la DATABASE_URL para evitar el error de SQLite
    if ! grep -q "DATABASE_URL" .env; then
        echo "🔧 Añadiendo DATABASE_URL faltante al .env..."
        echo "DATABASE_URL=postgres://sgaf_user:sgaf_2024@db:5432/sgaf" >> .env
    fi
fi

echo "⚙️ Limpiando y reconstruyendo el sistema..."
# Forzamos la limpieza de contenedores y volúmenes de frontend huérfanos
docker compose down --remove-orphans
docker volume rm sgaf_frontend_assets 2>/dev/null || true

# Levantamos TODO forzando el uso del .env y reconstruyendo el frontend
docker compose --env-file .env up -d --build

echo "🚀 Aplicando cambios en la base de datos..."
# Esperamos un momento a que Postgres esté listo
sleep 5
docker exec sgaf_backend python manage.py migrate --no-input

echo "🧹 Limpiando archivos estáticos..."
docker exec sgaf_backend python manage.py collectstatic --no-input

echo "--------------------------------------------------------"
echo "✅ ¡ACTUALIZACIÓN COMPLETADA CON ÉXITO!"
echo "📍 Versión: $(git describe --tags --always)"
echo "--------------------------------------------------------"
