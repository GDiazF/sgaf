# Helpers para leer/escribir claves en .env sin romper secretos existentes.
# Uso: source scripts/lib/env_file.sh

sgaf_env_get() {
  local file="$1"
  local key="$2"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2- || true
}

sgaf_env_set() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"
  if [[ -f "$file" ]] && grep -qE "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" '
      BEGIN { done=0 }
      $0 ~ "^" k "=" { print k "=" v; done=1; next }
      { print }
      END { if (!done) print k "=" v }
    ' "$file" > "$tmp"
  else
    if [[ -f "$file" ]]; then
      cat "$file" > "$tmp"
    fi
    echo "${key}=${value}" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

sgaf_merge_missing_keys_from_example() {
  local env_file="$1"
  local example_file="$2"
  if [[ ! -f "$example_file" ]]; then
    return 0
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)= ]]; then
      local key="${BASH_REMATCH[1]}"
      if ! grep -qE "^${key}=" "$env_file" 2>/dev/null; then
        echo "$line" >> "$env_file"
        echo "  + clave nueva desde plantilla: ${key}"
      fi
    fi
  done < "$example_file"
}
