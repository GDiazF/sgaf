import { Link } from 'react-router-dom'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { Button } from '../../components/ui/Button.jsx'

export function PageHeaderPage() {
  return (
    <>
      <ShowcaseHero
        eyebrow="Componente shell"
        title="PageHeader — encabezado normado"
        description="Patrón base transversal v9: breadcrumb + icono + título en color primario + descripción opcional. Sin eyebrow de módulo (redundante con breadcrumbs)."
      />

      <ShowcaseBlock
        id="anatomy"
        title="Anatomía"
        rule="`.page-header__identity` agrupa breadcrumb + cuerpo · acciones fuera en `--split`"
      >
        <div className="component-spec">
          <pre className="component-spec__code">{`.page-header[--split|--no-icon|--compact]
  .page-header__identity
    .breadcrumbs
    .page-header__body
      .page-header__icon-slot[data-page-icon-slot]  ← opcional
      .page-header__content
        h1.page-header__title   ← color --primary-text
        p.page-header__desc     ← opcional, muted
  .page-header__actions        ← solo en --split`}</pre>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="variants"
        title="Variantes por tipo de vista"
        rule="Misma estructura — distintas acciones y modificadores"
      >
        <div className="ph-demo">
          <div className="ph-demo__label">Dashboard — sin acciones en header</div>
          <PageHeader
            icon="dashboard"
            title="Hola, Guillermo"
            description="Resumen operativo y accesos a módulos administrativos del servicio."
            breadcrumbs={[
              { label: 'Inicio', href: '#' },
              { label: 'Dashboard' },
            ]}
          />
        </div>

        <div className="ph-demo">
          <div className="ph-demo__label">Listado — split con acciones (Exportar + Crear)</div>
          <PageHeader
            icon="proveedores"
            title="Proveedores"
            description="Directorio de proveedores habilitados para procesos de compra institucional."
            breadcrumbs={[
              { label: 'Inicio', href: '#' },
              { label: 'Compras', href: '#' },
              { label: 'Proveedores' },
            ]}
            split
            actions={
              <>
                <Button variant="quiet" size="sm">
                  Exportar
                </Button>
                <Button variant="primary" size="sm">
                  Crear nuevo
                </Button>
              </>
            }
          />
        </div>

        <div className="ph-demo">
          <div className="ph-demo__label">Formulario CRUD — Volver atrás</div>
          <PageHeader
            icon="establecimientos"
            title="Registrar establecimiento"
            description="Los campos marcados con * son obligatorios."
            breadcrumbs={[
              { label: 'Inicio', href: '#' },
              { label: 'Establecimientos', href: '#' },
              { label: 'Nuevo registro' },
            ]}
            split
            soloActions
            actions={
              <a href="#/" className="btn btn--secondary btn--sm">
                Volver atrás
              </a>
            }
          />
        </div>

        <div className="ph-demo">
          <div className="ph-demo__label">Detalle — Editar</div>
          <PageHeader
            icon="proveedores"
            title="Comercial Andina SpA"
            description="76.543.210-K · Rubro tecnología · Estado activo"
            breadcrumbs={[
              { label: 'Inicio', href: '#' },
              { label: 'Proveedores', href: '#' },
              { label: 'Comercial Andina SpA' },
            ]}
            split
            actions={
              <Button variant="outline" size="sm">
                Editar
              </Button>
            }
          />
        </div>

        <div className="ph-demo">
          <div className="ph-demo__label">Sin icono — `.page-header--no-icon`</div>
          <PageHeader
            noIcon
            title="Parámetros del sistema"
            description="Icono omitido cuando no aporta contexto adicional al módulo."
            breadcrumbs={[
              { label: 'Inicio', href: '#' },
              { label: 'Configuración' },
            ]}
          />
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="responsive"
        title="Comportamiento responsive"
        rule="Desktop sólido · tablet compacto · móvil sin icono por defecto · título en `--primary-text`"
      >
        <div className="ph-breakpoint-grid ph-breakpoint-grid--3">
          <div className="ph-breakpoint-card">
            <div className="ph-breakpoint-card__tag">Desktop ≥1024px</div>
            <ul className="showcase-list">
              <li>Grid split: identidad + acciones alineadas al centro</li>
              <li>Icono 44px integrado al cuerpo</li>
              <li>
                Título en color primario (<code>--primary-text</code>)
              </li>
              <li>Separador inferior del bloque</li>
              <li>Descripción hasta 58ch</li>
            </ul>
          </div>
          <div className="ph-breakpoint-card">
            <div className="ph-breakpoint-card__tag">Tablet 768–1023px</div>
            <ul className="showcase-list">
              <li>Altura reducida, icono 40px</li>
              <li>Acciones debajo del bloque de identidad</li>
              <li>
                Título en <code>--text-xl</code>
              </li>
              <li>Sin saturación visual</li>
            </ul>
          </div>
          <div className="ph-breakpoint-card">
            <div className="ph-breakpoint-card__tag">Móvil ≤767px</div>
            <ul className="showcase-list">
              <li>
                Icono oculto (modificador <code>--show-icon-mobile</code> opcional)
              </li>
              <li>Sin eyebrow de módulo — contexto en breadcrumb</li>
              <li>Breadcrumb 11px arriba</li>
              <li>Título + descripción en columna</li>
              <li>Acciones: Crear full width arriba</li>
            </ul>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="actions"
        title="Acciones en header por contexto"
        rule="Variante de botón fija — no inventar por pantalla"
      >
        <table className="data-table data-table--compact">
          <thead>
            <tr>
              <th>Vista</th>
              <th>Acciones típicas</th>
              <th>Variantes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dashboard</td>
              <td>—</td>
              <td>
                Sin <code>.page-header__actions</code>
              </td>
            </tr>
            <tr>
              <td>Listado</td>
              <td>Exportar, Importar, Crear nuevo</td>
              <td>quiet + primary</td>
            </tr>
            <tr>
              <td>Formulario crear/editar</td>
              <td>Volver atrás</td>
              <td>secondary en header; Guardar en footer</td>
            </tr>
            <tr>
              <td>Detalle</td>
              <td>Editar, Volver</td>
              <td>outline + secondary</td>
            </tr>
          </tbody>
        </table>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="real"
        title="Composiciones reales"
        rule="Mismo patrón en pantallas de producción"
      >
        <div
          className="launcher-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          <a href="http://localhost:5173/" className="btn btn--secondary" target="_blank" rel="noreferrer">
            Dashboard
          </a>
          <Link to="/tables" className="btn btn--secondary">
            Listado
          </Link>
          <Link to="/crud" className="btn btn--secondary">
            Formulario CRUD
          </Link>
          <Link to="/navigation" className="btn btn--secondary">
            Shell navegación
          </Link>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Partial canónico"
        rule="`PageHeader` de @slep/ui — copiar y adaptar por vista"
      >
        <p
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--muted)',
            maxWidth: '65ch',
            lineHeight: 1.6,
          }}
        >
          Migración React:{' '}
          <code>
            {`<PageHeader icon="proveedores" title="Proveedores" description="…" actions={<Actions />} />`}
          </code>
        </p>
      </ShowcaseBlock>
    </>
  )
}
