import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BreachTab from './tabs/BreachTab'
import PlanesTab from './tabs/PlanesTab'
import CapacitacionesTab from './tabs/CapacitacionesTab'
import { PageHeader, EmptyState } from '@slep/ui'

const TABS = [
  {
    id: 'incidentes',
    label: 'Incidentes',
    can: (perms) => perms.includes('core.view_breachreport'),
  },
  {
    id: 'planes',
    label: 'SGSI y planes',
    can: (perms) => perms.includes('core.view_ciberseguridadplan'),
  },
  {
    id: 'capacitaciones',
    label: 'Capacitaciones',
    can: (perms) => perms.includes('core.view_ciberseguridadcapacitacion'),
  },
]

const CiberseguridadDashboard = () => {
  const { user } = useAuth()
  const permissions = user?.user_permissions || []

  const availableTabs = useMemo(
    () => TABS.filter((t) => t.can(permissions)),
    [permissions],
  )

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || 'incidentes')

  useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || 'incidentes')
    }
  }, [availableTabs, activeTab])

  return (
    <div className="page" data-od-id="ciberseguridad-page" data-fill-viewport>
      <PageHeader
        icon="shield"
        title="Ciberseguridad"
        description="Centro de operaciones y cumplimiento (Ley 21.663)"
        breadcrumbs={[{ label: 'Soporte TI' }, { label: 'Ciberseguridad' }]}
        linkComponent={Link}
      />

      {availableTabs.length === 0 ? (
        <EmptyState
          title="Sin acceso"
          description="No tenés permisos para ver módulos de ciberseguridad."
        />
      ) : (
        <>
          <div className="tabs cyber-tabs">
            <ul className="tabs__list" role="tablist" aria-label="Secciones de ciberseguridad">
              {availableTabs.map((tab) => (
                <li key={tab.id}>
                  <button
                    type="button"
                    role="tab"
                    id={`cyber-tab-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    aria-controls={`cyber-panel-${tab.id}`}
                    className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="tabs__panel is-active cyber-tabs__panel"
            role="tabpanel"
            id={`cyber-panel-${activeTab}`}
            aria-labelledby={`cyber-tab-${activeTab}`}
          >
            {activeTab === 'incidentes' ? <BreachTab user={user} /> : null}
            {activeTab === 'planes' ? <PlanesTab user={user} /> : null}
            {activeTab === 'capacitaciones' ? <CapacitacionesTab user={user} /> : null}
          </div>
        </>
      )}
    </div>
  )
}

export default CiberseguridadDashboard
