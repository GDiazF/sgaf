#!/usr/bin/env bash
# Crea .env desde la plantilla SOLO si no existe; sincroniza red y claves nuevas de .env.example.
# Uso: ./scripts/setup_env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

chmod +x scripts/*.sh scripts/lib/*.sh 2>/dev/null || true

# shellcheck source=lib/env_file.sh
source "$ROOT/scripts/lib/env_file.sh"

if [[ -f .env ]]; then
  echo "OK: .env ya existe — no se reemplazó."
else
  cp .env.example .env
  chmod 600 .env
  echo "Creado .env desde .env.example"
fi

echo ">>> Complementando claves nuevas desde .env.example (sin tocar secretos)..."
sgaf_merge_missing_keys_from_example .env .env.example

echo ">>> Sincronizando IP, hostname y CORS/CSRF..."
./scripts/sync_env_network.sh

# Desarrollo local con Node (sin Docker): firma-dep usa su propio .env
if [[ -f services/firma-dep/.env.example ]]; then
  if [[ -f services/firma-dep/.env ]]; then
    echo "OK: services/firma-dep/.env ya existe — no se modificó."
  else
    cp services/firma-dep/.env.example services/firma-dep/.env
    chmod 600 services/firma-dep/.env
    echo "Creado services/firma-dep/.env (lab local con npm run start:dev)"
  fi
fi

echo ""
echo "Edite secretos si aún no lo hizo: nano .env"
echo "  (SECRET_KEY, DB_PASSWORD, FIRMA_GOB_*, API_CLIENT_KEYS)"
echo "Docker producción: ./scripts/deploy.sh"
