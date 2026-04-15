#!/bin/bash

echo "🚀 Iniciando ambiente SANDBOX (SGAF)..."

# 1. Crear directorios aislados si no existen
mkdir -p /home/slepiquique/sgaf_sandbox_pgdata
mkdir -p /home/slepiquique/sgaf/media_sandbox
mkdir -p /home/slepiquique/sgaf/staticfiles_sandbox

# 2. Levantar los contenedores
docker compose -f docker-compose.sandbox.yml up -d --build

# 3. Ejecutar migraciones en el sandbox
echo "📦 Ejecutando migraciones en el Sandbox..."
docker exec -it sgaf_sandbox_backend python manage.py migrate

echo "✅ Sandbox listo!"
echo "Acceso: http://10.0.100.119:8080"
echo "Nota: El banner naranja confirmará que estás en modo pruebas."
