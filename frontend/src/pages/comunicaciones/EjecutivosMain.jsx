import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import { PageHeader } from '@slep/ui'
import AdminAsignaciones from './AdminAsignaciones'
import EjecutivoDashboard from './EjecutivosDashboard'
import MonitoreoKPI from './MonitoreoKPI'
import AdminGestionesGlobal from './AdminGestionesGlobal'

const ADMIN_TABS = [
  { id: 'kpi', label: 'Monitoreo KPI' },
  { id: 'global', label: 'Todas las gestiones' },
  { id: 'asignaciones', label: 'Asignaciones' },
  { id: 'mis_establecimientos', label: 'Mis establecimientos' },
]

const EjecutivosMain = () => {
  const { user } = useAuth()
  const { can } = usePermission()

  const isAdmin =
    user?.is_superuser ||
    can('ejecutivos.add_asignacionejecutivo') ||
    user?.groups?.includes('Administrador Comunicaciones')

  const availableTabs = useMemo(
    () => (isAdmin ? ADMIN_TABS : [{ id: 'mis_establecimientos', label: 'Mis establecimientos' }]),
    [isAdmin],
  )

  const [activeTab, setActiveTab] = useState(
    isAdmin ? 'kpi' : 'mis_establecimientos',
  )

  return (
    <div className="page" data-od-id="comunicaciones-ejecutivos-page" data-fill-viewport>
      <PageHeader
        icon="user-check"
        title="Ejecutivos de acompañamiento"
        description="Gestión y seguimiento de establecimientos"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Ejecutivos de acompañamiento' },
        ]}
        linkComponent={Link}
      />

      {availableTabs.length > 1 ? (
        <div className="tabs">
          <ul className="tabs__list" role="tablist" aria-label="Secciones de ejecutivos de acompañamiento">
            {availableTabs.map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  role="tab"
                  id={`com-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`com-panel-${tab.id}`}
                  className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        id={`com-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`com-tab-${activeTab}`}
        className="tabs__panel is-active comunicaciones-tab-panel"
      >
        {isAdmin && activeTab === 'kpi' ? <MonitoreoKPI /> : null}
        {isAdmin && activeTab === 'global' ? <AdminGestionesGlobal /> : null}
        {isAdmin && activeTab === 'asignaciones' ? <AdminAsignaciones /> : null}
        {(!isAdmin || activeTab === 'mis_establecimientos') ? (
          <EjecutivoDashboard />
        ) : null}
      </div>
    </div>
  )
}

export default EjecutivosMain
