# Motor unificado de notificaciones

## Uso rápido (productores / avisos normales)

```python
from notificaciones.services import notificar

notificar(
    modulo='TICKETS',
    evento='NUEVO',
    titulo='…',
    mensaje='…',
    link='/tickets/123',
    usuarios=[user],
)
```

Admin: `/admin/notificaciones`  
Tabs: **Tipos · Cuentas · Editor**.  
Canales, plantilla SMTP y **destinatarios** se configuran en cada **Tipo** (grupos, usuarios, emails).  
Rutas antiguas `/admin/notification-types` y `/admin/email-settings` redirigen.  
Django admin: `FuenteViva`, `JobProgramado`, `TipoNotificacion`.

---

## Destinatarios (centralización)

Todo aviso operativo (campana y/o email a staff) pasa por `TipoNotificacion`:

| Código | Uso |
|--------|-----|
| `RESERVAS.AVISO_ADMIN` | Nueva reserva → admins (campana historial + email). También define quién ve el bloque en vivo de pendientes. |
| `VEHICULOS.VENCIMIENTO_DOC` | Job de vencimientos documentales. |
| `DOC_SERVICIOS.*` | Documentación de servicios (nuevo / avisos por fecha). |

Correos **transaccionales al solicitante** (confirmación, aprobación, recordatorio de reserva) siguen siendo plantillas `RESERVA_*` enviadas directo al email de contacto; no usan el catálogo de Tipos.

La tabla legada `DestinatariosCorreoOperativo` se migra a Tipos al sembrar (`migrar_destinatarios_operativos_a_tipos`); la UI de Destinatarios ya no existe.

Semilla:

```bash
python manage.py shell -c "from notificaciones.services import seed_notificaciones_catalogos; seed_notificaciones_catalogos()"
```

---

## Fuentes vivas (polling genérico)

Colas en vivo **sin** historial en tabla (como reservas pendientes).

1. Registrar handler en `notificaciones/handlers.py` → `LIVE_HANDLERS`.
2. Crear `FuenteViva` (código, `handler_key`, destinatarios M2M del tipo o de la fuente).
3. La campana hace `GET /api/notificaciones/fuentes-vivas/` cada ~30s.

Semilla: `RESERVAS_PENDIENTES` → handler `reservas_pendientes`. Visibilidad = destinatarios de `RESERVAS.AVISO_ADMIN` (o M2M de la fuente tras migración).

---

## Jobs programados (scheduler integrado)

**No** usa ni modifica el cron/scripts de respaldos BDD.

```bash
# Proceso dedicado (recomendado en servidor, junto al API)
python manage.py run_scheduler

# Una pasada (prueba / Task Scheduler que solo llama este comando)
python manage.py run_scheduler --once

# Forzar todos los jobs activos ahora
python manage.py run_scheduler --force --once
```

Semilla: `VEHICULOS_VENCIMIENTOS` @ 08:00 → handler `vehiculos_vencimientos` → `notificar()`.

CLI manual sigue disponible: `python manage.py verificar_vencimientos`.

Para un job nuevo: handler en `JOB_HANDLERS` + fila `JobProgramado` (hora, activo).

---

## Contrato futuro (recepción / firma)

Campana = aviso + `link`. Factura/CDP/firma/timbre = módulo aparte.

## Historial del usuario

- Campana (topbar): muestra las más recientes; al hacer clic marca leída y navega al `link`.
- «Marcar todas» en el panel; «Ver todas las notificaciones» → `/notificaciones`.
- Página **Mis notificaciones** (`/notificaciones`): historial paginado, filtros leída/no leída y búsqueda.
  API: `GET /api/notificaciones/`, `POST …/:id/marcar_leida/`, `POST …/marcar_todas_leidas/`.
