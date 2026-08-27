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
  Alert,
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

/** Rutas hermanas bajo /contracts que no deben marcar "Contratos" como activo. */
const CONTRACTS_SIBLING = new Set(['servicios', 'ruta', 'periodo'])

function isContractsNavActive({ pathname }) {
  if (pathname === '/contracts') return true
  if (!pathname.startsWith('/contracts/')) return false
  const segment = pathname.split('/')[2]
  return Boolean(segment) && !CONTRACTS_SIBLING.has(segment)
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
  const [pendingReservas, setPendingReservas] = useState([])
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
    const canApprove =
      user?.is_superuser ||
      user?.user_permissions?.includes('solicitudes_reservas.change_solicitudreserva')
    if (!canApprove) return undefined

        const fetchPending = async () => {
            try {
        const res = await api.get('reservas/solicitudes/', { params: { estado: 'PENDIENTE' } })
        setPendingReservas(res.data.results || res.data || [])
      } catch {
        /* ignore */
      }
    }
    fetchPending()
    const interval = setInterval(fetchPending, 60000)
    const handleRefresh = () => fetchPending()
    window.addEventListener('refresh-notifications', handleRefresh)
        return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-notifications', handleRefresh)
    }
  }, [user])

    useEffect(() => {
    if (!user) return undefined
        const fetchNotifications = async () => {
            try {
        const res = await api.get('notificaciones/')
        let fetched = res.data.results || res.data || []
        // Notificaciones FIRMA no se auto-marcan al visitar /firma (persisten hasta firmar/rechazar)
        const match = fetched.filter(
          (n) =>
            !n.leida &&
            n.tipo !== 'FIRMA' &&
            n.link &&
            (n.link === location.pathname || n.link.split('?')[0] === location.pathname),
        )
        if (match.length) {
          await Promise.all(match.map((n) => api.post(`notificaciones/${n.id}/marcar_leida/`)))
          const ids = new Set(match.map((n) => n.id))
          fetched = fetched.map((n) => (ids.has(n.id) ? { ...n, leida: true } : n))
        }
        setNotifications(fetched)
      } catch {
        /* ignore */
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    const handleRefresh = () => fetchNotifications()
    window.addEventListener('refresh-notifications', handleRefresh)
    return () => {
      clearInterval(interval)
      window.removeEventListener('refresh-notifications', handleRefresh)
    }
  }, [user, location.pathname])

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

  const unreadCount = useMemo(
    () =>
      (notifications.filter((n) => !n.leida).length || 0) +
      (pendingReservas.length || 0),
    [notifications, pendingReservas],
  )

  const showSsgg =
    can('contratos.view_contrato') ||
    can('contratos.view_rutatransporte') ||
    can('servicios.view_proveedor') ||
    can('servicios.view_facturaadquisicion') ||
    can('servicios.view_servicio') ||
    can('servicios.view_registropago') ||
    can('servicios.view_recepcionconforme') ||
    can('servicios.view_cdp')

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
          showClose={false}
          size="lg"
          title="Tratamiento y Protección de sus Datos Personales"
          subheader="Servicio Local de Educación Pública (SLEP) Iquique"
          className="terms-consent-modal"
          footer={
            <div className="terms-consent__footer">
              <label className="terms-consent__check check">
                <input
                  type="checkbox"
                  className="no-global"
                  checked={termsAcceptedCheckbox}
                  onChange={(e) => setTermsAcceptedCheckbox(e.target.checked)}
                />
                <span>
                  <span className="terms-consent__check-title">Declaro estar informado</span>
                  <span className="terms-consent__check-desc">
                    Confirmo que he leído y comprendo cómo se tratan mis datos y las medidas de
                    seguridad del SGAF en cumplimiento con la Ley N° 21.719.
                  </span>
                </span>
              </label>
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
            </div>
          }
        >
          <div className="terms-consent">
            <Alert variant="info" title="Importante">
              En conformidad a la <strong>Ley N° 21.719</strong> sobre Protección de Datos
              Personales en Chile (Diario Oficial, 13-Dic-2024), requerimos informarle de manera
              transparente sobre el uso de su información en el sistema SGAF antes de iniciar su
              sesión.
            </Alert>

            <section className="terms-consent__section">
              <h3 className="terms-consent__heading">1. Finalidad y licitud del tratamiento</h3>
              <p>
                El SLEP Iquique, en su calidad de órgano de la Administración del Estado, recopila
                y procesa sus datos personales (RUT, nombre completo, cargo, anexo telefónico,
                correo institucional) exclusivamente para el cumplimiento de sus funciones legales
                y administrativas (ej: gestión de reservas, control de activos y préstamos de
                llaves). Su información no será comunicada ni cedida a terceros no autorizados.
              </p>
            </section>

            <section className="terms-consent__section">
              <h3 className="terms-consent__heading">2. Sus derechos ARCO y bloqueo temporal</h3>
              <p>
                Usted goza plenamente de los derechos de Acceso, Rectificación, Supresión,
                Oposición y Portabilidad. Asimismo, tiene derecho a solicitar el{' '}
                <strong>Bloqueo Temporal (Art. 8° ter)</strong> de sus datos mientras se tramita
                una rectificación o supresión. Puede ejercerlos en cualquier momento ingresando a
                la sección &quot;Mis Datos&quot; de su perfil.
              </p>
            </section>

            <section className="terms-consent__section">
              <h3 className="terms-consent__heading">3. Vía de reclamación</h3>
              <p>
                Si estima que el SLEP Iquique ha infringido sus derechos, puede interponer un
                reclamo de tutela ante la{' '}
                <strong>Agencia de Protección de Datos Personales (APDP)</strong> de conformidad
                al Artículo 41° de la ley.
              </p>
            </section>

            <p className="terms-consent__note">
              Para conocer en detalle las medidas de seguridad adoptadas (como el cifrado
              simétrico robusto de sus claves y MFA), puede leer la Política de Privacidad
              completa ingresando al pie de página del sistema.
            </p>
          </div>
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
                  {!pendingReservas.length && !notifications.length ? (
                    <p className="notif-panel__empty">Sin notificaciones</p>
                  ) : (
                    <ul className="notif-panel__list">
                      {pendingReservas.map((res) => {
                        const start = new Date(res.fecha_inicio)
                        const dateKey = Number.isNaN(start.getTime())
                          ? ''
                          : `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
                        const dateLabel = Number.isNaN(start.getTime())
                          ? ''
                          : start.toLocaleDateString('es-CL', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })
                        const timeLabel = Number.isNaN(start.getTime())
                          ? ''
                          : start.toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })
                        const desc = [
                          res.nombre_funcionario || 'Solicitante',
                          timeLabel,
                          res.recurso_nombre,
                        ]
                          .filter(Boolean)
                          .join(' · ')
                        return (
                          <li key={`res-${res.id}`}>
                            <button
                              type="button"
                              className="notif-panel__item is-unread"
                              onClick={() => {
                                setIsNotificationsOpen(false)
                                navigate(
                                  dateKey
                                    ? `/reservas?date=${dateKey}&highlight=${res.id}`
                                    : `/reservas?highlight=${res.id}`,
                                )
                              }}
                            >
                              <span className="notif-panel__item-body">
                                <div className="notif-panel__item-title">
                                  Reserva: {res.titulo || 'Sin título'}
                                </div>
                                <div className="notif-panel__item-desc">{desc}</div>
                              </span>
                              {dateLabel ? (
                                <span className="notif-panel__item-time">{dateLabel}</span>
                              ) : null}
                            </button>
                          </li>
                        )
                      })}
                      {notifications.slice(0, 8).map((n) => (
                        <li key={n.id}>
                          <button
                            type="button"
                            className={`notif-panel__item${n.leida ? '' : ' is-unread'}`}
                            onClick={async () => {
                              // FIRMA: navegar sin marcar leída ni borrar (queda hasta firmar/rechazar)
                              if (!n.leida && n.tipo !== 'FIRMA') {
                                try {
                                  await api.post(`notificaciones/${n.id}/marcar_leida/`)
                                  setNotifications((prev) =>
                                    prev.map((x) =>
                                      x.id === n.id ? { ...x, leida: true } : x,
                                    ),
                                  )
                                } catch {
                                  /* ignore */
                                }
                              }
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
                        {user?.puede_firmar && (
                          <>
                            <DropdownItem as={Link} to="/firma" onClick={() => setIsProfileOpen(false)}>
                              <Icon name="file-check" size={16} />
                              Bandeja de firmas
                            </DropdownItem>
                            <DropdownItem as={Link} to="/firma-prueba" onClick={() => setIsProfileOpen(false)}>
                              <Icon name="file-check" size={16} />
                              Firma digital (prueba)
                            </DropdownItem>
                          </>
                        )}
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
                          to="/admin/email-settings"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <Icon name="message" size={16} />
                          Email
                        </DropdownItem>
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
            {user?.puede_firmar && (
              <>
                <NavItem to="/firma" icon="file-check" label="Bandeja de firmas" onClick={closeDrawer} />
                <NavItem to="/firma-prueba" icon="file-check" label="Firma (prueba)" onClick={closeDrawer} />
              </>
            )}

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
                {can('contratos.view_rutatransporte') && (
                  <NavItem to="/contracts/servicios" icon="rutas" label="Gestión de Rutas" onClick={closeDrawer} />
                )}
                {can('servicios.view_proveedor') && (
                  <NavItem to="/services/providers" icon="proveedores" label="Proveedores" onClick={closeDrawer} />
                )}
                {can('servicios.view_facturaadquisicion') && (
                  <NavItem to="/services/adquisiciones" icon="receipt" label="Factura sin OC" onClick={closeDrawer} />
                )}
                {can('servicios.view_servicio') && (
                  <NavItem to="/services" icon="servicios" label="Servicios" end onClick={closeDrawer} />
                )}
                {can('servicios.view_registropago') && (
                  <NavItem to="/services/payments" icon="credit-card" label="Pagos" onClick={closeDrawer} />
                )}
                {can('servicios.view_recepcionconforme') && (
                  <NavItem to="/services/rc" icon="clipboard-check" label="Recepciones" onClick={closeDrawer} />
                )}
                {can('servicios.view_cdp') && (
                  <NavItem to="/services/cdp" icon="file-check" label="CDPs" onClick={closeDrawer} />
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
