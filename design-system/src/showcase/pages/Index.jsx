import { Link } from 'react-router-dom'

const CARDS = [
  { to: '/buttons', title: 'Botones y acciones', desc: 'Variantes, tamaños, estados y mapeo semántico' },
  { to: '/forms', title: 'Campos de formulario', desc: 'Tipos de input y estados de campo' },
  { to: '/crud', title: 'Formularios CRUD', desc: 'Crear, editar, detalle y estados' },
  { to: '/filters', title: 'Filtros', desc: 'Desktop · tablet · móvil · vacío' },
  { to: '/tables', title: 'Tablas', desc: 'Toolbar, sort, empty, loading, cards' },
  { to: '/feedback', title: 'Feedback', desc: 'Modal, drawer, toast, alerts, reservas' },
  { to: '/states', title: 'Estados operativos', desc: 'Empty / skeleton / permisos / overlays' },
  { to: '/charts', title: 'Gráficos', desc: 'KPI, series, donut y estados' },
  { to: '/motion', title: 'Motion', desc: 'Duraciones, modal, drawer, stagger' },
  { to: '/login', title: 'Login', desc: 'LoginCard institucional + estados' },
  { to: '/navigation', title: 'Navegación', desc: 'AppShell, accordion, drawer, tabs' },
  { to: '/page-header', title: 'PageHeader', desc: 'Variantes por tipo de vista' },
  { to: '/icons', title: 'Iconografía', desc: 'Registro + nav ↔ header' },
]

export function ShowcaseIndex() {
  return (
    <>
      <header className="showcase-hero">
        <p className="page-header__eyebrow">Entorno de revisión</p>
        <h1 className="showcase-hero__title">Validar antes de migrar</h1>
        <p className="showcase-hero__desc">
          Playground v2 espejo de OpenDesign — dirección institucional-unificada. Revisá componentes y
          luego composiciones en <code>frontend/</code> vía <code>@slep/ui</code>.
        </p>
      </header>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Vistas de componentes</h2>
          <p className="showcase-block__rule">Revisar primero — luego validar en el piloto React</p>
        </div>
        <div className="showcase-block__body">
          <div className="launcher-grid demo-grid">
            {CARDS.map((c) => (
              <Link key={c.to} to={c.to} className="card card-quick">
                <div>
                  <div className="card__title">{c.title}</div>
                  <p className="card__subtitle">{c.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="showcase-block" data-od-id="composition-views">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Composiciones reales (v2)</h2>
          <p className="showcase-block__rule">Pantallas construidas solo con componentes normados — piloto en frontend/</p>
        </div>
        <div className="showcase-block__body">
          <div className="launcher-grid demo-grid">
            <a href="http://localhost:5173/login" className="card card-quick" target="_blank" rel="noreferrer">
              <div>
                <div className="card__title">Login (piloto)</div>
                <p className="card__subtitle">LoginCard institucional en la app React</p>
              </div>
            </a>
            <Link to="/tables" className="card card-quick">
              <div>
                <div className="card__title">Listado con filtros</div>
                <p className="card__subtitle">Toolbar, tabla, paginación, record-cards</p>
              </div>
            </Link>
            <Link to="/crud" className="card card-quick">
              <div>
                <div className="card__title">Formulario CRUD</div>
                <p className="card__subtitle">Crear / editar / detalle + action map</p>
              </div>
            </Link>
            <Link to="/charts" className="card card-quick">
              <div>
                <div className="card__title">Dashboard analítico</div>
                <p className="card__subtitle">KPI + charts + timeline</p>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
