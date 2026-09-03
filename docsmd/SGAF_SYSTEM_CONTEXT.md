# SGAF System Context Pack (Token-Optimized)

## Capa 1: Contexto Base (leer siempre)
### Bootstrap IA
- Objetivo: SGAF centraliza gestión operativa SLEP (SSGG, contratos/servicios, reservas, RRHH operativo, mesa de ayuda, monitoreos, tesorería y módulos MP).
- Stack: `Django 5 + DRF + JWT/MFA` (backend), `React 19 + Vite + Tailwind` (frontend), `PostgreSQL 16` en Docker, `SQLite` fallback local.
- Entry points:
  - Backend config/rutas: `backend/core/settings.py`, `backend/core/urls.py`
  - Frontend rutas/guardas: `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx`
  - Cliente API/auth: `frontend/src/api.js`, `frontend/src/context/AuthContext.jsx`
  - Reglas canónicas: `docs/SGAF_WORKFLOW_STANDARDS.md`, `docs/SGAF_UI_STANDARDS.md`
- Regla de seguridad base: DRF usa `IsAuthenticated` por defecto; permisos granulares por modelo y por vista.
- No asumir:
  - No todos los endpoints son privados (hay excepciones explícitas).
  - No todos los módulos UI usan la misma política de permiso (algunos solo autenticación).
  - No enviar correo directo: usar `enviar_correo_maestro`.
  - No inventar estilos UI fuera del estándar SGAF.
  - No usar `datetime.now()` para lógica temporal de negocio (usar timezone de Django).

### Arquitectura Fija (resumen operativo)
#### Frontend
- SPA con `BrowserRouter`; casi todo cuelga de `PrivateRoute` (login obligatorio).
- `ProtectedRoute` agrega control por permisos (`app_label.codename`), con soporte de arreglo (`OR` lógico).
- Sidebar (`Layout`) oculta/expone módulos según `can(...)` de `usePermission`.
- `api.js` inyecta `Bearer` desde cookies de sesión (`access_token`) y refresca token en `401`.

#### Backend
- Monolito Django modular por app; DRF `DefaultRouter` y endpoints APIView puntuales.
- `core/urls.py` monta auth/admin y agrega includes de todos los dominios.
- Paginación global DRF (`PAGE_SIZE=10`) + filtros (`DjangoFilterBackend`, `SearchFilter`, `OrderingFilter`).
- App-level lógica transversal: MFA, perfiles, configuración de correo, assets de reportes, links de interés.

#### Auth
- Login: `api/token/` (MFA-aware), refresh: `api/token/refresh/`, perfil: `api/auth/me/`.
- MFA soporta `EMAIL` y `TOTP`; flujo intermedio via `MFASession`.
- Frontend mantiene sesión en cookies de navegador y sincroniza logout entre pestañas.

#### Permisos
- Frontend:
  - `PrivateRoute`: exige usuario autenticado.
  - `ProtectedRoute`: exige permiso específico.
  - `usePermission`: superuser bypass total.
- Backend:
  - Base `IsAuthenticated`.
  - Muchos ViewSet usan `DjangoModelPermissions`.
  - Excepciones públicas listadas en "Matriz de seguridad".

#### Notificaciones / Correo
- Campana in-app: modelo `notificaciones.Notificacion`, API en `api/notificaciones/`.
- Correo: función oficial `comunicaciones.utils.enviar_correo_maestro(...)` + plantillas dinámicas.
- Reservas dispara correos operativos; tickets genera notificaciones internas.

#### Despliegue
- Docker compose levanta `db`, `backend`, `frontend(nginx)`.
- En producción requiere `.env` con Postgres; en local puede correr con SQLite si `DB_NAME` no está definido.
- Zona horaria oficial: `America/Santiago`.

## Capa 2: Índices Compactos (consultar bajo demanda)
### Vocabulario canónico
| Alias corto | Nombre canónico |
|---|---|
| `keys` | `prestamo_llaves` |
| `contracts` | `contratos` |
| `services` | `servicios` |
| `reservas` | `solicitudes_reservas` |
| `google-users` | `usuarios_google` |
| `helpdesk` | `tickets` |
| `connectivity` | `conectividad` |
| `proc` | `procedimientos` |

### Mapa de módulos ultracompacto
| Módulo | API base | UI base | Entidades clave (2-5) | Riesgo/Regla crítica |
|---|---|---|---|---|
| `core` | `/api/auth/*`, `/api/admin/*`, `/api/links-interes/*` | `/admin/*`, perfil en header | `Profile`, `SecurityConfig`, `MFASession`, `EmailConfiguration` | MFA y seguridad global; no romper flujo login/MFA |
| `prestamo_llaves` | `/api/prestamos|activos|solicitantes|tipo-activos` | `/loans`, `/keys`, `/applicants` | `Prestamo`, `Activo`, `Solicitante`, `TipoActivo` | Mantener permisos CRUD por modelo |
| `establecimientos` | `/api/establecimientos*` | `/establishments` | `Establecimiento`, `TelefonoEstablecimiento`, `TipoEstablecimiento` | Alta dependencia para módulos comunicaciones/reservas |
| `funcionarios` | `/api/funcionarios*`, `/api/subdirecciones*`, etc. | `/funcionarios/*` | `Funcionario`, `Grupo`, `Unidad`, `Departamento` | Vincula usuarios a estructura orgánica |
| `servicios` | `/api/servicios*`, `/api/proveedores*`, `/api/registros-pagos*`, etc. | `/services/*`, `/telecomunicaciones` | `Servicio`, `Proveedor`, `RegistroPago`, `RecepcionConforme`, `FacturaAdquisicion` | Módulo financiero-operativo crítico |
| `contratos` | `/api/contratos/*` | `/contracts/*` | `Contrato`, `RutaTransporte`, `PeriodoCobro`, `ServicioContrato` | Historial y trazabilidad obligatorios |
| `remuneraciones` | `/api/remuneraciones/*` | `/tesoreria`, `/tesoreria/config` | `Remuneracion`, `MapeoBanco`, `MapeoMedioPago` | Procesamiento masivo con validación estricta |
| `tesoreria` | `/api/tesoreria/procesar-banco/` | componentes en `/tesoreria/*` | (APIView de proceso) | Endpoint de proceso documental puntual |
| `solicitudes_reservas` | `/api/reservas/*` | `/reservas`, `/reservas-externas` | `SolicitudReserva`, `RecursoReservable`, `BloqueoHorario`, `ReservaSetting` | Tiene superficie pública; validar reglas de edición/borrado |
| `notificaciones` | `/api/notificaciones/*` | campana en layout | `Notificacion` | Deep-link recomendado para UX |
| `tickets` | `/api/tickets/*` | `/tickets/*` | `Ticket`, `TicketCategory`, `TicketMessage`, `SupportAgent` | Notificación y auditoría de estado |
| `impresoras` | `/api/printers/*` | `/impresoras` | `Printer` | Integraciones de descubrimiento/estado |
| `vehiculos` | `/api/vehiculos/*` | `/vehiculos` | `Vehiculo`, `RegistroMensual`, `VehiculoDocumento` | Endpoints con permisos vacíos (alto impacto seguridad) |
| `licitaciones` | `/api/licitaciones/buscar/`, `/api/licitaciones/visor/` | `/licitaciones` | `LicitacionMP` | API pública a MP, caché y cargas externas |
| `orden_compra` | `/api/orden_compra/visor/` | `/orden-compra` | `OrdenCompraMP` | API pública a MP, throttling/reintentos |
| `personal_ti` | `/api/personal-ti*` | `/personal-ti` | `PersonalTI`, `FuncionTI`, `ContratoTI` | Datos internos de soporte TI |
| `usuarios_google` | `/api/usuarios-google/*` | `/usuarios-google` | `GoogleUser`, `GoogleOrgUnit`, `GoogleUploadLog` | Fuente para conciliación con biométrico |
| `biometrico` | `/api/biometrico/*` | `/biometrico` | `BiometricoUsuario`, `BiometricoArea`, `BiometricoTerminal` | Sync con sistema externo biométrico |
| `conciliacion` | `/api/conciliacion/data/` | `/admin/conciliacion` | vista de conciliación (Google+Biométrico) | Comparación masiva, detección de duplicados |
| `conectividad` | `/api/conectividad/*` | `/monitoreo-red` | `EscuelaRed`, `PingHistory` | Telemetría de red y disponibilidad |
| `insights` | `/api/insights/*` | `/insights` | `DashboardMetric` | KPIs ejecutivos |
| `comunicaciones` | `/api/comunicaciones/*` | `/comunicaciones/ejecutivos*` | `CuentaSMTP`, `PlantillaCorreo` | Correo maestro y gestión de plantillas |
| `ejecutivos` | `/api/ejecutivos/*` | `/comunicaciones/ejecutivos*` | `AsignacionEjecutivo`, `GestionEstablecimiento`, `SubtareaGestion` | Seguimiento operacional por establecimiento |
| `bienestar` | `/api/bienestar/*` | `/bienestar`, `/bienestar/muro` | `Beneficio`, `CategoriaBienestar`, `BeneficioArchivo` | Permisos diferenciados ver vs administrar |
| `procedimientos` | `/api/procedimientos/*` | `/procedimientos` | `Procedimiento`, `TipoProcedimiento` | UI sin `ProtectedRoute` específico; backend sigue siendo barrera |

### Matriz de seguridad (resumida)
| Tipo | Evidencia | Nota |
|---|---|---|
| Patrón base autenticado | `REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES = IsAuthenticated` | Cubre endpoints sin override |
| Login/reset públicos intencionales | `core.views` con `AllowAny` (`token`, `verify-mfa`, reset pass, setup/send otp) | Necesarios para bootstrap de sesión |
| Reservas públicas | `solicitudes_reservas.views` permite `list/retrieve/create/public_manage` con `AllowAny` | Portal externo + gestión por código |
| Recursos/bloqueos/settings lectura pública | `solicitudes_reservas` `list/retrieve` con `AllowAny` | Consumo de calendario externo |
| Licitaciones públicas | `licitaciones.views` `AllowAny` | Visor MP sin credencial local |
| Orden de compra pública | `orden_compra.views` `AllowAny` | Visor MP sin credencial local |
| Vehículos sin permisos explícitos | `vehiculos.views` usa `permission_classes = []` en varios ViewSet | Riesgo alto: revisar si fue intencional |
| UI con permiso granular | `ProtectedRoute` + `usePermission` + menús condicionales | Control UX, no reemplaza control backend |

### Playbook de extensión (checklist corto)
- Definir modelo/serializer/viewset con permisos explícitos (`DjangoModelPermissions` o equivalente).
- Montar rutas en `app/urls.py` y `core/urls.py`.
- Proteger UI con `ProtectedRoute` y ocultar entradas de menú con `can(...)`.
- Si hay evento relevante: crear `Notificacion` con `link` profundo.
- Si hay email: usar `enviar_correo_maestro`, no `send_mail` directo.
- Si hay cambio de estado crítico: registrar historial/auditoría.
- Fechas: usar timezone Django (`timezone.now()`), entrada `YYYY-MM-DD` cuando aplica.
- Tablas con búsqueda remota: `useDebouncedValue(300ms)` para `searchQuery`.

### Referencias oficiales del repo (no duplicar)
- Workflow/backend: `docs/SGAF_WORKFLOW_STANDARDS.md`
- UI/frontend: `docs/SGAF_UI_STANDARDS.md`
- Deployment inicial: `docs/1. guia_primerdespliegue_docker.md`
- Desarrollo local: `docs/3. guia_desarrollo_local.md`
- Actualización/versionado: `docs/2. ciclo_de_vida_y_versiones.md`, `docs/2.2 guia_actualizacion_sistema.md`

### Atajos anti-token
#### Rutas pivote
- Backend: `backend/core/settings.py`, `backend/core/urls.py`, `backend/core/views.py`
- Frontend: `frontend/src/App.jsx`, `frontend/src/components/Layout.jsx`, `frontend/src/hooks/usePermission.js`
- API client/session: `frontend/src/api.js`, `frontend/src/context/AuthContext.jsx`

#### Comandos pivote
- Levantar stack docker: `docker compose up -d --build`
- Backend local: `python backend/manage.py runserver`
- Frontend local: `cd frontend && npm run dev`
- Migraciones: `python backend/manage.py migrate`

#### Qué abrir primero según tarea
| Tarea | Primeros archivos |
|---|---|
| Error de acceso/permisos | `frontend/src/App.jsx`, `frontend/src/hooks/usePermission.js`, `backend/core/urls.py`, viewset objetivo |
| Login/MFA/sesión | `backend/core/views.py`, `frontend/src/context/AuthContext.jsx`, `frontend/src/api.js` |
| Nuevo módulo CRUD | `backend/<app>/models.py`, `backend/<app>/views.py`, `backend/<app>/urls.py`, `frontend/src/pages/...` |
| Notificaciones/correo | `backend/notificaciones/*`, `backend/comunicaciones/utils.py`, `docs/SGAF_WORKFLOW_STANDARDS.md` |
| Incidencia de layout/UI | `docs/SGAF_UI_STANDARDS.md`, `frontend/src/components/Layout.jsx`, página objetivo |

