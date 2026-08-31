# 07 — Respaldos

**Qué cubre:** local, Google Drive (rclone), cron y restauración.  
Manual web → [manual-web/respaldos.html](../manual-web/respaldos.html).

---

## Local con script

| Acción | Comando | Por qué |
|--------|---------|---------|
| Al actualizar | `./scripts/deploy.sh --backup` | Respaldo justo antes del deploy |
| Solo BD | `./scripts/backup_db.sh` | Copia sin actualizar; rota > 30 días |

---

## Local manual

| Paso | Por qué |
|------|---------|
| `mkdir ~/sgaf_backups` | Carpeta fija para encontrar copias |
| `pg_dump` | Exporta BD completa a `.sql` |
| `cp -a media/` | BD no incluye archivos en disco |
| `gzip` | Ahorra espacio para nube o disco |

---

## Google Drive (rclone)

| Paso | Por qué |
|------|---------|
| Instalar rclone | Subir a Drive desde línea de comandos |
| `rclone config` → `drivesoporteti` | Nombre debe coincidir con el script |
| Editar rutas en `respaldo_automatico_sgaf.sh` | Cada servidor tiene distinto `/home/usuario` |
| `sed` + `chmod +x` | Evita errores CRLF y Permission denied |
| Probar `bash ...sh` manualmente | Detectar fallos antes de cron |

Script sube BD a `SGAF_Backups` y media a `SGAF_Media`. Rotación 14 días.

---

## Cron

| Paso | Por qué |
|------|---------|
| `crontab -e` | Programar ejecución automática |
| Líneas 9:00 y 18:00 | Dos puntos de recuperación diarios |
| `>> backup_log.txt` | Registrar errores para diagnóstico |
| `crontab -l` | Confirmar que las tareas quedaron guardadas |

```bash
0 9 * * * /home/tu_usuario/sgaf/scripts/respaldo_automatico_sgaf.sh >> /home/tu_usuario/backup_log.txt 2>&1
0 18 * * * /home/tu_usuario/sgaf/scripts/respaldo_automatico_sgaf.sh >> /home/tu_usuario/backup_log.txt 2>&1
```

---

## Restaurar

**Por qué respaldar antes:** restaurar reemplaza datos actuales.

- BD local: `cat respaldo.sql | docker exec -i ... psql`
- Media: `cp -a` desde copia de `media/`
- Desde Drive: `rclone copy` + `psql`

---

## Relacionado

- [01 — Actualizar servidor](./01-actualizar-servidor.md)
