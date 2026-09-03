# 06 — Problemas frecuentes

Soluciones rápidas. Si no alcanza, revise logs: `docker compose logs -f backend`

---

## Login

### Error 400 «Bad Request» al entrar (página HTML)

El servidor no reconoce la URL que usa el navegador.

```bash
cd ~/sgaf
./scripts/sync_env_network.sh
docker compose up -d backend
```

Entre por la URL que indica el script (`SGAF_PUBLIC_URL`).

---

## Actualización

### Hice `git pull` pero no veo cambios en pantalla

Falta rebuild del frontend:

```bash
docker compose up -d --build frontend
```

O deploy completo sin `--quick`:

```bash
./scripts/deploy.sh --backup
```

### `git pull` con conflictos

```bash
git checkout -- backend/solicitudes_reservas/.email_counter.json
git pull origin reingenieria
```

---

## Git

### «Updates were rejected» al hacer push

Alguien subió cambios antes que usted:

```bash
git pull origin reingenieria
git push origin reingenieria
```

### «Upstream branch does not match»

```bash
git push origin HEAD
```

---

## Firma

### No veo el menú «Bandeja de firmas»

Revise [05 — Firma y permisos](./05-firma-y-permisos.md) (permiso + funcionario + grupo firmante). **Re-login obligatorio.**

### Error al «Enviar a firmar» RC

- RC debe estar **Emitida** con **firmante** asignado.
- Backend actualizado: `git pull` + `docker compose restart backend`.

### Firma falla o «no autorizado»

1. Permisos y grupo firmante (guía 05).
2. OTP del **certificado FirmaGob** (6 dígitos), no el MFA de login de SGAF.
3. En producción: RUT real, no RUT sandbox.

### firma-dep no responde

```bash
docker compose logs -f firma-dep
docker compose up -d --build firma-dep
```

Verifique en `.env`: `API_ALLOW_PRIVATE_NETWORKS=true` y que `API_CLIENT_KEYS` coincide con `FIRMA_DEP_API_KEY`.

---

## Base de datos

### Error en `migrate`

**Nunca** ejecute `makemigrations` en el servidor. Solo:

```bash
docker exec sgaf_backend_prod python manage.py migrate
```

Si pide migraciones divergentes: `git pull` (debe existir migración `merge_*` en el repo) y vuelva a deploy.

---

## Contraseña administrador

```bash
docker exec -it sgaf_backend_prod python manage.py changepassword admin
```

---

## Estado del sistema

```bash
docker compose ps
docker compose logs -f backend
```

| Contenedor | Rol |
|------------|-----|
| `sgaf_frontend_prod` | Interfaz web |
| `sgaf_backend_prod` | API Django |
| `sgaf_db_prod` | Base de datos |
| `sgaf_firma_dep` | Firma digital |
