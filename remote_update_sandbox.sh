#!/bin/bash

# --- CONFIGURACIÓN ---
SANDBOX_PATH="/home/slepiquique/sgaf_sandbox/"
COMPOSE_FILE="docker-compose.sandbox.yml"

echo "--------------------------------------------------------"
echo "🚀 ACTUALIZADOR FINAL DE SANDBOX 1.1.2"
echo "--------------------------------------------------------"

# 1. Entrar a la carpeta
cd $SANDBOX_PATH || { echo "❌ Error: No se encontró la carpeta $SANDBOX_PATH"; exit 1; }

# 2. Asegurar Permisos
echo "🔑 Asegurando permisos de archivos..."
sudo chown -R slepiquique:slepiquique .

# 3. Sincronizar con Master GitHub
echo "📥 Descargando cambios de master (incluye pdfplumber)..."
git fetch origin
git checkout master
git reset --hard origin/master

# 4. Limpieza de Caché de Nginx (Sin tocar volúmenes de DB)
echo "🛑 Reiniciando servicios para aplicar cambios de código..."
docker compose -f $COMPOSE_FILE restart sandbox_frontend

# 5. Reconstrucción de Backend para instalar nuevas librerías
echo "⚙️ Reconstruyendo backend para instalar pdfplumber..."
docker compose -f $COMPOSE_FILE build --no-cache sandbox_backend

# 6. Levantar todo
echo "⬆️ Levantando sistema..."
docker compose -f $COMPOSE_FILE up -d

# 7. Migraciones y Estáticos
echo "📦 Aplicando migraciones y recolectando estáticos..."
docker exec sgaf_sandbox_backend python manage.py migrate
docker exec sgaf_sandbox_backend python manage.py collectstatic --no-input

# 8. Asegurar Permisos de Lectura para Nginx
echo "🔑 Asegurando que Nginx pueda leer media y static..."
sudo chmod -R 755 ./media_sandbox ./staticfiles

echo "--------------------------------------------------------"
echo "✅ SANDBOX OPERATIVO EN VERSIÓN 1.1.2"
echo "🌍 Acceso: http://10.0.100.119:8080"
echo "--------------------------------------------------------"
