#!/bin/bash

# --- CONFIGURACIÓN DE PRODUCCIÓN ---
PROD_PATH="/home/slepiquique/sgaf/"
COMPOSE_FILE="docker-compose.yml"
DB_CONTAINER="sgaf_db"
BACKEND_CONTAINER="sgaf_backend"
DB_NAME="key_system_db"
DB_USER="postgres"

echo "--------------------------------------------------------"
echo "⚠️  ACTUALIZADOR DE PRODUCCIÓN SGAF 1.1.2"
echo "--------------------------------------------------------"

# 0. Verificación de Seguridad de Base de Datos
if ! docker volume inspect sgaf_pgdata > /dev/null 2>&1; then
    echo "🚨 ERROR CRÍTICO: El volumen de PRODUCCIÓN 'sgaf_pgdata' NO EXISTE."
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
echo "⚙️  Reconstruyendo backend para instalar requisitos actualizados..."
docker compose -f $COMPOSE_FILE up -d --build

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
docker exec $BACKEND_CONTAINER python manage.py makemigrations
docker exec $BACKEND_CONTAINER python manage.py migrate
docker exec $BACKEND_CONTAINER python manage.py collectstatic --no-input

# 6. Permisos (Importante para documentos adjuntos)
echo "🔑 Asegurando permisos de archivos de producción..."
sudo chmod -R 755 ./media ./staticfiles

echo "--------------------------------------------------------"
echo "✅ PRODUCCIÓN ACTUALIZADA Y OPERATIVA v1.1.2"
echo "--------------------------------------------------------"
