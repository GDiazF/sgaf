import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import {
  AppShell,
  NavItem,
  NavAccordion,
  useAppShell,
  NotificationBell,
} from '../../layouts/AppShell.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

const GEAR_SRC = '/assets/logo-gear.svg'

function LiveShellContent() {
  const shell = useAppShell()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <>
      <PageHeader
        icon="dashboard"
        title="Shell de navegación"
        description="Sidebar con iconos en cada ítem, topbar con panel de notificaciones normado, breadcrumbs y tabs — componentes v2."
        split
        linkComponent={Link}
        breadcrumbs={[
          { label: 'Playground', to: '/' },
          { label: 'Componentes', to: '/navigation' },
          { label: 'Navegación' },
        ]}
      />
      <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', maxWidth: '68ch' }}>
        Sidebar{' '}
        {shell?.collapsed ? 'colapsado (rail)' : 'expandido'}
        {shell?.drawerMode
          ? ` · drawer ${shell?.drawerOpen ? 'abierto' : 'cerrado'}`
          : null}
        . Usa la tuerca del brand para colapsar. En ≤1023px abre el drawer desde el topbar.
      </p>
      {shell?.drawerMode ? (
        <div className="showcase-row" style={{ marginTop: 'var(--space-3)' }}>
          <Button variant="secondary" size="sm" onClick={() => shell.setDrawerOpen(true)}>
            Abrir drawer (demo)
          </Button>
          <NotificationBell count={3} open={notifOpen} onToggle={() => setNotifOpen((v) => !v)}>
            <div className="notif-panel__header">
              <span className="notif-panel__title">Notificaciones</span>
            </div>
            <ul className="notif-panel__list">
              <li>
                <a href="#/" className="notif-panel__item is-unread">
                  <span className="notif-panel__item-body">
                    <div className="notif-panel__item-title">Comunicado interno</div>
                    <div className="notif-panel__item-desc">3 sin leer en el panel normado.</div>
                  </span>
                  <span className="notif-panel__item-time">Hoy</span>
                </a>
              </li>
            </ul>
          </NotificationBell>
        </div>
      ) : null}
    </>
  )
}

function BrandDemo() {
  const [gearAnim, setGearAnim] = useState(false)

  return (
    <>
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--muted)',
          lineHeight: 1.6,
          maxWidth: '68ch',
          marginBottom: 'var(--space-5)',
        }}
      >
        El control de abrir/cerrar vive en el bloque de marca del sidebar. La tuerca oficial del
        departamento es el toggle — rotación parcial de 48° al cambiar estado. Persiste en{' '}
        <code>localStorage</code>. Con <code>prefers-reduced-motion</code> la animación se desactiva.
      </p>
      <div className="showcase-brand-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <div>
          <p className="showcase-gear-state__label" style={{ marginBottom: 'var(--space-2)' }}>
            Expandido
          </p>
          <div className="showcase-brand-demo showcase-brand-demo--expanded sidebar">
            <div className="sidebar-brand">
              <button type="button" className="logo-gear-toggle" tabIndex={-1} style={{ pointerEvents: 'none' }}>
                <span className="logo-gear-toggle__icon">
                  <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
                </span>
                <span className="sidebar-brand__text">
                  <span className="sidebar-brand__dept">Servicios Generales</span>
                  <span className="sidebar-brand__sub">Operaciones y Soporte TI</span>
                </span>
              </button>
            </div>
          </div>
        </div>
        <div>
          <p className="showcase-gear-state__label" style={{ marginBottom: 'var(--space-2)' }}>
            Colapsado (rail 60px)
          </p>
          <div className="showcase-brand-demo showcase-brand-demo--collapsed sidebar is-collapsed">
            <div className="sidebar-brand">
              <button
                type="button"
                className="logo-gear-toggle is-collapsed-state"
                tabIndex={-1}
                style={{ pointerEvents: 'none' }}
              >
                <span className="logo-gear-toggle__icon">
                  <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
                </span>
                <span className="sidebar-brand__text">
                  <span className="sidebar-brand__dept">Servicios Generales</span>
                  <span className="sidebar-brand__sub">Operaciones y Soporte TI</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
        Estados de la tuerca — usa el sidebar live (arriba) para probar el toggle completo.
      </p>
      <div className="showcase-gear-states">
        <div className="showcase-gear-state">
          <button type="button" className="logo-gear-toggle" tabIndex={-1} style={{ pointerEvents: 'none' }}>
            <span className="logo-gear-toggle__icon">
              <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
            </span>
          </button>
          <span className="showcase-gear-state__label">Default</span>
        </div>
        <div className="showcase-gear-state">
          <button
            type="button"
            className="logo-gear-toggle is-state-hover"
            tabIndex={-1}
            style={{ pointerEvents: 'none' }}
          >
            <span className="logo-gear-toggle__icon">
              <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
            </span>
          </button>
          <span className="showcase-gear-state__label">Hover</span>
        </div>
        <div className="showcase-gear-state">
          <button
            type="button"
            className={cn(
              'logo-gear-toggle is-collapsed-state',
              gearAnim && 'is-animating is-collapsing',
            )}
            aria-label="Probar animación"
            onClick={() => {
              setGearAnim(true)
              window.setTimeout(() => setGearAnim(false), 260)
            }}
          >
            <span className="logo-gear-toggle__icon">
              <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
            </span>
          </button>
          <span className="showcase-gear-state__label">Clic = animar</span>
        </div>
      </div>
    </>
  )
}

function AccordionDemo() {
  const [collapsed, setCollapsed] = useState(false)
  const [openId, setOpenId] = useState('ssgg')

  const toggleAcc = (id) => {
    if (collapsed) {
      setCollapsed(false)
      setOpenId(id)
      return
    }
    setOpenId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--muted)',
          lineHeight: 1.6,
          maxWidth: '72ch',
          marginBottom: 'var(--space-5)',
        }}
      >
        <strong>Expandido:</strong> icono + label — una sola cascada de primer nivel abierta
        (accordion) — jerarquía con borde izquierdo en subniveles.
        <br />
        <strong>Colapsado:</strong> rail de 60px — solo iconos de primer nivel — sin chevrons, labels
        ni paneles — tooltip al hover/focus.
        <br />
        <strong>Memoria:</strong> <code>slep:sidebar-open-accordion</code>.
      </p>

      <div className="showcase-demo-controls">
        <Button variant="outline" size="sm" onClick={() => setCollapsed((v) => !v)}>
          Alternar colapsado (demo izquierda)
        </Button>
        <span className="showcase-cell__note">
          Prueba abrir SSGG y luego Finanzas — solo una queda abierta
        </span>
      </div>

      <div className="showcase-sidebar-demos">
        <div className="showcase-sidebar-demo">
          <span className="showcase-sidebar-demo__label">Demo interactiva — expandido / colapsado</span>
          <div
            className={cn(
              'showcase-sidebar-demo__frame showcase-sidebar-demo__frame--expanded sidebar',
              collapsed && 'is-collapsed',
            )}
          >
            <div className="sidebar-brand">
              <button
                type="button"
                className={cn('logo-gear-toggle', collapsed && 'is-collapsed-state')}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Demo: expandir rail' : 'Demo: contraer rail'}
                onClick={() => setCollapsed((v) => !v)}
              >
                <span className="logo-gear-toggle__icon">
                  <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
                </span>
                <span className="sidebar-brand__text">
                  <span className="sidebar-brand__dept">Servicios Generales</span>
                  <span className="sidebar-brand__sub">Demo accordion</span>
                </span>
              </button>
            </div>
            <nav className="sidebar__nav" aria-label="Demo navegación">
              <a href="#/" className="nav-item is-active" data-nav-tooltip="Dashboard" title="Dashboard">
                <Icon name="dashboard" className="nav-item__icon icon" />
                Dashboard
              </a>
              <div className="sidebar__section-label">SSGG</div>
              <div className={cn('nav-accordion', openId === 'ssgg' && 'is-open')} data-accordion>
                <button
                  type="button"
                  className="nav-accordion__trigger"
                  aria-expanded={openId === 'ssgg'}
                  data-nav-tooltip="Servicios generales"
                  title="Servicios generales"
                  onClick={() => toggleAcc('ssgg')}
                >
                  <span className="nav-accordion__label">
                    <Icon name="servicios" className="nav-item__icon icon" />
                    Servicios generales
                  </span>
                  <Icon name="chevron" className="nav-accordion__chevron" size={16} />
                </button>
                <div className="nav-accordion__panel" hidden={collapsed || openId !== 'ssgg'}>
                  <a href="#/" className="nav-item">
                    <Icon name="reservas" className="nav-item__icon icon" />
                    Reservas
                  </a>
                  <a href="#/" className="nav-item">
                    <Icon name="establecimientos" className="nav-item__icon icon" />
                    Establecimientos
                  </a>
                </div>
              </div>
              <div className="sidebar__section-label">Finanzas</div>
              <div className={cn('nav-accordion', openId === 'finanzas' && 'is-open')} data-accordion>
                <button
                  type="button"
                  className="nav-accordion__trigger"
                  aria-expanded={openId === 'finanzas'}
                  data-nav-tooltip="Compras"
                  title="Compras"
                  onClick={() => toggleAcc('finanzas')}
                >
                  <span className="nav-accordion__label">
                    <Icon name="compras" className="nav-item__icon icon" />
                    Compras
                  </span>
                  <Icon name="chevron" className="nav-accordion__chevron" size={16} />
                </button>
                <div className="nav-accordion__panel" hidden={collapsed || openId !== 'finanzas'}>
                  <a href="#/" className="nav-item">
                    <Icon name="proveedores" className="nav-item__icon icon" />
                    Proveedores
                  </a>
                </div>
              </div>
            </nav>
          </div>
          <p className="showcase-sidebar-demo__hint">
            Clic en Compras cierra SSGG automáticamente. Contrae con la tuerca y pasa el cursor sobre
            los iconos.
          </p>
        </div>

        <div className="showcase-sidebar-demo">
          <span className="showcase-sidebar-demo__label">Referencia — rail colapsado (estático)</span>
          <div className="showcase-sidebar-demo__frame showcase-sidebar-demo__frame--collapsed sidebar is-collapsed">
            <div className="sidebar-brand">
              <button
                type="button"
                className="logo-gear-toggle is-collapsed-state"
                tabIndex={-1}
                aria-label="Tuerca — rail colapsado"
              >
                <span className="logo-gear-toggle__icon">
                  <img src={GEAR_SRC} alt="" className="logo-gear" width={22} height={22} />
                </span>
                <span className="sidebar-brand__text">
                  <span className="sidebar-brand__dept">Servicios Generales</span>
                </span>
              </button>
            </div>
            <nav className="sidebar__nav" aria-label="Demo rail colapsado">
              <a href="#/" className="nav-item is-active" data-nav-tooltip="Dashboard" title="Dashboard">
                <Icon name="dashboard" className="nav-item__icon icon" />
                Dashboard
              </a>
              <div className="nav-accordion" data-accordion>
                <button
                  type="button"
                  className="nav-accordion__trigger"
                  data-nav-tooltip="Servicios generales"
                  title="Servicios generales"
                >
                  <span className="nav-accordion__label">
                    <Icon name="servicios" className="nav-item__icon icon" />
                    Servicios generales
                  </span>
                  <Icon name="chevron" className="nav-accordion__chevron" size={16} />
                </button>
                <div className="nav-accordion__panel">
                  <a href="#/" className="nav-item">
                    Oculto
                  </a>
                </div>
              </div>
              <div className="nav-accordion" data-accordion>
                <button
                  type="button"
                  className="nav-accordion__trigger"
                  data-nav-tooltip="Compras"
                  title="Compras"
                >
                  <span className="nav-accordion__label">
                    <Icon name="compras" className="nav-item__icon icon" />
                    Compras
                  </span>
                  <Icon name="chevron" className="nav-accordion__chevron" size={16} />
                </button>
                <div className="nav-accordion__panel">
                  <a href="#/" className="nav-item is-active">
                    Oculto
                  </a>
                </div>
              </div>
            </nav>
          </div>
          <p className="showcase-sidebar-demo__hint">
            Sin indentaciones ni paneles visibles. El trigger de Compras muestra activo por hijo
            activo (:has).
          </p>
        </div>
      </div>

      <div className="showcase-shell-checklist">
        <div className="showcase-shell-checklist__item">
          Sidebar expandido: icono + label en cada ítem
        </div>
        <div className="showcase-shell-checklist__item">Una sola cascada abierta (accordion)</div>
        <div className="showcase-shell-checklist__item">
          Colapsado: rail limpio sin subniveles visibles
        </div>
        <div className="showcase-shell-checklist__item">Brand toggle alineado a la retícula del rail</div>
        <div className="showcase-shell-checklist__item">Sin scroll horizontal en rail 60px</div>
        <div className="showcase-shell-checklist__item">Tooltips + title en colapsado</div>
        <div className="showcase-shell-checklist__item">Restauración de cascada al expandir</div>
        <div className="showcase-shell-checklist__item">Topbar: Portal de Gestión Interna</div>
      </div>
    </>
  )
}

function TabsDemo() {
  const [tab, setTab] = useState('tab1')
  const panels = {
    tab1: 'Contenido del tab activo — accesos frecuentes del usuario.',
    tab2: 'Links institucionales: ChileCompra, DocDigital, Persomático.',
    tab3: 'Portales externos con icono de enlace externo.',
  }

  return (
    <div className="card" data-od-id="nav-tabs-demo">
      <div className="card__header">
        <div>
          <h2 className="card__title">Tabs en panel</h2>
          <p className="card__subtitle">Patrón para widgets con secciones (links, redes, documentos)</p>
        </div>
      </div>
      <div className="card__body" style={{ padding: 0 }}>
        <div data-tabs>
          <div className="tabs" style={{ padding: '0 var(--space-4)' }}>
            <ul className="tabs__list" role="tablist">
              {[
                ['tab1', 'General'],
                ['tab2', 'Institucional'],
                ['tab3', 'Externos'],
              ].map(([id, label]) => (
                <li key={id}>
                  <button
                    type="button"
                    className={cn('tabs__btn', tab === id && 'is-active')}
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {Object.entries(panels).map(([id, text]) => (
            <div
              key={id}
              className={cn('tabs__panel', tab === id && 'is-active')}
              role="tabpanel"
              hidden={tab !== id}
              style={{ padding: 'var(--space-4)' }}
            >
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function NavigationPage() {
  return (
    <>
      <ShowcaseHero
        title="Shell de navegación"
        description="SidebarBrand, LogoGearToggle, NavAccordion, Topbar, NavDrawer y tabs — componentes v2."
      />

      <ShowcaseBlock
        title="AppShell en vivo"
        rule=".app-shell · SidebarBrand · LogoGearToggle · NavAccordion · drawer ≤1023"
      >
        <div
          style={{
            height: '70vh',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <AppShell
            contained
            brand={{
              dept: 'SLEP Iquique',
              sub: 'Demo navegación',
              logoSrc: GEAR_SRC,
            }}
            nav={({ collapsed, closeDrawer, openAccordion, toggleAccordion }) => (
              <>
                <NavItem to="/navigation" icon="dashboard" label="Dashboard" end onClick={closeDrawer} />
                <div className="sidebar__section-label">SSGG</div>
                <NavAccordion
                  id="ssgg"
                  label="Servicios generales"
                  icon="servicios"
                  open={openAccordion === 'ssgg'}
                  onToggle={toggleAccordion}
                  collapsed={collapsed}
                >
                  <NavItem to="/forms" icon="reservas" label="Gestión reservas" onClick={closeDrawer} />
                  <NavItem
                    to="/tables"
                    icon="establecimientos"
                    label="Establecimientos"
                    onClick={closeDrawer}
                  />
                  <NavItem to="/crud" icon="directorio" label="Directorio interno" onClick={closeDrawer} />
                  <NavItem
                    to="/feedback"
                    icon="telefonos"
                    label="Teléfonos"
                    badge="12"
                    onClick={closeDrawer}
                  />
                </NavAccordion>
                <div className="sidebar__section-label">Finanzas</div>
                <NavAccordion
                  id="finanzas"
                  label="Compras"
                  icon="compras"
                  open={openAccordion === 'finanzas'}
                  onToggle={toggleAccordion}
                  collapsed={collapsed}
                >
                  <NavItem to="/filters" icon="proveedores" label="Proveedores" onClick={closeDrawer} />
                  <NavItem to="/states" icon="contratos" label="Contratos" onClick={closeDrawer} />
                </NavAccordion>
                <div className="sidebar__section-label">Playground</div>
                <NavItem to="/" icon="design-system" label="Volver al playground" onClick={closeDrawer} />
                <NavItem to="/icons" icon="design-system" label="Iconografía" onClick={closeDrawer} />
              </>
            )}
            footer={
              <>
                <div className="sidebar__status">
                  <span className="sidebar__status-dot" /> En línea
                </div>
                <div className="sidebar__meta">v2.4.1 · demo</div>
              </>
            }
          >
            <LiveShellContent />
          </AppShell>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="SidebarBrand + LogoGearToggle"
        rule=".sidebar-brand · .logo-gear-toggle · data-sidebar-toggle · sin hamburguesa en topbar"
      >
        <BrandDemo />
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Sidebar expandido y colapsado — NavAccordion"
        rule=".nav-accordion · data-accordion-id · una cascada abierta · tooltips en rail · memoria al expandir"
      >
        <AccordionDemo />
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Reglas de navegación"
        rule=".nav-item.is-active · .nav-accordion.is-open · .notif-btn__badge · .dropdown.is-open"
      >
        <ul
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
            lineHeight: 1.6,
            maxWidth: '60ch',
            paddingLeft: 'var(--space-5)',
            margin: 0,
          }}
        >
          <li>
            Sidebar fijo; colapsa a rail de iconos con la tuerca del logo (sin hamburguesa en topbar)
          </li>
          <li>
            Accordion de primer nivel: una sola cascada abierta; al abrir otra se cierra la anterior
          </li>
          <li>
            Colapsado: sin labels, chevrons ni paneles; tooltips con <code>data-nav-tooltip</code>
          </li>
          <li>
            Al expandir de nuevo se restaura la última cascada abierta (
            <code>slep:sidebar-open-accordion</code>)
          </li>
          <li>Cada ítem del sidebar lleva icono — mismo id en el título de página</li>
          <li>Topbar: eyebrow institucional + título «Portal de Gestión Interna»</li>
          <li>Dropdown usuario cierra al hacer clic fuera</li>
        </ul>
      </ShowcaseBlock>

      <TabsDemo />

      <ShowcaseBlock
        title="Navegación responsive — NavDrawer"
        rule="Desktop (≥1024px): sidebar persistente · Tablet/móvil (≤1023px): drawer + backdrop · .nav-drawer-trigger"
      >
        <div className="showcase-shell-checklist">
          <p className="showcase-block__rule" style={{ marginBottom: 'var(--space-3)' }}>
            Redimensiona el visor o usa DevTools para validar cada breakpoint.
          </p>
          <ul className="showcase-checklist">
            <li>
              <strong>Desktop:</strong> sidebar fijo, tuerca contrae/expande rail — contenido se ajusta
              con margin-left
            </li>
            <li>
              <strong>Tablet/móvil cerrado:</strong> sin sidebar visible — botón menú en topbar
            </li>
            <li>
              <strong>Drawer abierto:</strong> panel superpuesto, backdrop oscuro, contenido no se
              empuja
            </li>
            <li>
              <strong>Cierre:</strong> tocar backdrop, Escape, navegar a un enlace, o tuerca en el brand
            </li>
            <li>
              <strong>Accordion:</strong> una cascada abierta; al abrir drawer siempre en modo expandido
            </li>
          </ul>
        </div>
        <div className="showcase-row" style={{ marginTop: 'var(--space-4)' }}>
          <span className="badge badge--accent">
            Usa el botón menú de la topbar del shell live en viewport ≤1023px
          </span>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="responsive-page-header"
        title="Encabezado de módulo — desktop / tablet / móvil"
        rule=".page-header--split · breadcrumb · icono + título · acciones debajo en móvil"
      >
        <ul className="showcase-checklist" style={{ marginBottom: 'var(--space-4)' }}>
          <li>
            <strong>Desktop:</strong> bloque unificado — breadcrumb arriba, icono centrado con texto,
            acciones alineadas
          </li>
          <li>
            <strong>Tablet:</strong> más compacto; acciones debajo del bloque de identidad
          </li>
          <li>
            <strong>Móvil:</strong> breadcrumb pequeño, título + descripción en columna; icono oculto
          </li>
        </ul>
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <PageHeader
            icon="proveedores"
            title="Proveedores"
            description="Directorio de proveedores habilitados para procesos de compra institucional."
            split
            linkComponent={Link}
            breadcrumbs={[
              { label: 'Inicio', to: '/' },
              { label: 'Compras', to: '/navigation' },
              { label: 'Proveedores' },
            ]}
            actions={
              <>
                <Button variant="secondary" size="sm">
                  Exportar
                </Button>
                <Button variant="primary" size="sm">
                  Crear nuevo
                </Button>
              </>
            }
          />
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 'var(--space-3)' }}>
          Redimensiona el visor a ≤767px para validar el encabezado mobile-first.
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock title="Enlaces del playground" rule="Navegar entre vistas de validación">
        <div className="showcase-row">
          <Link to="/forms" className="btn btn--outline btn--sm">
            Formularios
          </Link>
          <Link to="/tables" className="btn btn--outline btn--sm">
            Tablas
          </Link>
          <Link to="/feedback" className="btn btn--outline btn--sm">
            Feedback
          </Link>
          <Link to="/icons" className="btn btn--outline btn--sm">
            Iconografía
          </Link>
          <Link to="/page-header" className="btn btn--outline btn--sm">
            PageHeader
          </Link>
          <Link to="/" className="btn btn--ghost btn--sm">
            Índice playground
          </Link>
        </div>
      </ShowcaseBlock>
    </>
  )
}
