import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { FiltersBar } from '../../components/ui/FiltersBar.jsx'
import { Field, Input, Select } from '../../components/ui/Field.jsx'
import { PageHeader } from '../../components/ui/PageHeader.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { Link } from 'react-router-dom'

function SearchField({ id, placeholder, defaultValue }) {
  return (
    <Field label="Buscar" htmlFor={id}>
      <div className="input-wrap">
        <Icon name="search" className="input-wrap__icon" size={16} />
        <Input id={id} type="search" placeholder={placeholder} defaultValue={defaultValue} />
      </div>
    </Field>
  )
}

function AdvancedEstadoRubro({ estadoId, rubroId, estadoOptions, rubroOptions }) {
  return (
    <>
      <Field label="Estado" htmlFor={estadoId}>
        <Select id={estadoId} defaultValue="Todos">
          {(estadoOptions || ['Todos', 'Activo']).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <Field label="Rubro" htmlFor={rubroId}>
        <Select id={rubroId} defaultValue="Todos">
          {(rubroOptions || ['Todos', 'Tecnología']).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
    </>
  )
}

export function FiltersPage() {
  return (
    <>
      <ShowcaseHero
        title="Filtros reutilizables"
        description={
          <>
            Patrón unificado para listados administrativos. Componente: <code>.filters</code> con{' '}
            <code>data-filters</code>. React: <code>&lt;FiltersBar /&gt;</code>.
          </>
        }
      />

      <ShowcaseBlock title="Reglas de uso" rule="Mismo patrón en proveedores, establecimientos, reservas, compras…">
        <table className="action-map">
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Clase / atributo</th>
              <th>Comportamiento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Contenedor</td>
              <td>
                <code>.filters</code> + <code>data-filters</code>
              </td>
              <td>Formulario de búsqueda con role=&quot;search&quot;</td>
            </tr>
            <tr>
              <td>Búsqueda principal</td>
              <td>
                <code>.filters__search</code>
              </td>
              <td>Siempre visible · prioridad visual</td>
            </tr>
            <tr>
              <td>Filtros avanzados</td>
              <td>
                <code>.filters__advanced</code>
              </td>
              <td>Desktop: inline · Móvil: colapsable</td>
            </tr>
            <tr>
              <td>Toggle móvil</td>
              <td>
                <code>[data-filters-toggle]</code>
              </td>
              <td>Acordeón discreto bajo búsqueda</td>
            </tr>
            <tr>
              <td>Buscar</td>
              <td>
                <code>btn--primary</code>
              </td>
              <td>Acción principal del bloque</td>
            </tr>
            <tr>
              <td>Limpiar filtros</td>
              <td>
                <code>btn--secondary btn--quiet</code>
              </td>
              <td>Secundario · menos protagonismo</td>
            </tr>
            <tr>
              <td>Altura controles</td>
              <td>
                <code>--control-height-md</code>
              </td>
              <td>Inputs y botones alineados (36px)</td>
            </tr>
          </tbody>
        </table>
      </ShowcaseBlock>

      <ShowcaseBlock title="Filtros desktop" rule="Búsqueda + avanzados + acciones en una fila flexible">
        <div className="showcase-viewport showcase-viewport--desktop">
          <div className="showcase-viewport__label">Desktop ≥1024px</div>
          <div className="showcase-viewport__body">
            <FiltersBar
              demoMode="desktop"
              onSearch={() => {}}
              onClear={() => {}}
              advanced={<AdvancedEstadoRubro estadoId="fd-estado" rubroId="fd-rubro" />}
            >
              <SearchField id="fd-q" placeholder="Razón social, RUT o rubro…" />
            </FiltersBar>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock title="Filtros tablet" rule="Wrap natural · avanzados visibles si caben">
        <div className="showcase-viewport showcase-viewport--tablet">
          <div className="showcase-viewport__label">Tablet 768–1023px</div>
          <div className="showcase-viewport__body">
            <FiltersBar
              demoMode="tablet"
              style={{ maxWidth: '100%' }}
              onSearch={() => {}}
              onClear={() => {}}
              advanced={
                <AdvancedEstadoRubro
                  estadoId="ft-estado"
                  rubroId="ft-rubro"
                  estadoOptions={['Todos']}
                  rubroOptions={['Todos']}
                />
              }
            >
              <SearchField id="ft-q" placeholder="Razón social, RUT…" />
            </FiltersBar>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock title="Filtros móvil" rule="Columna única · avanzados colapsables · botones apilados">
        <div className="showcase-viewport showcase-viewport--mobile">
          <div className="showcase-viewport__label">Móvil ≤767px — interactivo</div>
          <div className="showcase-viewport__body">
            <FiltersBar
              id="filters-mobile-demo"
              demoMode="mobile"
              defaultOpen={false}
              onSearch={() => {}}
              onClear={() => {}}
              advanced={
                <AdvancedEstadoRubro
                  estadoId="fm-estado"
                  rubroId="fm-rubro"
                  estadoOptions={['Todos', 'Activo', 'Inactivo']}
                  rubroOptions={['Todos', 'Tecnología']}
                />
              }
            >
              <SearchField id="fm-q" placeholder="Razón social, RUT…" />
            </FiltersBar>
          </div>
        </div>
        <p className="showcase-sidebar-demo__hint" style={{ marginTop: 'var(--space-3)' }}>
          Orden móvil: Buscar → toggle avanzados → (Estado, Rubro) → Buscar btn → Limpiar. Sin huecos
          verticales artificiales.
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock title="Estado sin resultados" rule="Tras aplicar filtros sin coincidencias — debajo de .filters">
        <FiltersBar
          style={{ marginBottom: 'var(--space-3)' }}
          onSearch={() => {}}
          onClear={() => {}}
        >
          <Field label="Buscar" htmlFor="fn-q">
            <Input id="fn-q" type="search" defaultValue="xyz-inexistente" />
          </Field>
        </FiltersBar>
        <div className="filters-empty" role="status">
          <div className="filters-empty__title">Sin resultados para «xyz-inexistente»</div>
          <p>Pruebe con otros términos o limpie los filtros para ver todos los registros.</p>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Encabezado de módulo + filtros"
        rule={
          <>
            Composición típica de listado — ver <Link to="/page-header">page-header</Link>
          </>
        }
      >
        <div className="showcase-viewport-grid">
          <div className="showcase-viewport showcase-viewport--mobile">
            <div className="showcase-viewport__label">Móvil — header + filtros</div>
            <div className="showcase-viewport__body" style={{ padding: 'var(--space-3)' }}>
              <PageHeader
                icon="proveedores"
                title="Proveedores"
                breadcrumbs={[
                  { label: 'Inicio', href: '#' },
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
              <FiltersBar
                demoMode="mobile"
                defaultOpen={false}
                onSearch={() => {}}
                onClear={() => {}}
                advanced={
                  <AdvancedEstadoRubro
                    estadoId="fh-estado"
                    rubroId="fh-rubro"
                    estadoOptions={['Todos', 'Activo']}
                    rubroOptions={['Todos', 'Tecnología']}
                  />
                }
              >
                <Field label="Buscar">
                  <Input type="search" placeholder="RUT, razón social…" />
                </Field>
              </FiltersBar>
            </div>
          </div>
        </div>
        <p style={{ marginTop: 'var(--space-3)' }}>
          <Link to="/tables" className="btn btn--outline">
            Abrir listado (composición real) →
          </Link>
        </p>
      </ShowcaseBlock>
    </>
  )
}
