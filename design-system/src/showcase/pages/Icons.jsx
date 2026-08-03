import { Link } from 'react-router-dom'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { Icon, iconNames, iconLabels } from '../../icons/Icon.jsx'
import { EmptyState } from '../../components/ui/EmptyState.jsx'

/** Correspondencia nav ↔ módulo (iconos únicos por ruta del sidebar). */
const NAV_ICON_MAP = [
  ['home', 'Inicio'],
  ['headphones', 'Mesa de Ayuda'],
  ['establecimientos', 'Establecimientos'],
  ['reservas', 'Reservas'],
  ['procedimientos', 'Procedimientos'],
  ['banknote', 'Tesorería'],
  ['user-check', 'Ejecutivos'],
  ['compras', 'Mercado Público'],
  ['heart', 'Bienestar'],
  ['building', 'SSGG (acordeón)'],
  ['contratos', 'Contratos'],
  ['rutas', 'Gestión de Rutas'],
  ['proveedores', 'Proveedores'],
  ['receipt', 'Factura sin OC'],
  ['servicios', 'Servicios'],
  ['credit-card', 'Pagos'],
  ['clipboard-check', 'Recepciones'],
  ['file-check', 'CDPs'],
  ['wrench', 'Operaciones (acordeón)'],
  ['funcionarios', 'Funcionarios'],
  ['car', 'Vehículos'],
  ['telefonos', 'Teléfonos'],
  ['key', 'Préstamos'],
  ['monitor', 'Soporte TI (acordeón)'],
  ['user-cog', 'Personal TI'],
  ['shield', 'Ciberseguridad'],
  ['chart-bar', 'Indicadores'],
]

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl']

export function IconsPage() {
  return (
    <>
      <ShowcaseHero
        title="Iconografía normada"
        description={
          <>
            Regla principal: cada ruta del sidebar usa un <code>data-icon</code> único; la vista
            principal repite el mismo icono en el encabezado de página. Estilo monoline 1.6px ·
            tamaños por contexto. Registro central en <code>Icon.jsx</code> ({iconNames.length}{' '}
            iconos).
          </>
        }
      />

      <ShowcaseBlock
        title="Reglas de uso"
        rule="Obligatorio en sidebar · obligatorio en page-header · prohibido mezclar estilos"
      >
        <div className="component-spec">
          <ul
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--muted)',
              lineHeight: 1.6,
              maxWidth: '65ch',
              paddingLeft: 'var(--space-5)',
              margin: 0,
            }}
          >
            <li>
              Cada{' '}
              <strong style={{ color: 'var(--fg)' }}>.nav-item</strong> incluye{' '}
              <code>{`<svg class="nav-item__icon icon" data-icon="…">`}</code>.
            </li>
            <li>
              El <code>body</code> de la vista lleva <code>data-page-icon="…"</code> y el encabezado un
              slot <code>[data-page-icon-slot]</code> con el mismo id.
            </li>
            <li>Tamaños: sidebar 18px · page-header 20px · topbar 20px · acciones inline 16px.</li>
            <li>
              Stroke uniforme <code>1.6</code> · sin relleno · <code>currentColor</code> · registro
              central en <code>Icon.jsx</code>.
            </li>
            <li>
              Migración React: <code>{`<Icon name="proveedores" size="md" />`}</code> lee del mismo
              mapa.
            </li>
            <li>
              No reutilizar el mismo icono en dos rutas hermanas del menú (p. ej. Tesorería ≠ Mercado
              Público).
            </li>
          </ul>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Correspondencia nav ↔ título (ejemplo)"
        rule="Mismo data-icon en sidebar activo y en page-header__icon-slot"
      >
        <div className="showcase-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="card">
            <div className="card__header">
              <div className="card__title">Sidebar — Proveedores</div>
            </div>
            <div
              className="card__body"
              style={{
                background: 'var(--sidebar-bg)',
                padding: 'var(--space-3)',
                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
              }}
            >
              <a href="#/" className="nav-item is-active" style={{ pointerEvents: 'none' }}>
                <Icon name="proveedores" className="nav-item__icon icon" />
                Proveedores
              </a>
            </div>
          </div>
          <div className="card">
            <div className="card__header">
              <div className="card__title">Page header — Proveedores</div>
            </div>
            <div className="card__body">
              <div className="page-header__body" style={{ marginTop: 0 }}>
                <div className="page-header__icon-slot">
                  <Icon name="proveedores" className="page-header__icon icon" />
                </div>
                <div className="page-header__content">
                  <h1 className="page-header__title" style={{ fontSize: 'var(--text-xl)' }}>
                    Proveedores
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Iconos del menú SGAF"
        rule="Un data-icon por ítem de navegación"
      >
        <div className="table-wrap">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>data-icon</th>
                <th>Vista</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {NAV_ICON_MAP.map(([name, vista]) => (
                <tr key={name}>
                  <td className="mono">{name}</td>
                  <td>{vista}</td>
                  <td>
                    <Icon name={name} size="md" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Catálogo completo"
        rule="Todos los iconos registrados en Icon.jsx — se actualiza solo al ampliar el set"
      >
        <div
          className="showcase-grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {iconNames.map((name) => (
            <div
              key={name}
              className="card"
              style={{
                padding: 'var(--space-3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-2)',
                textAlign: 'center',
              }}
            >
              <Icon name={name} size="lg" />
              <span className="mono" style={{ fontSize: 'var(--text-xs)' }}>
                {name}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                {iconLabels[name] || name}
              </span>
            </div>
          ))}
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Tamaños por contexto"
        rule=".icon--xs 14 · --sm 16 · --md 18 · --lg 20 · --xl 24"
      >
        <div className="showcase-row" style={{ alignItems: 'center', gap: 'var(--space-6)' }}>
          {SIZES.map((key) => (
            <span
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <Icon name="home" size={key} /> {key}
            </span>
          ))}
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Componentes aislados — revisión visual"
        rule="SidebarItem · PageHeader · NotificationBell · NotificationPanel · Badge — fuera del layout completo"
      >
        <EmptyState
          title="Ver demos en Navigation / Feedback"
          description={
            <>
              Las demos de campana y panel están en{' '}
              <Link to="/navigation">Navigation</Link> y estados vacíos en{' '}
              <Link to="/states">States</Link>.
            </>
          }
        />
      </ShowcaseBlock>
    </>
  )
}
