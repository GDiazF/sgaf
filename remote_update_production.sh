#!/bin/bash

# --- CONFIGURACIÓN DE PRODUCCIÓN ---
PROD_PATH="/home/slepiquique/sgaf/"
COMPOSE_FILE="docker-compose.yml"
DB_CONTAINER="sgaf_db"
BACKEND_CONTAINER="sgaf_backend"
DB_NAME="sgaf"
DB_USER="sgaf_user"

echo "--------------------------------------------------------"
echo "⚠️  ACTUALIZADOR DE PRODUCCIÓN SGAF 1.1.3"
echo "--------------------------------------------------------"

# 0. Verificación de Seguridad de Base de Datos (Bind Mount en Producción)
if [ ! -d "/home/slepiquique/sgaf_pgdata" ]; then
    echo "🚨 ERROR CRÍTICO: La carpeta de datos de PRODUCCIÓN '/home/slepiquique/sgaf_pgdata' NO EXISTE."
    echo "🛑 Abortando para evitar desastres en producción."
    exit 1
fi

# 1. Entrar a la carpeta
cd $PROD_PATH || { echo "❌ Error: Carpeta de producción no encontrada"; exit 1; }

# 2. Sincronizar con Master GitHub
echo "📥 Descargando última versión estable de GitHub (Master)..."
git fetch origin
git checkout master
git reset --hard origin/master

# 3. Reconstrucción y despliegue
echo "⚙️  Reconstruyendo contenedores con limpieza de caché..."
# Forzamos build sin cache para backend y frontend (si existe) para aplicar cambios de UI
docker compose -f $COMPOSE_FILE build --no-cache
docker compose -f $COMPOSE_FILE up -d

# 4. Verificación de Integridad de Datos
echo "🔍 Verificando base de datos de producción..."
sleep 5
TABLE_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "🚨 ERROR: ¡LA BASE DE DATOS DE PRODUCCIÓN APARECE VACÍA!"
    echo "🛑 Deteniendo todo para proteger la integridad."
    docker compose -f $COMPOSE_FILE stop
    exit 1
fi

# 5. Aplicar cambios finales
echo "📦 Aplicando migraciones y recolectando estáticos..."
docker exec $BACKEND_CONTAINER python manage.py migrate --no-input
docker exec $BACKEND_CONTAINER python manage.py collectstatic --no-input

# 6. Limpieza y Permisos
echo "🔑 Asegurando permisos y reiniciando Nginx..."
sudo chmod -R 755 ./media ./staticfiles
docker compose -f $COMPOSE_FILE restart nginx || echo "ℹ️ Nginx no es un servicio de compose, saltando..."

echo "--------------------------------------------------------"
echo "✅ PRODUCCIÓN ACTUALIZADA Y OPERATIVA v1.1.3"
echo "--------------------------------------------------------"
