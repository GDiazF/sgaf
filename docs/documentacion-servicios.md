# Documentación de servicios (genérica)

Módulo para registrar documentos de servicios operativos (fumigación, sanitización de estanques, etc.) **sin una tabla nueva por cada tipo**.

## Uso operativo

- Ruta UI: `/services/documentacion` (SSGG → Documentación)
- Pestañas = tipos activos (`TipoRegistroServicio`)
- Cada tipo define sus campos (`CampoDefinicion`); el registro guarda columnas fijas + `valores` JSON + archivo opcional

Semillas iniciales: **Fumigación** (folio `FMS-…`) y **Sanitización de estanques**.

## API

Prefijo: `/api/doc-servicios/`

| Recurso | Endpoints |
|--------|-----------|
| Tipos | `GET/POST …/tipos/`, `GET/PATCH/DELETE …/tipos/:id/` |
| Campos | `GET/POST …/campos/?tipo=`, … |
| Registros | `GET/POST …/registros/` (multipart si hay archivo), `…/registros/:id/` |
| Meta UI | `GET …/registros/meta/` |

Filtros registros: `tipo`, `establecimiento`, `fecha_desde`, `fecha_hasta`, `q` (folio).

## Notificaciones

- **Al crear registro:** en Configurar tipo → «Avisar al crear un registro».
  Aparece `DOC_SERVICIOS.{CODIGO}_NUEVO` en `/admin/notificaciones` (tab Tipos).
- **Aviso por fecha:** en un campo fecha, columna «Aviso (días)» (ej. 60).
  Hitos: el valor configurado + **60, 45, 30, 20, 10, 5 y 1** (los que queden por debajo), **una vez cada hito**.
  Ej.: 60 → 60/45/30/20/10/5/1; 30 → 30/20/10/5/1.
  Aparece `DOC_SERVICIOS.{CODIGO}_AVISO`. Job diario `DOC_SERVICIOS_AVISOS` (08:15, requiere `run_scheduler`).
- **Solo último por establecimiento:** flag del tipo (`aviso_solo_ultimo_por_establecimiento`).
  Activo por defecto en **Sanitización de estanques**: el historial se conserva, pero los avisos
  usan solo el registro más reciente de cada colegio (`fecha_servicio`, luego fecha de alta).
  Fumigación u otros tipos sin el flag siguen avisando por cada registro.

## Permisos

- Ver/crear registros: autenticado + (en front) `documentacion_servicios.view_registroserviciodoc` **o** `servicios.view_proveedor`
- Configurar tipos/campos: `is_staff` / superuser / `documentacion_servicios.configure_tiporegistroservicio`

## Añadir un tipo nuevo

1. Crear `TipoRegistroServicio` (Django admin o API con permiso de config).
2. Definir `CampoDefinicion` (claves reservadas de columna: `folio`, `proveedor`, `establecimiento`, `fecha_servicio`, `archivo`; el resto va a `valores`).
3. Aparece como pestaña en la UI.

No hace falta migración ni código por tipo.
