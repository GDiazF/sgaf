# Guías SGAF

Documentación **corta y por tarea**. Elija según lo que necesita hacer.

---

## ¿Qué necesitas hacer?

| Situación | Guía |
|-----------|------|
| Actualizar el sistema en el servidor (lo más habitual) | [01 — Actualizar servidor](./01-actualizar-servidor.md) |
| Instalar SGAF por primera vez en un servidor | [02 — Primera instalación](./02-primera-instalacion.md) |
| Subir cambios desde tu PC a GitHub | [03 — Subir a GitHub](./03-subir-a-github.md) |
| Programar y probar en tu computadora | [04 — Desarrollo local](./04-desarrollo-local.md) |
| Usuarios, roles y firma digital | [05 — Firma y permisos](./05-firma-y-permisos.md) |
| Algo falló (login, firma, git, etc.) | [06 — Problemas frecuentes](./06-problemas-frecuentes.md) |
| Respaldos, Google Drive y cron | [07 — Respaldos](./07-respaldos.md) |

---

## Tres roles, tres caminos

```
Administrador servidor     →  Guía 01 (y 02 si es nuevo)
Desarrollador              →  Guía 03 → luego 01 en el servidor
Administrador web (roles)  →  Guía 05 (sin terminal)
```

---

## Convenciones

| Palabra | Significado |
|---------|-------------|
| **Servidor** | Máquina Ubuntu donde corre SGAF (SSH) |
| **Tu PC** | Windows donde programas |
| **`.env`** | Archivo de configuración y secretos (nunca en Git) |
| **`~/sgaf`** | Carpeta del proyecto en el servidor |

Las guías antiguas (`docs/0`, `docs/1`, `docs/2.1`, `docs/2.2`, `docs/3`) siguen disponibles como referencia detallada.

**Manual visual offline:** [manual-web/index.html](../../manual-web/index.html) (abrir en el navegador sin internet).
