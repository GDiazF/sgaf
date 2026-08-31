#!/usr/bin/env bash
# Crea .env desde la plantilla SOLO si no existe (git pull nunca lo borra).
# Uso: ./scripts/setup_env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  echo "OK: .env ya existe en la raíz — no se modificó."
  echo "    Las actualizaciones con git pull no reemplazan este archivo."
else
  cp .env.example .env
  chmod 600 .env
  echo "Creado .env desde .env.example"
  echo "Edite credenciales: nano .env"
fi

# Desarrollo local con Node (sin Docker): firma-dep usa su propio .env
if [[ -f services/firma-dep/.env.example ]]; then
  if [[ -f services/firma-dep/.env ]]; then
    echo "OK: services/firma-dep/.env ya existe — no se modificó."
  else
    cp services/firma-dep/.env.example services/firma-dep/.env
    chmod 600 services/firma-dep/.env
    echo "Creado services/firma-dep/.env (solo para lab local con npm run start:dev)"
  fi
fi

echo ""
echo "Docker producción: solo necesita el .env de la raíz."
echo "Luego: docker compose up -d --build"
