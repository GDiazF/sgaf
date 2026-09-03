# 02 — Primera instalación en servidor

**Quién:** administrador en un Ubuntu **nuevo** o sin SGAF.  
**Tiempo estimado:** 30–60 min (según red y secretos).

---

## Antes de empezar

Necesita en el servidor:

- Ubuntu con SSH
- Docker y Docker Compose
- Git

Si el servidor está vacío, instale lo básico (detalle en `docs/0. preparacion_servidor.md`) o pida a TI:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
# Cerrar y volver a abrir la sesión SSH
```

---

## Modo script (.sh) — recomendado

### Paso 1 — Descargar el código

```bash
cd ~
git clone -b reingenieria https://github.com/GDiazF/sgaf.git sgaf
cd sgaf
chmod +x scripts/*.sh scripts/lib/*.sh
```

---

### Paso 2 — Crear configuración

```bash
./scripts/setup_env.sh
```

Esto crea el archivo `.env` y detecta IP/hostname del servidor.

---

### Paso 3 — Completar secretos (una sola vez)

Edite el archivo:

```bash
nano .env
```

| Variable | Qué poner |
|----------|-----------|
| `SECRET_KEY` | Texto largo y aleatorio |
| `DB_PASSWORD` | Contraseña para PostgreSQL |
| `FIRMA_GOB_API_TOKEN_KEY` | Token Key de FirmaGob (RA) |
| `FIRMA_GOB_SECRET` | Secret de FirmaGob (RA) |
| `FIRMA_DEP_API_KEY` | Clave que elegirá (ej. una contraseña fuerte) |
| `API_CLIENT_KEYS` | `sgaf-backend:` + la misma clave de arriba |
| Correo | `EMAIL_HOST_PASSWORD` si usa notificaciones |

**No suba `.env` a Git.**

---

### Paso 4 — Desplegar

```bash
./scripts/deploy.sh
```

Espere a que termine. Anote la URL de login que muestra.

---

### Paso 5 — Crear usuario administrador (si hace falta)

```bash
docker exec -it sgaf_backend_prod python manage.py createsuperuser
```

---

### Paso 6 — Respaldos en nube (recomendado)

Configure Google Drive + cron → [07 — Respaldos](./07-respaldos.md).

---

## Modo manual (sin scripts `.sh`)

Si prefiere no usar `setup_env.sh` ni `deploy.sh`:

```bash
cd ~
git clone -b reingenieria https://github.com/GDiazF/sgaf.git sgaf
cd sgaf
cp .env.example .env
chmod 600 .env
nano .env
```

Complete secretos y red (IP, `ALLOWED_HOSTS`, CORS, `SGAF_PUBLIC_URL`). Ver [01 — Modo manual](./01-actualizar-servidor.md).

```bash
docker compose up -d --build
docker exec sgaf_backend_prod python manage.py migrate --noinput
docker exec sgaf_backend_prod python manage.py collectstatic --noinput
docker exec -it sgaf_backend_prod python manage.py createsuperuser
docker compose ps
```

---

## Arquitectura (referencia)

```
Usuario → Frontend (puerto 80) → Backend → PostgreSQL
                              → firma-dep (interno) → FirmaGob
```

Un solo `.env` en `~/sgaf/.env` sirve para Django y firma-dep.

---

## Después de instalar

- Actualizaciones → [01 — Actualizar servidor](./01-actualizar-servidor.md)
- Respaldos nube/cron → [07 — Respaldos](./07-respaldos.md)
- Permisos y firma → [05 — Firma y permisos](./05-firma-y-permisos.md)
