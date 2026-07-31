import { useEffect, useState } from 'react'
import { ShowcaseHero, ShowcaseBlock } from '../ShowcaseHero.jsx'
import { Button, IconButton } from '../../components/ui/Button.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useToast } from '../../components/ui/Toast.jsx'
import { Alert } from '../../components/ui/Alert.jsx'
import { Icon } from '../../icons/Icon.jsx'
import { cn } from '../../lib/cn.js'

const MOTION_TOKENS = [
  ['--motion-duration-instant', '80ms', 'Hover, focus, micro-feedback'],
  ['--motion-duration-fast', '120ms', 'Botones, toggles, notificaciones'],
  ['--motion-duration-normal', '200ms', 'Modal, tabs, cards'],
  ['--motion-duration-slow', '260ms', 'Drawer, sidebar toggle'],
  ['--motion-ease-out', 'cubic-bezier(0.16,1,0.3,1)', 'Salidas, hover'],
  ['--motion-ease-enter', 'cubic-bezier(0.22,1,0.36,1)', 'Entradas de paneles'],
]

const MOTION_MAP = [
  ['Modal', 'Backdrop fade + panel slide-up', '200ms'],
  ['Drawer', 'Slide desde derecha', '260ms'],
  ['Nav drawer (móvil)', 'Sidebar slide + backdrop', '260ms'],
  ['Notificaciones', 'Popover fade + translateY', '120ms'],
  ['Tabs', 'Panel fade-in', '200ms'],
  ['Toast', 'Slide-down desde arriba', '200ms'],
  ['Sidebar toggle', 'Tuerca rotate 48°', '260ms'],
  ['Cards dashboard', 'Stagger fade-in', '200ms + 40ms delay'],
  ['Filtros / tabla', 'Pulse opacidad', '260ms'],
  ['Barras chart', 'Width grow al scroll', '200ms'],
  ['Skeleton', 'Shimmer (si no reduced)', '1.4s loop'],
]

const TAB_PANELS = [
  {
    id: 'tab-a',
    label: 'Resumen',
    body: 'Contenido del resumen. Al cambiar de tab, el panel entra con animación sutil.',
  },
  {
    id: 'tab-b',
    label: 'Detalle',
    body: 'Vista de detalle con campos readonly.',
  },
  {
    id: 'tab-c',
    label: 'Historial',
    body: 'Timeline de cambios y auditoría.',
  },
]

export function MotionPage() {
  const [modal, setModal] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tab, setTab] = useState('tab-a')
  const [tabAnimKey, setTabAnimKey] = useState(0)
  const [staggerKey, setStaggerKey] = useState(0)
  const [filterPulse, setFilterPulse] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!filterPulse) return undefined
    const id = window.setTimeout(() => setFilterPulse(false), 300)
    return () => window.clearTimeout(id)
  }, [filterPulse])

  const selectTab = (id) => {
    setTab(id)
    setTabAnimKey((k) => k + 1)
  }

  const replayStagger = () => setStaggerKey((k) => k + 1)

  const simulateFilter = () => {
    setFilterPulse(false)
    // Force remount of animation class (same as motion-demo.js void offsetWidth trick)
    requestAnimationFrame(() => setFilterPulse(true))
  }

  return (
    <>
      <ShowcaseHero
        title="Sistema de motion"
        description={
          <>
            Animaciones suaves, breves y contextuales. Orientadas a feedback de interacción, no
            decoración. Respeta <code>prefers-reduced-motion</code> — en producción desactiva
            transiciones para usuarios que lo soliciten.
          </>
        }
      />

      <ShowcaseBlock
        id="motion-tokens"
        title="Tokens de duración y easing"
        rule="css/tokens.css · css/motion.css"
      >
        <table className="motion-spec-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Valor</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody>
            {MOTION_TOKENS.map(([token, value, use]) => (
              <tr key={token}>
                <td>
                  <code>{token}</code>
                </td>
                <td>{value}</td>
                <td>{use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-modal"
        title="Modal — apertura y cierre"
        rule="fade backdrop + slide-up panel · 200ms · sheet en móvil"
      >
        <Button variant="primary" onClick={() => setModal(true)}>
          Abrir modal
        </Button>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-drawer"
        title="Drawer — slide desde la derecha"
        rule="260ms ease-enter · backdrop fade 200ms"
      >
        <div className="motion-demo-stage">
          <Button variant="primary" size="sm" onClick={() => setDrawerOpen(true)}>
            Abrir drawer
          </Button>
          <div
            className={cn('motion-demo-backdrop', drawerOpen && 'is-visible')}
            onClick={() => setDrawerOpen(false)}
            aria-hidden={!drawerOpen}
          />
          <div className={cn('motion-demo-drawer', drawerOpen && 'is-open')}>
            <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Panel lateral
            </h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginBottom: 'var(--space-4)' }}>
              Edición rápida o detalle sin abandonar el contexto.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-tabs"
        title="Tabs — cambio de panel"
        rule=".tabs__panel · fade + slide 4px · 200ms"
      >
        <div className="tabs" data-motion-tabs>
          <div className="tabs__list" role="tablist">
            {TAB_PANELS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn('tabs__trigger', tab === t.id && 'is-active')}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => selectTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {TAB_PANELS.map((t) => (
            <div
              key={`${t.id}-${tab === t.id ? tabAnimKey : 'idle'}`}
              className="tabs__panel"
              role="tabpanel"
              hidden={tab !== t.id}
            >
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', padding: 'var(--space-4) 0' }}>
                {t.body}
              </p>
            </div>
          ))}
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-cards"
        title="Cards — aparición escalonada"
        rule=".motion-stagger · delay 40ms entre ítems"
      >
        <Button
          variant="secondary"
          size="sm"
          style={{ marginBottom: 'var(--space-4)' }}
          onClick={replayStagger}
        >
          Reproducir animación
        </Button>
        <div key={staggerKey} className="grid-3 motion-stagger" id="stagger-demo">
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div className="card__title">Widget 1</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div className="card__title">Widget 2</div>
          </div>
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div className="card__title">Widget 3</div>
          </div>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-filters"
        title="Actualización de listado / filtros"
        rule=".motion-filter-update · pulse breve al refrescar datos"
      >
        <Button variant="primary" size="sm" onClick={simulateFilter}>
          Simular búsqueda
        </Button>
        <div
          id="filter-result"
          className={cn('card', filterPulse && 'motion-filter-update')}
          style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}
        >
          <p style={{ fontSize: 'var(--text-sm)' }}>Resultados del listado (4 registros)</p>
          <ul style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 'var(--space-2)' }}>
            <li>Distribuidora Norte SpA</li>
            <li>Servicios Integrales Ltda.</li>
          </ul>
        </div>
      </ShowcaseBlock>

      <ShowcaseBlock id="motion-toast" title="Toast — entrada" rule="slide-up 8px + fade · 200ms">
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            showToast('Los cambios se aplicaron al registro.', {
              variant: 'success',
              title: 'Guardado correctamente',
            })
          }
        >
          Mostrar toast
        </Button>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-states"
        title="Hover / focus / active"
        rule="80–120ms · translateY(1px) en botón primary al presionar"
      >
        <div className="ds-row">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <IconButton aria-label="Icono">
            <Icon name="plus" className="icon" size={20} />
          </IconButton>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginTop: 'var(--space-3)' }}>
          Pruebe hover, focus (Tab) y click para ver micro-interacciones normadas.
        </p>
      </ShowcaseBlock>

      <ShowcaseBlock
        id="motion-a11y"
        title="prefers-reduced-motion"
        rule="Todas las animaciones → 0.01ms cuando el usuario lo solicita"
      >
        <Alert variant="info" title="Accesibilidad">
          <p>
            En Windows: Configuración → Accesibilidad → Efectos visuales → Animaciones. El sistema
            desactiva transiciones y keyframes automáticamente.
          </p>
        </Alert>
      </ShowcaseBlock>

      <ShowcaseBlock id="motion-map" title="Mapa de motion por componente">
        <table className="motion-spec-table">
          <thead>
            <tr>
              <th>Componente</th>
              <th>Animación</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {MOTION_MAP.map(([comp, anim, dur]) => (
              <tr key={comp}>
                <td>{comp}</td>
                <td>{anim}</td>
                <td>{dur}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ShowcaseBlock>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Modal de ejemplo"
        labelledBy="demo-modal-title"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => setModal(false)}>
              Aceptar
            </Button>
          </>
        }
      >
        <p>
          Entrada con fade + desplazamiento vertical suave. En móvil se comporta como sheet inferior.
        </p>
      </Modal>
    </>
  )
}
