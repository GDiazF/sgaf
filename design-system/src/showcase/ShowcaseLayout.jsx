import { NavLink, Outlet } from 'react-router-dom'
import { ToastProvider } from '../components/ui/Toast.jsx'
import './showcase-app.css'

const LINKS = [
  { to: '/', label: 'Índice', end: true },
  { to: '/buttons', label: 'Botones' },
  { to: '/forms', label: 'Formularios' },
  { to: '/crud', label: 'CRUD' },
  { to: '/filters', label: 'Filtros' },
  { to: '/tables', label: 'Tablas' },
  { to: '/feedback', label: 'Feedback' },
  { to: '/states', label: 'Estados' },
  { to: '/charts', label: 'Gráficos' },
  { to: '/motion', label: 'Motion' },
  { to: '/login', label: 'Login' },
  { to: '/navigation', label: 'Navegación' },
  { to: '/page-header', label: 'PageHeader' },
  { to: '/icons', label: 'Iconografía' },
]

export function ShowcaseLayout() {
  return (
    <ToastProvider>
      <div className="showcase-app slep-showcase-root" data-od-id="showcase-hub">
        <header className="showcase-topbar">
          <div className="showcase-topbar__brand">
            <div className="sidebar__logo" style={{ width: 32, height: 32, fontSize: 10 }}>
              SI
            </div>
            <div>
              <div className="showcase-topbar__title">Playground v2</div>
              <div className="showcase-topbar__meta">SLEP Iquique · @slep/ui · espejo OpenDesign</div>
            </div>
          </div>
          <nav className="showcase-nav" aria-label="Vistas de revisión">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="showcase-main">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
