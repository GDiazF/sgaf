#!/usr/bin/env bash
# Despliegue / actualización automatizada en servidor Ubuntu.
# Uso:
#   ./scripts/deploy.sh              # build + migrate + collectstatic
#   ./scripts/deploy.sh --quick      # sin rebuild de imágenes
#   ./scripts/deploy.sh --backup     # respaldo DB antes de desplegar
#   ./scripts/deploy.sh --extra-hosts svtest,dominio.local
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/env_file.sh
source "$ROOT/scripts/lib/env_file.sh"

QUICK=false
BACKUP=false
EXTRA_HOSTS=""
SYNC_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --quick)
      QUICK=true
      shift
      ;;
    --backup)
      BACKUP=true
      shift
      ;;
    --extra-hosts)
      EXTRA_HOSTS="$2"
      SYNC_ARGS+=(--extra-hosts "$2")
      shift 2
      ;;
    -h|--help)
      echo "Uso: $0 [--quick] [--backup] [--extra-hosts host1,host2]"
      exit 0
      ;;
    *)
      echo "Opción desconocida: $1" >&2
      exit 1
      ;;
  esac
done

echo "=== SGAF deploy ==="

if [[ "$BACKUP" == true ]]; then
  echo ">>> Respaldo de base de datos..."
  mkdir -p "$HOME/sgaf_backups"
  STAMP="$(date +%Y%m%d_%H%M%S)"
  if docker ps --format '{{.Names}}' | grep -q '^sgaf_db_prod$'; then
    DB_USER_VAL="$(sgaf_env_get .env DB_USER)"
    DB_NAME_VAL="$(sgaf_env_get .env DB_NAME)"
    DB_USER_VAL="${DB_USER_VAL:-sgaf_user}"
    DB_NAME_VAL="${DB_NAME_VAL:-sgaf_db}"
    docker exec sgaf_db_prod pg_dump -U "$DB_USER_VAL" "$DB_NAME_VAL" \
      > "$HOME/sgaf_backups/respaldo_${STAMP}.sql"
    echo "    Guardado: $HOME/sgaf_backups/respaldo_${STAMP}.sql"
  else
    echo "    Contenedor sgaf_db_prod no está corriendo — omitiendo respaldo." >&2
  fi
fi

echo ">>> Configuración .env..."
chmod +x scripts/*.sh scripts/lib/*.sh 2>/dev/null || true
./scripts/setup_env.sh
sgaf_merge_missing_keys_from_example .env .env.example
if [[ -n "$EXTRA_HOSTS" ]]; then
  ./scripts/sync_env_network.sh --extra-hosts "$EXTRA_HOSTS"
else
  ./scripts/sync_env_network.sh
fi

echo ">>> Docker compose..."
if [[ "$QUICK" == true ]]; then
  docker compose up -d
else
  docker compose up -d --build
fi

echo ">>> Esperando backend..."
for i in $(seq 1 30); do
  if docker exec sgaf_backend_prod python manage.py check 2>/dev/null; then
    break
  fi
  sleep 2
done

echo ">>> Migraciones..."
docker exec sgaf_backend_prod python manage.py migrate --noinput

echo ">>> Archivos estáticos..."
docker exec sgaf_backend_prod python manage.py collectstatic --noinput

PUBLIC_URL="$(sgaf_env_get .env SGAF_PUBLIC_URL)"
echo ""
echo "=== Despliegue completado ==="
echo "  URL: ${PUBLIC_URL:-http://localhost}/login"
echo "  Logs: docker compose logs -f backend"
echo ""
echo "Si el login falla con 400, ejecute: ./scripts/sync_env_network.sh y docker compose up -d backend"
