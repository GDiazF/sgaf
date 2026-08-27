import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  NavItem,
  NavAccordion,
  Topbar,
  NotificationBell,
  Button,
  Modal,
  Icon,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  Avatar,
  useAppShell,
} from '@slep/ui'
import { useAuth } from '../context/AuthContext'
import { usePermission } from '../hooks/usePermission'
import api from '../api'
import UserProfileModal from './auth/UserProfileModal'
import AboutModal from './common/AboutModal'
import { APP_VERSION } from '../version'

function isContractsNavActive({ pathname }) {
  return pathname === '/contracts' || pathname.startsWith('/contracts/')
}

function ShellTopbar({
  notifications,
  user,
  userMenu,
}) {
  const shell = useAppShell()
  return (
    <Topbar
      onOpenDrawer={() => shell?.setDrawerOpen?.((open) => !open)}
      drawerOpen={!!shell?.drawerOpen}
      notifications={notifications}
      user={user}
      userMenu={userMenu}
    />
  )
}

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, checkUserStatus } = useAuth()
  const { can } = usePermission()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [liveFuentes, setLiveFuentes] = useState([])
  const [notifications, setNotifications] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [acceptLoading, setAcceptLoading] = useState(false)
  const [termsAcceptedCheckbox, setTermsAcceptedCheckbox] = useState(false)
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)

  const displayName =
    user?.funcionario_data?.nombre_funcionario || user?.username || 'Usuario'
  const roleLabel = user?.is_superuser
    ? 'Super Administrador'
    : user?.groups?.[0] || 'Usuario Sistema'

    useEffect(() => {
        const routeTitles = {
      '/': 'Inicio',
            '/establishments': 'Establecimientos',
            '/funcionarios': 'Funcionarios',
            '/reservas': 'Reservas',
      '/tickets': 'Mesa de Ayuda',
            '/procedimientos': 'Procedimientos',
      '/ciberseguridad': 'Ciberseguridad',
      '/mercado-publico': 'Mercado Público',
      '/tesoreria': 'Remuneraciones',
      '/bienestar': 'Bienestar',
    }
    const baseTitle = 'SGAF - SLEP Iquique'
    const pageTitle = routeTitles[location.pathname] || ''
    document.title = pageTitle ? `${pageTitle} | ${baseTitle}` : baseTitle
  }, [location.pathname])

  useEffect(() => {
    if (location.state?.setup_mfa) setIsProfileModalOpen(true)
  }, [location.state])

    useEffect(() => {
    if (!user) return undefined
    let cancelled = false

    const fetchLive = async () => {
      try {
        const res = await api.get('notificaciones/fuentes-vivas/')
        if (!cancelled) setLiveFuentes(res.data.fuentes || [])
      } catch {
        if (!cancelled) setLiveFuentes([])
      }
    }

    fetchLive()
    const interval = setInterval(fetchLive, 30000)
    window.addEventListener('refresh-notifications', fetchLive)
    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener('refresh-notifications', fetchLive)
    }
  }, [user])

    useEffect(() => {
    if (!user) return undefined
        const fetchNotifications = async () => {
            try {
        const res = await api.get('notificaciones/', {
          params: { page_size: 20, ordering: '-fecha_creacion' },
        })
        const fetched = res.data.results || res.data || []
        setNotifications(fetched)
      } catch {
        /* ignore */
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    const onRefresh = () => fetchNotifications()
    window.addEventListener('refresh-notifications', onRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-notifications', onRefresh)
    }
  }, [user])

    useEffect(() => {
        const checkStatus = async () => {
            try {
        await api.get('establecimientos/', { params: { limit: 1 }, timeout: 5000 })
        setIsOnline(true)
            } catch (error) {
        setIsOnline(Boolean(error.response))
      }
    }
    checkStatus()
    const interval = setInterval(checkStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onClick = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false)
      }
    }
    if (isProfileOpen || isNotificationsOpen) {
      document.addEventListener('mousedown', onClick)
    }
    return () => document.removeEventListener('mousedown', onClick)
  }, [isProfileOpen, isNotificationsOpen])

  // Tablet/móvil: anclar panel a la campana (posición fixed + backdrop)
  useEffect(() => {
    const isCompact = () => window.matchMedia('(max-width: 1023px)').matches
    const trigger = notificationsRef.current?.querySelector('[data-notif-trigger]')
    const panel = trigger?.querySelector('.notif-panel')
    const btn = trigger?.querySelector('[data-notif-btn]')

    const clearPosition = () => {
      if (!panel) return
      panel.style.top = ''
      panel.style.left = ''
      panel.style.right = ''
      panel.style.bottom = ''
      panel.style.width = ''
      panel.style.maxWidth = ''
      panel.style.maxHeight = ''
    }

    const positionPanel = () => {
      if (!trigger || !panel || !btn || !isCompact()) {
        clearPosition()
        return
      }
      const rect = btn.getBoundingClientRect()
      const gap = 8
      const edge = 12
      const vw = window.innerWidth
      const vh = window.innerHeight
      const panelWidth = Math.min(360, vw - edge * 2)
      const preferredHeight = Math.min(vh * 0.65, 440)

      let top = rect.bottom + gap
      let left = rect.right - panelWidth
      if (left < edge) left = edge
      if (left + panelWidth > vw - edge) left = Math.max(edge, vw - edge - panelWidth)

      const spaceBelow = vh - rect.bottom - gap - edge
      const spaceAbove = rect.top - gap - edge
      if (spaceBelow < 200 && spaceAbove > spaceBelow) {
        const height = Math.min(preferredHeight, spaceAbove)
        top = Math.max(edge, rect.top - gap - height)
        panel.style.maxHeight = `${height}px`
      } else {
        panel.style.maxHeight = `${Math.min(preferredHeight, Math.max(180, spaceBelow))}px`
      }

      panel.style.top = `${Math.round(top)}px`
      panel.style.left = `${Math.round(left)}px`
      panel.style.right = 'auto'
      panel.style.bottom = 'auto'
      panel.style.width = `${Math.round(panelWidth)}px`
    }

    if (!isNotificationsOpen) {
      document.body.classList.remove('is-notif-open')
      clearPosition()
      return undefined
    }

    if (isCompact()) {
      document.body.classList.add('is-notif-open')
      requestAnimationFrame(positionPanel)
      window.addEventListener('resize', positionPanel)
      window.addEventListener('scroll', positionPanel, true)
      return () => {
        document.body.classList.remove('is-notif-open')
        clearPosition()
        window.removeEventListener('resize', positionPanel)
        window.removeEventListener('scroll', positionPanel, true)
      }
    }

    document.body.classList.remove('is-notif-open')
    clearPosition()
    return undefined
  }, [isNotificationsOpen])

  const liveItemsCount = useMemo(
    () => liveFuentes.reduce((acc, f) => acc + (f.items?.length || 0), 0),
    [liveFuentes],
  )

  const unreadPersisted = useMemo(
    () => notifications.filter((n) => !n.leida).length,
    [notifications],
  )

  const unreadCount = useMemo(
    () => unreadPersisted + liveItemsCount,
    [unreadPersisted, liveItemsCount],
  )

  const markNotificationRead = async (n) => {
    if (n.leida) return
    try {
      await api.post(`notificaciones/${n.id}/marcar_leida/`)
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, leida: true } : item)),
      )
    } catch {
      /* ignore */
    }
  }

  const markAllNotificationsRead = async () => {
    try {
      await api.post('notificaciones/marcar_todas_leidas/')
      setNotifications((prev) => prev.map((item) => ({ ...item, leida: true })))
    } catch {
      /* ignore */
    }
  }

  const showSsgg =
    can('contratos.view_contrato') ||
    can('contratos.view_rutatransporte') ||
    can('servicios.view_proveedor') ||
    can('servicios.view_facturaadquisicion') ||
    can('servicios.view_servicio') ||
    can('servicios.view_registropago') ||
    can('servicios.view_recepcionconforme') ||
    can('servicios.view_cdp') ||
    can([
      'documentacion_servicios.view_registroserviciodoc',
      'servicios.view_proveedor',
    ])

  const showOperaciones =
    can('funcionarios.view_funcionario') ||
    can('vehiculos.view_registromensual') ||
    can('servicios.view_servicio') ||
    can('prestamo_llaves.view_prestamo') ||
    can('prestamo_llaves.view_activo')

  const showSoporteTi =
    can('personal_ti.view_personalti') ||
    can('insights.view_dashboardmetric') ||
    can('core.view_breachreport') ||
    can('core.view_ciberseguridadplan') ||
    can('core.view_ciberseguridadcapacitacion')

  const showTesoreria = can('remuneraciones.view_remuneracion')
  const showMp = can('orden_compra.view_ordencompramp') || can('licitaciones.view_licitacionmp')
  const showEjecutivos =
    can('ejecutivos.add_gestionestablecimiento') ||
    can('ejecutivos.view_gestionestablecimiento') ||
    user?.is_superuser
  const showBienestar = can('bienestar.view_beneficio')

  return (
    <>
      <div
        className="notif-backdrop"
        hidden={!isNotificationsOpen}
        aria-hidden={!isNotificationsOpen}
        onClick={() => setIsNotificationsOpen(false)}
      />
      {user && user.acepto_terminos === false && (
        <Modal
          open
          onClose={() => {}}
          title="Tratamiento y Protección de Datos Personales"
          footer={
            <Button
              variant="primary"
              disabled={!termsAcceptedCheckbox || acceptLoading}
              onClick={async () => {
                setAcceptLoading(true)
                try {
                  await api.post('auth/me/aceptar-terminos/')
                  await checkUserStatus()
                } catch (err) {
                  console.error(err)
                } finally {
                  setAcceptLoading(false)
                }
              }}
            >
              {acceptLoading ? 'Guardando…' : 'Entendido, Aceptar y Continuar'}
            </Button>
          }
        >
          <p style={{ marginBottom: 12 }}>
            En conformidad a la Ley N° 21.719, informamos el tratamiento de datos personales en SGAF
            antes de continuar.
          </p>
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <input
                                    type="checkbox"
                                    checked={termsAcceptedCheckbox}
                                    onChange={(e) => setTermsAcceptedCheckbox(e.target.checked)}
                                />
            <span>Declaro estar informado sobre el tratamiento de mis datos.</span>
                            </label>
        </Modal>
      )}

      <AppShell
        brand={{
          dept: 'SGAF',
          sub: 'SLEP Iquique',
          logoSrc: '/assets/logo-gear.svg',
        }}
        footer={
          <div style={{ fontSize: 11, color: 'var(--sidebar-muted)' }}>
            <div>{isOnline ? 'En línea' : 'Sincronizando'} · v{APP_VERSION}</div>
            <a href="/legal" target="_blank" rel="noreferrer">
              Marco Legal
            </a>
          </div>
        }
        topbar={
          <ShellTopbar
            notifications={
              <div ref={notificationsRef} className="topbar__notifications">
                <NotificationBell
                  count={unreadCount}
                  open={isNotificationsOpen}
                  onToggle={() => setIsNotificationsOpen((v) => !v)}
                >
                  <div className="notif-panel__header">
                    <span className="notif-panel__title">Notificaciones</span>
                    <div className="notif-panel__header-actions">
                      {unreadPersisted > 0 ? (
                        <button
                          type="button"
                          className="notif-panel__action"
                          onClick={markAllNotificationsRead}
                        >
                          Marcar todas
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="notif-panel__close"
                        aria-label="Cerrar notificaciones"
                        onClick={() => setIsNotificationsOpen(false)}
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  </div>
                  {!liveItemsCount && !notifications.length ? (
                    <p className="notif-panel__empty">Sin notificaciones</p>
                  ) : (
                    <ul className="notif-panel__list">
                      {liveFuentes.flatMap((fuente) =>
                        (fuente.items || []).map((item) => (
                          <li key={`live-${fuente.codigo}-${item.id}`}>
                            <button
                              type="button"
                              className="notif-panel__item is-unread"
                              onClick={() => {
                                setIsNotificationsOpen(false)
                                if (item.link) navigate(item.link)
                              }}
                            >
                              <span className="notif-panel__item-body">
                                <div className="notif-panel__item-title">{item.titulo}</div>
                                {item.descripcion ? (
                                  <div className="notif-panel__item-desc">{item.descripcion}</div>
                                ) : null}
                              </span>
                              {item.tiempo ? (
                                <span className="notif-panel__item-time">{item.tiempo}</span>
                              ) : null}
                            </button>
                          </li>
                        )),
                      )}
                      {notifications.slice(0, 8).map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={`notif-panel__item${n.leida ? '' : ' is-unread'}`}
                            onClick={async () => {
                              await markNotificationRead(n)
                              setIsNotificationsOpen(false)
                              if (n.link) navigate(n.link)
                            }}
                          >
                            <span className="notif-panel__item-body">
                              <div className="notif-panel__item-title">
                                {n.titulo || 'Notificación'}
                              </div>
                              {n.mensaje ? (
                                <div className="notif-panel__item-desc">{n.mensaje}</div>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="notif-panel__footer">
                    <Link
                      to="/notificaciones"
                      onClick={() => setIsNotificationsOpen(false)}
                    >
                      Ver todas las notificaciones
                    </Link>
                  </div>
                </NotificationBell>
                    </div>
            }
            user={{ name: displayName, role: roleLabel, avatar: user?.avatar }}
            userMenu={
              <div ref={profileRef}>
                <Dropdown open={isProfileOpen}>
                  <button
                    type="button"
                    className="topbar__avatar-btn topbar__control"
                    aria-label={`Cuenta de ${displayName}`}
                    aria-expanded={isProfileOpen}
                    onClick={() => setIsProfileOpen((v) => !v)}
                  >
                    <Avatar
                      src={user?.avatar}
                      name={displayName}
                      size="sm"
                    />
                  </button>
                  <DropdownMenu>
                    <DropdownItem
                      onClick={() => {
                        setIsProfileOpen(false)
                        setIsProfileModalOpen(true)
                      }}
                    >
                      <Icon name="user" size={16} />
                      Mi perfil
                    </DropdownItem>
                    <DropdownItem
                      onClick={() => {
                        setIsProfileOpen(false)
                        setIsAboutModalOpen(true)
                      }}
                    >
                      <Icon name="info" size={16} />
                      Acerca del sistema
                    </DropdownItem>
                    {(can('auth.view_group') || user?.is_superuser) && (
                      <>
                        <DropdownDivider />
                        <DropdownItem as={Link} to="/admin/roles" onClick={() => setIsProfileOpen(false)}>
                          <Icon name="shield" size={16} />
                          Roles
                        </DropdownItem>
                        <DropdownItem as={Link} to="/admin/users" onClick={() => setIsProfileOpen(false)}>
                          <Icon name="funcionarios" size={16} />
                          Usuarios
                        </DropdownItem>
                        <DropdownItem as={Link} to="/admin/audit-log" onClick={() => setIsProfileOpen(false)}>
                          <Icon name="activity" size={16} />
                          Auditoría
                        </DropdownItem>
                        <DropdownItem as={Link} to="/admin/arco" onClick={() => setIsProfileOpen(false)}>
                          <Icon name="lock" size={16} />
                          ARCO
                        </DropdownItem>
                        <DropdownItem
                          as={Link}
                          to="/admin/personalizacion/login/backgrounds"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Icon name="design-system" size={16} />
                          Personalización
                        </DropdownItem>
                        <DropdownItem
                          as={Link}
                          to="/admin/notificaciones"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Icon name="bell" size={16} />
                          Notificaciones
                        </DropdownItem>
                        {(can('documentos.view_plantilladocumento') || user?.is_superuser) ? (
                          <DropdownItem
                            as={Link}
                            to="/admin/documentos"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <Icon name="procedimientos" size={16} />
                            Plantillas de documentos
                          </DropdownItem>
                        ) : null}
                      </>
                    )}
                    <DropdownDivider />
                    <DropdownItem
                      danger
                      onClick={() => {
                        setIsProfileOpen(false)
                        logout()
                        navigate('/login')
                      }}
                    >
                      <Icon name="external" size={16} />
                      Cerrar sesión
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </div>
            }
          />
        }
        nav={({ collapsed, closeDrawer, openAccordion, toggleAccordion }) => (
          <>
            <NavItem to="/" icon="home" label="Inicio" end onClick={closeDrawer} />
            <NavItem to="/tickets" icon="help-circle" label="Mesa de Ayuda" onClick={closeDrawer} />
            {can('establecimientos.view_establecimiento') && (
              <NavItem to="/establishments" icon="establecimientos" label="Establecimientos" onClick={closeDrawer} />
            )}
            {(can('solicitudes_reservas.view_solicitudreserva') ||
              can('solicitudes_reservas.can_view_calendar')) && (
              <NavItem to="/reservas" icon="reservas" label="Reservas" onClick={closeDrawer} />
            )}
            <NavItem to="/procedimientos" icon="procedimientos" label="Procedimientos" onClick={closeDrawer} />

            {showTesoreria && (
              <NavItem to="/tesoreria" icon="banknote" label="Tesorería" end onClick={closeDrawer} />
            )}

            {showEjecutivos && (
              <NavItem
                to="/comunicaciones/ejecutivos"
                icon="user-check"
                label="Ejecutivos"
                onClick={closeDrawer}
              />
            )}

            {showMp && (
              <NavItem
                to="/mercado-publico"
                icon="compras"
                label="Mercado Público"
                end
                onClick={closeDrawer}
              />
            )}

            {showBienestar && (
              <NavItem to="/bienestar" icon="heart" label="Bienestar" end onClick={closeDrawer} />
            )}

            {showSsgg && (
              <NavAccordion
                id="ssgg"
                label="SSGG"
                icon="building"
                open={openAccordion === 'ssgg'}
                onToggle={toggleAccordion}
                collapsed={collapsed}
              >
                {can('contratos.view_contrato') && (
                  <NavItem
                    to="/contracts"
                    icon="contratos"
                    label="Contratos"
                    isActive={isContractsNavActive}
                    onClick={closeDrawer}
                  />
                )}
                {can('servicios.view_proveedor') && (
                  <NavItem to="/services/providers" icon="proveedores" label="Proveedores" onClick={closeDrawer} />
                )}
                {can('servicios.view_facturaadquisicion') && (
                  <NavItem to="/services/adquisiciones" icon="receipt" label="Recepciones" onClick={closeDrawer} />
                )}
                {can('servicios.view_servicio') && (
                  <NavItem to="/services" icon="servicios" label="Servicios" end onClick={closeDrawer} />
                )}
                {can(['servicios.view_registropago', 'servicios.view_recepcionconforme']) && (
                  <NavItem to="/services/payments" icon="credit-card" label="Pagos" onClick={closeDrawer} />
                )}
                {can([
                  'documentacion_servicios.view_registroserviciodoc',
                  'servicios.view_proveedor',
                ]) && (
                  <NavItem
                    to="/services/documentacion"
                    icon="file"
                    label="Documentación"
                    onClick={closeDrawer}
                  />
                )}
              </NavAccordion>
            )}

            {showOperaciones && (
              <NavAccordion
                id="operaciones"
                label="Operaciones"
                icon="wrench"
                open={openAccordion === 'operaciones'}
                onToggle={toggleAccordion}
                collapsed={collapsed}
              >
                {can('funcionarios.view_funcionario') && (
                  <NavItem to="/funcionarios" icon="funcionarios" label="Funcionarios" onClick={closeDrawer} />
                )}
                {can('vehiculos.view_registromensual') && (
                  <NavItem to="/vehiculos" icon="car" label="Vehículos" onClick={closeDrawer} />
                )}
                {can('servicios.view_servicio') && (
                  <NavItem to="/telecomunicaciones" icon="telefonos" label="Teléfonos" onClick={closeDrawer} />
                )}
                {(can('prestamo_llaves.view_prestamo') || can('prestamo_llaves.view_activo')) && (
                  <NavItem
                    to={can('prestamo_llaves.view_prestamo') ? '/loans' : '/keys'}
                    icon="key"
                    label="Préstamos"
                    onClick={closeDrawer}
                  />
                )}
              </NavAccordion>
            )}

            {showSoporteTi && (
              <NavAccordion
                id="soporte-ti"
                label="Soporte TI"
                icon="monitor"
                open={openAccordion === 'soporte-ti'}
                onToggle={toggleAccordion}
                collapsed={collapsed}
              >
                {can('personal_ti.view_personalti') && (
                  <NavItem to="/personal-ti" icon="user-cog" label="Personal TI" onClick={closeDrawer} />
                )}
                {(can('core.view_breachreport') ||
                  can('core.view_ciberseguridadplan') ||
                  can('core.view_ciberseguridadcapacitacion')) && (
                  <NavItem to="/ciberseguridad" icon="shield" label="Ciberseguridad" onClick={closeDrawer} />
                )}
                {can('insights.view_dashboardmetric') && (
                  <NavItem to="/insights" icon="chart-bar" label="Indicadores" onClick={closeDrawer} />
                )}
              </NavAccordion>
            )}
          </>
        )}
      >
        <Outlet />
      </AppShell>

                <UserProfileModal
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        version={APP_VERSION}
      />
    </>
  )
}

export default Layout
