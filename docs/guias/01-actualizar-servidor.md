# 01 — Actualizar el servidor

**Quién:** administrador con SSH al servidor Ubuntu.  
**Cuándo:** SGAF ya instalado y hay cambios en GitHub.

---

## Siempre respalde antes

Las migraciones pueden alterar la BD. Sin respaldo no hay vuelta atrás si algo falla. Detalle → [07 — Respaldos](./07-respaldos.md).

---

## Modo script (.sh) — recomendado

### Paso 1 — SSH al servidor

**Qué:** Abrir sesión remota en el Ubuntu donde corre SGAF.  
**Por qué:** El código y Docker están en el servidor; no se actualiza desde Windows.

### Paso 2 — Ir al proyecto

```bash
cd ~/sgaf
```

**Por qué:** `docker compose` y los scripts requieren la raíz del repositorio.

### Paso 3 — Bajar cambios

```bash
git pull origin reingenieria
```

**Por qué:** Sincroniza el código local con GitHub. Sin esto sigue la versión antigua.

### Paso 4 — Desplegar con respaldo

```bash
./scripts/deploy.sh --backup
```

**Por qué:** `--backup` guarda un `.sql` en `~/sgaf_backups/` **antes** de rebuild, migraciones y estáticos.

### Paso 5 — Verificar

```bash
docker compose ps
```

**Por qué:** Confirma que los cuatro contenedores están Up antes de dar por terminado.

### Paso 6 — Probar en el navegador

**Por qué:** Los procesos pueden estar Up pero la web fallar por CORS, frontend viejo o migración incompleta.

**Bloque completo:**

```bash
cd ~/sgaf
git pull origin reingenieria
./scripts/deploy.sh --backup
```

---

## Modo manual (sin scripts)

Orden obligatorio: respaldo → pull → Docker → migrate → collectstatic.

| Paso | Comando | Por qué |
|------|---------|---------|
| Respaldo | `pg_dump` → `~/sgaf_backups/` | Recuperación si falla una migración |
| Pull | `git pull origin reingenieria` | Traer código nuevo |
| Docker | `docker compose up -d --build` | Empaquetar y arrancar servicios actualizados |
| Migrate | `manage.py migrate` | Aplicar cambios de tablas del código nuevo |
| Estáticos | `manage.py collectstatic` | Assets del admin Django |
| Verificar | `docker compose ps` + login web | Confirmar que todo responde |

```bash
cd ~/sgaf
mkdir -p ~/sgaf_backups
STAMP=$(date +%Y%m%d_%H%M%S)
docker exec sgaf_db_prod pg_dump -U sgaf_user sgaf_db \
  > ~/sgaf_backups/respaldo_${STAMP}.sql
git pull origin reingenieria
docker compose up -d --build
docker exec sgaf_backend_prod python manage.py migrate --noinput
docker exec sgaf_backend_prod python manage.py collectstatic --noinput
docker compose ps
```

---

## Siguiente lectura

- Respaldos nube/cron → [07 — Respaldos](./07-respaldos.md)
- Manual web con pestañas → [manual-web/actualizar.html](../../manual-web/actualizar.html)
