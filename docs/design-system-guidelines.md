# Design System SGAF — guía para desarrollo frontend

Este documento define cómo construir UI en SGAF después de la migración a `@slep/ui`.  
Cursor también carga la regla `.cursor/rules/sgaf-design-system.mdc` en cada chat.

## Objetivo

Una sola capa visual y de componentes. Cualquier módulo, vista, modal o formulario nuevo debe **reutilizar** el design system. Los cambios de look & feel se hacen **en el DS (global)**, no parcheando cada pantalla.

## Dónde vive

| Qué | Dónde |
|-----|--------|
| Paquete React | `design-system/` (nombre npm `@slep/ui`) |
| Tokens / CSS | `design-system/src/styles/` |
| API pública de componentes | `design-system/src/index.js` |
| Playground / showcase | `cd design-system && npm run dev` → puerto 5174 |
| App productiva | `frontend/` importa `@slep/ui` (alias Vite) |
| Estilos de app residuales | `frontend/src/index.css` (mínimo; Leaflet, resets) |

## Principios

1. **Componente primero** — Si el DS ya tiene `Button`, `Modal`, `Field`, `DataTable`, etc., úsalo.
2. **Global antes que local** — Tipografía, espaciado, bordes, estados (hover/focus/disabled) viven en CSS del DS o en el componente.
3. **Sin estilos inline de UI** — `style={{}}` solo para valores dinámicos inevitables (posición de evento en calendario, `width: ${pct}%`, color de negocio, libs externas).
4. **Sin CSS “por página”** que copie el DS — Preferir clase BEM del sistema o extender el componente.
5. **Misma UX de feedback** — Guardar en modal/form → `FormOverlay`; borrar / acción puntual → toast (`useNotify`).

## Patrones de pantalla

### Listado / CRUD

```jsx
import { PageHeader, FiltersBar, DataTable, Button, Field, Input } from '@slep/ui'

<div className="page" data-od-id="mi-modulo-page" data-fill-viewport>entonces, 
  <PageHeader
    icon="…"
    title="…"
    description="…"
    breadcrumbs={[…]}
    split
    actions={<Button variant="primary">Nuevo</Button>}
  />
  <FiltersBar>…</FiltersBar>
  <DataTable … />
</div>
```

- Listados con tabla a pantalla completa: `data-fill-viewport` en `.page` (o `fillViewport` del `DataTable`).
- No recrear la línea del header ni el aire alrededor: lo controla `.page-header` / `--page-header-rule-gap`.

### Modal / formulario

- `Modal` / `Drawer` / `ConfirmModal` de `@slep/ui`.
- Campos: `Field` + `Input` | `Select` | `Textarea` | `Switch` | `FileInput`.
- Guardado: `useFormOverlay()` + `overlay.run(async () => {…})` + `{...overlay.modalProps}` + `onOverlayDismiss`.

### Toast

- Hook de app: `frontend/src/hooks/useNotify.js` → `notify({ variant, text })`.
- Usar para deletes y acciones que no son “guardar formulario en overlay”.

## Qué no hacer

| Evitar | Hacer en su lugar |
|--------|-------------------|
| `style={{ marginTop: 16, color: '#333' }}` | Tokens / clases del DS |
| `<button className="bg-blue-500…">` | `<Button variant="primary">` |
| Modal casero / `BaseModal` | `Modal` de `@slep/ui` |
| Duplicar `PageHeader` a mano | `<PageHeader … />` |
| Arreglar solo “esta vista” con CSS local | Cambiar `design-system/src/styles/…` o el componente |

## Cuando el DS no tiene el patrón

1. Buscar en el showcase (5174) y en `design-system/src/index.js`.
2. Si falta: implementar en `design-system/` (componente + CSS + export + demo si aplica).
3. Consumir desde `frontend` vía `@slep/ui`.
4. No “cerrar el ticket” con markup + inline styles solo en la página.

## Excepciones legítimas de estilo dinámico

- Calendario de reservas (top/height de eventos).
- Barras de progreso / gauges con `%`.
- Menús portaleados (posición fixed calculada).
- Colores de recurso, categoría o serie de gráficos.
- Leaflet / Recharts u otras libs que exigen props de estilo.

## Checklist rápido (PR / feature nueva)

- [ ] Imports desde `@slep/ui` (no UI legacy)
- [ ] `PageHeader` + `.page` si es vista de módulo
- [ ] FormOverlay o toast según el tipo de acción
- [ ] Cero (o mínimos justificados) `style={{…}}` de presentación
- [ ] Si hubo que inventar UI, ¿quedó en el design-system?
