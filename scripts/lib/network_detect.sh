# Funciones para detectar IP/hostname del servidor y construir variables de red.
# Uso: source scripts/lib/network_detect.sh

sgaf_detect_primary_ip() {
  if command -v hostname >/dev/null 2>&1; then
    local ip
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [[ -n "$ip" ]]; then
      echo "$ip"
      return 0
    fi
  fi
  if command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}'
    return 0
  fi
  echo "127.0.0.1"
}

sgaf_detect_hostname_short() {
  hostname -s 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo ""
}

sgaf_detect_hostname_fqdn() {
  hostname -f 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo ""
}

sgaf_build_origin() {
  local host="$1"
  local port="$2"
  if [[ -z "$host" ]]; then
    return 1
  fi
  if [[ "$port" == "80" ]]; then
    echo "http://${host}"
  else
    echo "http://${host}:${port}"
  fi
}

sgaf_build_allowed_hosts() {
  local ip="$1"
  local hn_short="$2"
  local hn_fqdn="$3"
  local extra="${4:-}"
  local hosts="localhost,127.0.0.1"
  if [[ -n "$ip" ]]; then
    hosts="${hosts},${ip}"
  fi
  if [[ -n "$hn_short" ]]; then
    hosts="${hosts},${hn_short}"
    local upper
    upper="$(echo "$hn_short" | tr '[:lower:]' '[:upper:]')"
    if [[ "$upper" != "$hn_short" ]]; then
      hosts="${hosts},${upper}"
    fi
  fi
  if [[ -n "$hn_fqdn" && "$hn_fqdn" != "$hn_short" ]]; then
    hosts="${hosts},${hn_fqdn}"
  fi
  if [[ -n "$extra" ]]; then
    hosts="${hosts},${extra}"
  fi
  echo "$hosts"
}

sgaf_build_origins_list() {
  local port="$1"
  local ip="$2"
  local hn_short="$3"
  local hn_fqdn="$4"
  local origins=""
  local o

  for h in "$ip" "$hn_short" "$hn_fqdn" "localhost"; do
    if [[ -z "$h" ]]; then
      continue
    fi
    o="$(sgaf_build_origin "$h" "$port")"
    if [[ -n "$origins" ]]; then
      origins="${origins},${o}"
    else
      origins="$o"
    fi
  done
  echo "$origins"
}
