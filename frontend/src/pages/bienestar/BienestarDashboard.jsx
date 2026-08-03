import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import BeneficiosPanel from './BeneficiosPanel'
import ConfigPanel from './ConfigPanel'
import { PageHeader } from '@slep/ui'

const BienestarDashboard = () => {
  const { can } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const canConfig =
    can('bienestar.add_beneficio') || can('bienestar.change_beneficio')

  const mainTab =
    canConfig && searchParams.get('tab') === 'config' ? 'config' : 'beneficios'

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const selectMainTab = (id) => {
    if (id === 'config' && canConfig) {
      setSearchParams({ tab: 'config' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  return (
    <div
      className="page"
      data-od-id="bienestar-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="heart"
        title="Bienestar"
        description="Beneficios, convenios y gestión de publicaciones · SLEP Iquique"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Bienestar' },
        ]}
        linkComponent={Link}
      />

      {canConfig ? (
        <div className="tabs">
          <ul className="tabs__list" role="tablist" aria-label="Secciones Bienestar">
            <li>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${mainTab === 'beneficios' ? ' is-active' : ''}`}
                aria-selected={mainTab === 'beneficios'}
                onClick={() => selectMainTab('beneficios')}
              >
                Beneficios
              </button>
            </li>
            <li>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${mainTab === 'config' ? ' is-active' : ''}`}
                aria-selected={mainTab === 'config'}
                onClick={() => selectMainTab('config')}
              >
                Configuración
              </button>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="tabs__panel is-active bienestar-tab-panel" role="tabpanel">
        {mainTab === 'config' && canConfig ? (
          <ConfigPanel isNarrow={isNarrow} />
        ) : (
          <BeneficiosPanel isNarrow={isNarrow} />
        )}
      </div>
    </div>
  )
}

export default BienestarDashboard
