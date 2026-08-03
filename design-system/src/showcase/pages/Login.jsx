import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Icon } from '../../icons/Icon.jsx'

export function LoginPage() {
  return (
    <>
      <ShowcaseHero
        title="Login institucional"
        description={
          <>
            Componente <code>LoginCard</code> — card horizontal 50/50, tokens v2, inputs y botones del
            showcase. Misma anatomía en todas las vistas canónicas.
          </>
        }
      />

      <ShowcaseBlock
        title="Identidad visual v2.5"
        rule="Sin scroll vertical · Source Sans 3 en título · branding centrado · misma foto en las 3 vistas"
      >
        <div className="component-spec">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>v2.4</th>
                <th>v2.5 (actual)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Georgia / serif de sistema en título</td>
                <td>
                  <code>var(--font-display)</code> — Source Sans 3, peso 600
                </td>
              </tr>
              <tr>
                <td>Scroll posible en 1080p</td>
                <td>
                  <code>html, body {'{ overflow: hidden }'}</code> + card con <code>max-height</code>{' '}
                  acotada
                </td>
              </tr>
              <tr>
                <td>Tagline podía leerse desalineado</td>
                <td>
                  Eyebrow, título y tagline con <code>width:100%; text-align:center</code>
                </td>
              </tr>
              <tr>
                <td>Mobile sin compresión en pantallas bajas</td>
                <td>
                  Media <code>max-height:700px</code> reduce padding y logo
                </td>
              </tr>
              <tr>
                <td>Establecimiento podía forzar scroll</td>
                <td>
                  Card compacta + <code>max-height</code> en desktop
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Tipografía del título — comparar"
        rule={
          <>
            Vistas canónicas usan <strong>Opción A</strong> (Source Sans 3). Opción B solo para
            evaluación.
          </>
        }
      >
        <div className="login-type-demo">
          <div className="login-type-demo__panel">
            <div className="login-type-demo__label">Opción A — activa en login</div>
            <p className="login-type-demo__eyebrow">Plataforma institucional</p>
            <h3 className="login-type-demo__title--a">Sistema de gestión administrativa</h3>
            <p className="login-type-demo__tagline">
              Gestiona procesos, solicitudes y servicios desde un único punto de acceso.
            </p>
            <span className="login-type-demo__badge">Source Sans 3 · 600 · -0.02em</span>
          </div>
          <div className="login-type-demo__panel">
            <div className="login-type-demo__label">Opción B — evaluación</div>
            <p className="login-type-demo__eyebrow">Plataforma institucional</p>
            <h3 className="login-type-demo__title--b">Sistema de gestión administrativa</h3>
            <p className="login-type-demo__tagline">
              Gestiona procesos, solicitudes y servicios desde un único punto de acceso.
            </p>
            <span className="login-type-demo__badge">IBM Plex Serif · 600</span>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Índice de archivos"
        rule="Un archivo por contexto · sin duplicados · layout horizontal aprobado como base"
      >
        <div className="component-spec">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Rol</th>
                <th>Abrir</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>frontend/Login</code>
                </td>
                <td>
                  <strong>Vista principal</strong> — desktop, foto + overlay, default sin error
                </td>
                <td>
                  <a
                    href="http://localhost:5173/login"
                    className="btn btn--primary btn--sm"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <code>LoginCard</code>
                </td>
                <td>
                  Componente <code>@slep/ui</code> — anatomía canónica 50/50
                </td>
                <td>—</td>
              </tr>
              <tr>
                <td>
                  <code>logo-login-dark.png</code>
                </td>
                <td>Wordmark institucional en panel brand</td>
                <td>—</td>
              </tr>
              <tr>
                <td>
                  <code>showcase/login</code>
                </td>
                <td>Estados aislados del design system (esta página)</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        title="Estados del formulario"
        rule={
          <>
            Mismos componentes que <code>forms</code> y <code>feedback</code>
          </>
        }
      >
        <div className="login-showcase-states">
          <div className="card login-showcase-state">
            <span className="login-showcase-state__label">Default</span>
            <div className="login-form-panel" style={{ padding: 'var(--space-5)' }}>
              <h2 className="login-form-panel__title" style={{ fontSize: 'var(--text-xl)' }}>
                Iniciar sesión
              </h2>
              <div className="field" style={{ marginTop: 'var(--space-4)' }}>
                <label className="field__label field__label--required" htmlFor="demo-user">
                  Usuario
                </label>
                <div className="input-wrap">
                  <Icon name="user" className="input-wrap__icon" size={16} />
                  <input className="input no-global" id="demo-user" placeholder="Ingresa tu usuario" />
                </div>
              </div>
              <div className="field">
                <label className="field__label field__label--required" htmlFor="demo-pass">
                  Contraseña
                </label>
                <div className="input-wrap">
                  <Icon name="lock" className="input-wrap__icon" size={16} />
                  <input
                    className="input no-global"
                    id="demo-pass"
                    type="password"
                    placeholder="Ingresa tu contraseña"
                  />
                </div>
              </div>
              <Button type="button" variant="primary" style={{ width: '100%', marginTop: 'var(--space-3)' }}>
                Iniciar sesión
              </Button>
            </div>
          </div>

          <div className="card login-showcase-state">
            <span className="login-showcase-state__label">Focus</span>
            <div className="login-form-panel" style={{ padding: 'var(--space-5)' }}>
              <div className="field">
                <label className="field__label" htmlFor="demo-focus">
                  Usuario
                </label>
                <input
                  className="input no-global"
                  id="demo-focus"
                  defaultValue="guillermo.d"
                  style={{
                    borderColor: 'var(--border-focus)',
                    boxShadow: '0 0 0 3px var(--primary-subtle)',
                  }}
                />
                <span className="field__hint">
                  Anillo <code>--border-focus</code>
                </span>
              </div>
            </div>
          </div>

          <div className="card login-showcase-state">
            <span className="login-showcase-state__label">Error</span>
            <div className="login-form-panel" style={{ padding: 'var(--space-5)' }}>
              <div className="alert alert--danger alert--compact" role="alert">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <div className="alert__title">Credenciales incorrectas</div>
                  <div className="alert__text">Usuario o contraseña no válidos.</div>
                </div>
              </div>
              <div className="field field--error" style={{ marginTop: 'var(--space-3)' }}>
                <label className="field__label" htmlFor="demo-err">
                  Usuario
                </label>
                <input
                  className="input no-global"
                  id="demo-err"
                  defaultValue="usuario.demo"
                  aria-invalid="true"
                />
              </div>
            </div>
          </div>

          <div className="card login-showcase-state">
            <span className="login-showcase-state__label">Loading</span>
            <div className="login-form-panel" style={{ padding: 'var(--space-5)' }}>
              <Button type="button" variant="primary" loading style={{ width: '100%' }} disabled>
                Iniciar sesión
              </Button>
              <p className="field__hint" style={{ marginTop: 'var(--space-3)' }}>
                Clase <code>.btn.is-loading</code>
              </p>
            </div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock title="Anatomía LoginCard">
        <div className="component-spec">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Componente / token</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Fondo</td>
                <td>
                  Foto institucional + overlay ~65% <code>--sidebar-bg</code>
                </td>
              </tr>
              <tr>
                <td>Card</td>
                <td>
                  Horizontal 50/50 · 960–1000px · <code>.login-card</code>
                </td>
              </tr>
              <tr>
                <td>Branding</td>
                <td>
                  <code>--sidebar-bg</code> · logo institucional · padding 48px
                </td>
              </tr>
              <tr>
                <td>Formulario</td>
                <td>
                  <code>--surface</code> · <code>.field</code> · <code>.input-wrap</code>
                </td>
              </tr>
              <tr>
                <td>CTA</td>
                <td>
                  <code>.btn--primary</code> (<code>--primary</code>) ancho completo
                </td>
              </tr>
              <tr>
                <td>Error</td>
                <td>
                  <code>.alert--danger.alert--compact</code> + <code>.field--error</code>
                </td>
              </tr>
              <tr>
                <td>Establecimiento</td>
                <td>Card flotante desktop · apilada en móvil</td>
              </tr>
              <tr>
                <td>Demo acceso</td>
                <td>
                  usuario <code>admin</code> · contraseña <code>slep2026</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ShowcaseBlock>
    </>
  )
}
