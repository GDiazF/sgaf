#!/bin/bash

# --- CONFIGURACIÓN ---
SANDBOX_PATH="/home/slepiquique/sgaf_sandbox/"
COMPOSE_FILE="docker-compose.sandbox.yml"

echo "--------------------------------------------------------"
echo "🚀 ACTUALIZADOR FINAL DE SANDBOX 1.1.3"
echo "--------------------------------------------------------"

# 0. Verificación de Seguridad de Base de Datos
if ! docker volume inspect sgaf_sandbox_sgaf_sandbox_pgdata_v3 > /dev/null 2>&1; then
    echo ""
    echo "🚨 ERROR DE SEGURIDAD: El volumen 'sgaf_sandbox_pgdata_v3' NO EXISTE."
    echo "🛑 Abortando ejecución para evitar la creación de una base de datos VACÍA."
    echo "Por favor, verifica el nombre del volumen en tu docker-compose.sandbox.yml"
    echo ""
    exit 1
fi

# 1. Entrar a la carpeta
cd $SANDBOX_PATH || { echo "❌ Error: No se encontró la carpeta $SANDBOX_PATH"; exit 1; }

# 2. Asegurar Permisos
echo "🔑 Asegurando permisos de archivos..."
sudo chown -R slepiquique:slepiquique .

# 3. Sincronizar con Rama LOCAL GitHub
echo "📥 Descargando cambios de rama LOCAL..."
git fetch origin
git checkout local
git reset --hard origin/local

# 4. Limpieza de Caché de Nginx (Sin tocar volúmenes de DB)
echo "🛑 Reiniciando servicios para aplicar cambios de código..."
docker compose -f $COMPOSE_FILE restart sandbox_frontend

# 5. Reconstrucción de servicios para instalar nuevas librerías y código frontend
echo "⚙️  Reconstruyendo backend y frontend para aplicar cambios de código..."
docker compose -f $COMPOSE_FILE build --no-cache sandbox_backend sandbox_frontend

# 6. Levantar todo
echo "⬆️  Levantando sistema..."
docker compose -f $COMPOSE_FILE up -d

# --- Verificación de Contenido de Base de Datos ---
echo "🔍 Verificando integridad de los datos..."
# Esperar un momento a que Postgres esté listo
sleep 3
TABLE_COUNT=$(docker exec sgaf_sandbox_db psql -U sgaf_sandbox_user -d sgaf_sandbox_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo ""
    echo "🚨 ERROR: La base de datos está VACÍA (0 tablas)."
    echo "🛑 Abortando para evitar el inicio de un sistema sin datos reales."
    echo "Verifica si el contenedor de la base de datos está usando el volumen correcto."
    echo ""
    exit 1
fi
# --------------------------------------------------

# 7. Migraciones y Estáticos
echo "📦 Aplicando migraciones y recolectando estáticos..."
docker exec sgaf_sandbox_backend python manage.py makemigrations
docker exec sgaf_sandbox_backend python manage.py migrate
docker exec sgaf_sandbox_backend python manage.py collectstatic --no-input

# 8. Asegurar Permisos de Lectura para Nginx
echo "🔑 Asegurando que Nginx pueda leer media y static..."
sudo chmod -R 755 ./media_sandbox ./staticfiles

echo "--------------------------------------------------------"
echo "✅ SANDBOX OPERATIVO EN VERSIÓN 1.1.3"
echo "🌍 Acceso: http://10.0.100.119:8080"
echo "--------------------------------------------------------"
