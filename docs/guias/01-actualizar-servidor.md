# 01 — Actualizar el servidor

**Quién:** administrador con acceso SSH al servidor Ubuntu.  
**Cuándo:** ya hay SGAF instalado y subieron cambios a GitHub.

---

## Pasos (copiar y pegar)

Conéctese por SSH y ejecute:

```bash
cd ~/sgaf
git pull origin reingenieria
./scripts/deploy.sh --backup
```

El script hace respaldo de la base de datos, actualiza Docker, migraciones y archivos estáticos.

Al terminar, abra la URL que muestra el script (o la que tiene en `SGAF_PUBLIC_URL` en `.env`).

---

## ¿Cambió la interfaz (menús, modales, bandeja)?

Use el deploy **completo** (comando de arriba **sin** `--quick`).

Si solo hizo `git pull` y no ve cambios visuales:

```bash
docker compose up -d --build frontend
```

---

## ¿Solo cambió el backend?

Tras `git pull`, a veces basta:

```bash
docker compose restart backend
```

---

## Opciones del script

| Comando | Efecto |
|---------|--------|
| `./scripts/deploy.sh --backup` | Respaldo SQL + actualización completa (**recomendado**) |
| `./scripts/deploy.sh --quick` | Solo reinicia contenedores; **no** actualiza pantallas ni imágenes |
| `./scripts/deploy.sh` | Actualización completa sin respaldo automático |

---

## Verificar que todo corre

```bash
docker compose ps
```

Deben estar **Up**: `sgaf_db_prod`, `sgaf_backend_prod`, `sgaf_frontend_prod`, `sgaf_firma_dep`.

---

## Siguiente lectura

- Algo falló → [06 — Problemas frecuentes](./06-problemas-frecuentes.md)
- Firma digital → [05 — Firma y permisos](./05-firma-y-permisos.md)
