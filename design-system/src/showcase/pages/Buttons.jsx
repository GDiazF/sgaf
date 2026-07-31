import { Link } from 'react-router-dom'
import { Button, IconButton, ButtonSplit } from '../../components/ui/Button.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { Field, Input, Select } from '../../components/ui/Field.jsx'

export function ButtonsPage() {
  return (
    <>
      <header className="showcase-hero">
        <Link to="/" className="showcase-link-back">
          ← Volver al playground
        </Link>
        <h1 className="showcase-hero__title">Botones y acciones semánticas</h1>
        <p className="showcase-hero__desc">
          Comparar variantes, tamaños y estados. Cada acción del sistema tiene una variante fija — no
          improvisar por pantalla.
        </p>
      </header>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Variantes base</h2>
          <p className="showcase-block__rule">
            .btn + .btn--{'{primary|secondary|ghost|danger|outline}'} · React: &lt;Button variant=&quot;…&quot; /&gt;
          </p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-row demo-row">
            <Button variant="primary">Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Peligro</Button>
            <Button variant="outline">Outline</Button>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Tamaños</h2>
          <p className="showcase-block__rule">.btn--sm (32px) · default (36px) · .btn--lg (40px)</p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-grid">
            <div className="showcase-cell">
              <span className="showcase-cell__label">Small</span>
              <Button variant="primary" size="sm">
                Guardar
              </Button>
              <span className="showcase-cell__note">btn--sm</span>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Medium</span>
              <Button variant="primary">Guardar</Button>
              <span className="showcase-cell__note">default</span>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Large</span>
              <Button variant="primary" size="lg">
                Guardar
              </Button>
              <span className="showcase-cell__note">btn--lg</span>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Estados interactivos</h2>
          <p className="showcase-block__rule">Hover en vivo · focus con Tab · disabled bloquea interacción</p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-grid showcase-grid--states">
            <div className="showcase-cell">
              <span className="showcase-cell__label">Default</span>
              <Button variant="primary">Acción</Button>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Disabled</span>
              <Button variant="primary" disabled>
                Acción
              </Button>
            </div>
            <div className="showcase-cell">
              <span className="showcase-cell__label">Loading (patrón)</span>
              <Button variant="primary" loading>
                Guardando…
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Icon button y split</h2>
          <p className="showcase-block__rule">
            .btn--icon · .icon-btn · .btn-split — acciones compactas en toolbar y filas
          </p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-row demo-row">
            <Button variant="secondary" iconOnly aria-label="Editar">
              <Icon name="edit" className="btn__icon" size={16} />
            </Button>
            <IconButton danger aria-label="Eliminar">
              <Icon name="trash" size={18} />
            </IconButton>
            <ButtonSplit>
              <Button variant="secondary">Exportar</Button>
              <Button variant="secondary" iconOnly aria-label="Más opciones de exportación">
                <Icon name="chevron" className="btn__icon" size={16} />
              </Button>
            </ButtonSplit>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Acciones semánticas — mapeo normativo</h2>
          <p className="showcase-block__rule">
            Regla: una acción = una variante fija. React: &lt;Button action=&quot;save&quot; /&gt; resuelve la
            variante automáticamente.
          </p>
        </div>
        <div className="showcase-block__body">
          <table className="ds-table card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-5)' }}>
            <thead>
              <tr>
                <th>Acción</th>
                <th>Variante</th>
                <th>Ejemplo en contexto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Guardar, Aceptar, Aprobar, Crear nuevo</td>
                <td>
                  <code>primary</code>
                </td>
                <td>
                  <Button action="save" size="sm">
                    Guardar
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Cancelar, Volver atrás</td>
                <td>
                  <code>secondary</code>
                </td>
                <td>
                  <Button action="cancel" size="sm">
                    Cancelar
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Limpiar filtros</td>
                <td>
                  <code>secondary</code> + <code>quiet</code>
                </td>
                <td>
                  <Button action="clear" size="sm">
                    Limpiar filtros
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Acción terciaria inline</td>
                <td>
                  <code>ghost</code>
                </td>
                <td>
                  <Button action="tertiary" size="sm">
                    Ver archivo
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Eliminar, Cancelar reserva (confirm)</td>
                <td>
                  <code>danger</code>
                </td>
                <td>
                  <Button action="delete" size="sm">
                    Cancelar reserva
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Rechazar (en modal)</td>
                <td>
                  <code>danger-outline</code>
                </td>
                <td>
                  <Button action="reject" size="sm">
                    Rechazar
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Cancelar mi reserva (text/link)</td>
                <td>
                  <code>ghost</code> + <code>danger</code>
                </td>
                <td>
                  <Button action="cancelMine" size="sm">
                    Cancelar mi reserva
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Exportar, Importar, Descargar, Buscar</td>
                <td>
                  <code>secondary</code>
                </td>
                <td>
                  <Button action="export" size="sm">
                    Exportar
                  </Button>
                </td>
              </tr>
              <tr>
                <td>Editar, Ver detalle</td>
                <td>
                  <code>outline</code>
                </td>
                <td>
                  <Button action="view" size="sm">
                    Ver detalle
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>

          <h3 className="ds-subsection__title">Todas las acciones normadas</h3>
          <div className="showcase-row demo-row">
            <Button action="save" size="sm">
              Guardar
            </Button>
            <Button action="accept" size="sm">
              Aceptar
            </Button>
            <Button action="approve" size="sm">
              Aprobar
            </Button>
            <Button action="create" size="sm">
              Crear nuevo
            </Button>
            <Button action="cancel" size="sm">
              Cancelar
            </Button>
            <Button action="back" size="sm">
              Volver atrás
            </Button>
            <Button action="clear" size="sm">
              Limpiar filtros
            </Button>
            <Button action="delete" size="sm">
              Cancelar reserva
            </Button>
            <Button action="reject" size="sm">
              Rechazar
            </Button>
            <Button action="cancelMine" size="sm">
              Cancelar mi reserva
            </Button>
            <Button action="export" size="sm">
              Exportar
            </Button>
            <Button action="import" size="sm">
              Importar
            </Button>
            <Button action="download" size="sm">
              Descargar
            </Button>
            <Button action="search" size="sm">
              Buscar
            </Button>
            <Button action="edit" size="sm">
              Editar
            </Button>
            <Button action="view" size="sm">
              Ver detalle
            </Button>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Jerarquía danger — modales de reserva</h2>
          <p className="showcase-block__rule">
            Todas usan <code>var(--danger)</code> — jerarquía por estilo, no por tono. Solo una acción
            sólida danger por modal.
          </p>
        </div>
        <div className="showcase-block__body">
          <div className="showcase-row demo-row" style={{ alignItems: 'center' }}>
            <Button variant="danger">Cancelar reserva</Button>
            <Button variant="danger-outline">Rechazar</Button>
            <Button variant="ghost-danger">Cancelar mi reserva</Button>
          </div>
          <table className="ds-table card" style={{ padding: 0, overflow: 'hidden', marginTop: 'var(--space-4)' }}>
            <thead>
              <tr>
                <th>Variante</th>
                <th>Uso</th>
                <th>Reposo</th>
                <th>Hover</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>danger</code>
                </td>
                <td>Única acción destructiva sólida</td>
                <td>
                  Fondo <code>--danger</code>
                </td>
                <td>
                  <code>--danger-hover</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>danger-outline</code>
                </td>
                <td>Rechazar (secundaria)</td>
                <td>
                  Texto y borde <code>--danger</code>
                </td>
                <td>
                  Fondo <code>--danger-subtle</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>ghost</code> + <code>danger</code>
                </td>
                <td>Cancelar mi reserva (link)</td>
                <td>
                  Texto <code>--danger</code>, sin fondo
                </td>
                <td>
                  Fondo <code>--danger-subtle</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Combinación en barra de acciones</h2>
          <p className="showcase-block__rule">
            Patrón card__footer / page-header__actions — secondary (cancelar/volver) a la izquierda,
            primary a la derecha. Ghost solo para terciario inline.
          </p>
        </div>
        <div className="showcase-block__body">
          <div className="card">
            <div className="card__body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                Simulación de pie de formulario o modal.
              </p>
            </div>
            <div className="card__footer" style={{ justifyContent: 'space-between' }}>
              <Button variant="secondary">Volver atrás</Button>
              <div className="showcase-row demo-row">
                <Button variant="secondary">Cancelar</Button>
                <Button variant="danger">Eliminar</Button>
                <Button variant="primary">Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="showcase-block">
        <div className="showcase-block__head">
          <h2 className="showcase-block__title">Alineación con inputs — barra de filtros</h2>
          <p className="showcase-block__rule">
            En .filters, botones usan altura <code>--control-height-md</code> (36px) = .input / .select.
            Sin btn--sm. Limpiar = secondary + quiet.
          </p>
        </div>
        <div className="showcase-block__body">
          <form className="filters" onSubmit={(e) => e.preventDefault()}>
            <Field label="Buscar" htmlFor="demo-q" className="field" style={{ flex: 2, minWidth: 200 }}>
              <Input id="demo-q" type="search" placeholder="Razón social, RUT…" />
            </Field>
            <Field label="Estado" htmlFor="demo-estado">
              <Select id="demo-estado" defaultValue="Todos">
                <option>Todos</option>
                <option>Activo</option>
              </Select>
            </Field>
            <div className="filters__actions">
              <Button variant="secondary">Buscar</Button>
              <Button variant="quiet">Limpiar filtros</Button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
