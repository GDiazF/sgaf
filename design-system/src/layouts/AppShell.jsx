import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../icons/Icon.jsx'
import { cn } from '../lib/cn.js'
import { Avatar } from '../components/ui/Avatar.jsx'

const SIDEBAR_KEY = 'slep:sidebar-collapsed'
const ACCORDION_KEY = 'slep:sidebar-open-accordion'
const GEAR_ANIMATION_MS = 320
const DRAWER_MQ = '(max-width: 1023px)'

const AppShellContext = createContext(null)

export function useAppShell() {
  return useContext(AppShellContext)
}

export function SidebarBrand({
  dept = 'SGAF',
  sub = 'SLEP Iquique',
  collapsed,
  onToggle,
  logoSrc = '/assets/logo-gear.svg',
  animating = null, // 'collapsing' | 'expanding' | null
}) {
  return (
    <div
      className={cn('sidebar-brand', animating && 'is-animating')}
      data-component="SidebarBrand"
    >
      <button
        type="button"
        className={cn(
          'logo-gear-toggle',
          collapsed && 'is-collapsed-state',
          animating && 'is-animating',
          animating === 'collapsing' && 'is-collapsing',
          animating === 'expanding' && 'is-expanding',
        )}
        data-sidebar-toggle
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
        aria-expanded={!collapsed}
        aria-controls="app-sidebar"
      >
        <span className="logo-gear-toggle__icon" aria-hidden="true">
          <img src={logoSrc} alt="" className="logo-gear" width={22} height={22} />
        </span>
        <span className="sidebar-brand__text">
          <span className="sidebar-brand__dept">{dept}</span>
          {sub ? <span className="sidebar-brand__sub">{sub}</span> : null}
        </span>
      </button>
    </div>
  )
}

export function NavItem({ to, href, icon, label, end, onClick, badge, className, isActive: isActiveProp }) {
  const location = useLocation()
  const content = (
    <>
      {icon ? <Icon name={icon} className="nav-item__icon icon" /> : null}
      {label}
      {badge != null && badge !== '' ? <span className="nav-item__badge">{badge}</span> : null}
    </>
  )

  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive, isPending, isTransitioning }) => {
          const active =
            typeof isActiveProp === 'function'
              ? isActiveProp({
                  isActive,
                  isPending,
                  isTransitioning,
                  location,
                  pathname: location.pathname,
                })
              : isActive
          return cn('nav-item', active && 'is-active', className)
        }}
        title={label}
        data-nav-tooltip={label}
        onClick={onClick}
      >
        {content}
      </NavLink>
    )
  }

  return (
    <a
      href={href || '#'}
      className={cn('nav-item', className)}
      title={label}
      data-nav-tooltip={label}
      onClick={onClick}
    >
      {content}
    </a>
  )
}

export function NavAccordion({
  id,
  label,
  icon,
  open,
  onToggle,
  children,
  collapsed,
}) {
  const panelId = `nav-panel-${id}`
  const showPanel = open && !collapsed

  return (
    <div
      className={cn('nav-accordion', open && 'is-open')}
      data-accordion
      data-accordion-id={id}
    >
      <button
        type="button"
        className="nav-accordion__trigger"
        data-accordion-trigger
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        data-nav-tooltip={label}
        onClick={() => onToggle?.(id)}
      >
        <span className="nav-accordion__label">
          {icon ? <Icon name={icon} className="nav-item__icon icon" /> : null}
          {label}
        </span>
        <Icon name="chevron" className="nav-accordion__chevron" size={16} />
      </button>
      <div
        id={panelId}
        className="nav-accordion__panel"
        aria-hidden={!showPanel}
        hidden={!showPanel}
      >
        {children}
      </div>
    </div>
  )
}

export function Topbar({
  eyebrow = 'SLEP Iquique',
  title = 'Portal de Gestión Interna',
  onOpenDrawer,
  drawerOpen = false,
  notifications,
  user,
  userMenu,
}) {
  const avatarLabel = user?.name ? `Cuenta de ${user.name}` : 'Menú de cuenta'
  const avatarNode = user ? (
    <Avatar
      src={user.avatar}
      name={user.name}
      initials={user.initials}
      size="sm"
    />
  ) : null

  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          type="button"
          className="nav-drawer-trigger"
          onClick={onOpenDrawer}
          aria-label="Abrir menú de navegación"
          aria-expanded={!!drawerOpen}
          aria-controls="app-sidebar"
        >
          <Icon name="menu" className="icon icon--lg" size={22} />
        </button>
        <div className="topbar__titles">
          <span className="topbar__eyebrow">{eyebrow}</span>
          <span className="topbar__title">{title}</span>
        </div>
      </div>
      <div className="topbar__right">
        {user || userMenu ? (
          <div className="topbar__user topbar__user--avatar-only" data-dropdown-trigger>
            {userMenu || (
              <span className="topbar__avatar-btn topbar__control" aria-label={avatarLabel}>
                {avatarNode}
              </span>
            )}
          </div>
        ) : null}
        {notifications}
      </div>
    </header>
  )
}

export function NotificationBell({ count = 0, open, onToggle, children, className, style }) {
  const badge = count > 99 ? '99+' : String(count)
  return (
    <div
      className={cn('notif-trigger', open && 'is-open', className)}
      data-notif-trigger
      style={style}
    >
      <button
        type="button"
        className={cn('icon-btn notif-btn topbar__control', open && 'is-active')}
        data-notif-btn
        aria-label={count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones'}
        aria-expanded={!!open}
        onClick={onToggle}
      >
        <Icon name="bell" className="icon icon--md" size="md" />
        {count > 0 ? <span className="notif-btn__badge">{badge}</span> : null}
      </button>
      {open ? (
        <div className="notif-panel" role="region" aria-label="Panel de notificaciones">
          {children}
        </div>
      ) : null}
    </div>
  )
}

/**
 * App shell: sidebar + topbar + main content.
 * `contained` — para demos enmarcados en el showcase (sidebar absolute, no fixed).
 */
export function AppShell({
  nav,
  topbar,
  footer,
  brand,
  children,
  className,
  contained = false,
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DRAWER_MQ).matches : false,
  )
  const [animating, setAnimating] = useState(null)
  const [openAccordion, setOpenAccordion] = useState(() => {
    try {
      return localStorage.getItem(ACCORDION_KEY) || null
    } catch {
      return null
    }
  })

  const location = useLocation()

  const collapsedBeforeDrawer = useRef(null)
  const togglingRef = useRef(false)
  const animTimer = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  useEffect(() => {
    try {
      if (openAccordion) localStorage.setItem(ACCORDION_KEY, openAccordion)
      else localStorage.removeItem(ACCORDION_KEY)
    } catch {
      /* ignore */
    }
  }, [openAccordion])

  /* Drawer mode sync (≤1023px) — mirror OD app.js */
  useEffect(() => {
    const mq = window.matchMedia(DRAWER_MQ)
    const apply = (isDrawer) => {
      setDrawerMode(isDrawer)
      if (isDrawer) {
        setCollapsed((prev) => {
          collapsedBeforeDrawer.current = prev
          return false
        })
        setDrawerOpen(false)
      } else {
        setDrawerOpen(false)
        if (collapsedBeforeDrawer.current != null) {
          setCollapsed(collapsedBeforeDrawer.current)
          collapsedBeforeDrawer.current = null
        }
      }
    }
    apply(mq.matches)
    const onChange = (e) => apply(e.matches)
    if (mq.addEventListener) mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    if (contained) return undefined
    document.body.classList.toggle('is-nav-drawer-open', drawerOpen && drawerMode)
    return () => document.body.classList.remove('is-nav-drawer-open')
  }, [drawerOpen, drawerMode, contained])

  useEffect(() => {
    if (!drawerOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  useEffect(
    () => () => {
      if (animTimer.current) window.clearTimeout(animTimer.current)
    },
    [],
  )

  const toggleAccordion = useCallback(
    (id) => {
      // Collapsed rail (desktop): expand first, then open that section
      if (collapsed && !drawerMode) {
        setCollapsed(false)
        setOpenAccordion(id)
        return
      }
      setOpenAccordion((prev) => (prev === id ? null : id))
    },
    [collapsed, drawerMode],
  )

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const setCollapsedAnimated = useCallback((next) => {
    if (togglingRef.current) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setCollapsed(next)
      return
    }

    togglingRef.current = true
    setAnimating(next ? 'collapsing' : 'expanding')
    setCollapsed(next)
    if (animTimer.current) window.clearTimeout(animTimer.current)
    animTimer.current = window.setTimeout(() => {
      setAnimating(null)
      togglingRef.current = false
    }, GEAR_ANIMATION_MS)
  }, [])

  const onBrandToggle = useCallback(() => {
    if (drawerMode) {
      setDrawerOpen((v) => !v)
      return
    }
    setCollapsedAnimated(!collapsed)
  }, [drawerMode, collapsed, setCollapsedAnimated])

  // When collapsing, remember open accordion then close panels (CSS hides them)
  useEffect(() => {
    if (collapsed && !drawerMode && openAccordion) {
      // keep openAccordion in state/localStorage for restore; panels hidden via CSS
    }
  }, [collapsed, drawerMode, openAccordion])

  const ctx = useMemo(
    () => ({
      collapsed: collapsed && !drawerMode,
      setCollapsed: setCollapsedAnimated,
      drawerOpen,
      setDrawerOpen,
      closeDrawer,
      openAccordion,
      toggleAccordion,
      drawerMode,
    }),
    [
      collapsed,
      drawerMode,
      setCollapsedAnimated,
      drawerOpen,
      closeDrawer,
      openAccordion,
      toggleAccordion,
    ],
  )

  const navContent =
    typeof nav === 'function'
      ? nav({
          collapsed: collapsed && !drawerMode,
          closeDrawer,
          openAccordion,
          toggleAccordion,
        })
      : nav

  const effectiveCollapsed = collapsed && !drawerMode

  return (
    <AppShellContext.Provider value={ctx}>
      <div
        className={cn(
          'app-shell',
          effectiveCollapsed && 'is-sidebar-collapsed',
          drawerMode && 'is-drawer-mode',
          drawerOpen && 'is-drawer-open',
          animating && 'is-sidebar-animating',
          contained && 'app-shell--contained',
          className,
        )}
        data-sidebar-shell
      >
        <div
          className="sidebar-backdrop"
          data-sidebar-backdrop
          hidden={!drawerOpen}
          aria-hidden={!drawerOpen}
          onClick={closeDrawer}
        />
        <aside
          id="app-sidebar"
          className={cn(
            'sidebar',
            effectiveCollapsed && 'is-collapsed',
            animating === 'collapsing' && 'is-collapsing',
          )}
          data-sidebar-state={effectiveCollapsed ? 'collapsed' : 'expanded'}
        >
          <SidebarBrand
            dept={brand?.dept}
            sub={brand?.sub}
            logoSrc={brand?.logoSrc}
            collapsed={effectiveCollapsed}
            animating={animating}
            onToggle={onBrandToggle}
          />
          <nav className="sidebar__nav" aria-label="Navegación principal">
            {navContent}
          </nav>
          {footer ? <footer className="sidebar__footer">{footer}</footer> : null}
        </aside>
        <div className="app-main">
          {topbar || (
            <Topbar
              onOpenDrawer={() => setDrawerOpen((v) => !v)}
              drawerOpen={drawerOpen}
            />
          )}
          <div key={location.pathname} className="page page-layout--full">
            {children}
          </div>
        </div>
      </div>
    </AppShellContext.Provider>
  )
}
