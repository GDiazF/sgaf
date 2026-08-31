#!/usr/bin/env bash
# Actualiza ALLOWED_HOSTS, CORS, CSRF y URLs públicas según IP/hostname del servidor.
# No modifica secretos (SECRET_KEY, passwords, tokens FirmaGob).
# Uso: ./scripts/sync_env_network.sh [--extra-hosts nombre.extra,otro.host]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=lib/network_detect.sh
source "$ROOT/scripts/lib/network_detect.sh"
# shellcheck source=lib/env_file.sh
source "$ROOT/scripts/lib/env_file.sh"

EXTRA_HOSTS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --extra-hosts)
      EXTRA_HOSTS="$2"
      shift 2
      ;;
    *)
      echo "Uso: $0 [--extra-hosts host1,host2]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "No existe .env — ejecute primero: ./scripts/setup_env.sh" >&2
  exit 1
fi

PRIMARY_IP="$(sgaf_detect_primary_ip)"
HN_SHORT="$(sgaf_detect_hostname_short)"
HN_FQDN="$(sgaf_detect_hostname_fqdn)"
FRONTEND_PORT="$(sgaf_env_get .env FRONTEND_PORT)"
FRONTEND_PORT="${FRONTEND_PORT:-80}"

ALLOWED="$(sgaf_build_allowed_hosts "$PRIMARY_IP" "$HN_SHORT" "$HN_FQDN" "$EXTRA_HOSTS")"
ORIGINS="$(sgaf_build_origins_list "$FRONTEND_PORT" "$PRIMARY_IP" "$HN_SHORT" "$HN_FQDN")"
PUBLIC_URL="$(sgaf_build_origin "$PRIMARY_IP" "$FRONTEND_PORT")"
API_URL="${PUBLIC_URL}/api"

sgaf_env_set .env ALLOWED_HOSTS "$ALLOWED"
sgaf_env_set .env CORS_ALLOWED_ORIGINS "$ORIGINS"
sgaf_env_set .env CSRF_TRUSTED_ORIGINS "$ORIGINS"
sgaf_env_set .env SGAF_PUBLIC_URL "$PUBLIC_URL"
sgaf_env_set .env FRONTEND_URL "$PUBLIC_URL"
sgaf_env_set .env VITE_API_URL "$API_URL"

echo "Red sincronizada en .env:"
echo "  IP principal:     ${PRIMARY_IP}"
echo "  Hostname:         ${HN_SHORT} (${HN_FQDN})"
echo "  Puerto frontend:  ${FRONTEND_PORT}"
echo "  SGAF_PUBLIC_URL:  ${PUBLIC_URL}"
echo "  ALLOWED_HOSTS:    ${ALLOWED}"
echo "  CORS/CSRF:        ${ORIGINS}"
