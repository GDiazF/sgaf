# Checklist QA — Migración Design System → SGAF

Referencia visual: `Dashboard-institucional-SLEP-Iquique/showcase/*` y composiciones (`login.html`, `dashboard.html`, `listado.html`).

## Design system (`design-system/`)

- [ ] `npm run dev` en `design-system` abre playground en `:5174`
- [ ] Índice lista todas las vistas del showcase
- [ ] Botones: variantes primary / secondary / quiet / danger / outline / ghost
- [ ] Formularios: error, disabled, switch
- [ ] Tablas: vacío, paginación, toolbar
- [ ] Feedback: alert, toast, modal, drawer, confirm
- [ ] PageHeader + FiltersBar + CRUD form
- [ ] Navigation: AppShell collapse + accordion + drawer ≤1023
- [ ] LoginCard demo
- [ ] Iconos del registry

## Piloto frontend

- [ ] Build `frontend` OK con alias `@slep/ui`
- [ ] Login: credenciales, MFA correo/app, QR setup, fondos dinámicos, forgot-password link
- [ ] Layout: menús según `can()`, perfil, admin links, notificaciones, logout, términos
- [ ] Sidebar: tuerca colapsa; persistencia `slep:sidebar-collapsed`
- [ ] Dashboard: métricas, accesos, muro bienestar, mapa/directorio
- [ ] Establecimientos: filtros, tabla, CRUD modal, excel, mapa, directorio
- [ ] Rutas no migradas (tickets, contratos, etc.) siguen navegables con shell nuevo

## Regresión funcional

- [ ] JWT / refresh / PrivateRoute
- [ ] Permisos ocultan ítems de menú
- [ ] Responsive tablet/móvil drawer
