import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePermission } from '../../hooks/usePermission'
import OCPanel from './OCPanel'
import LicitacionesPanel from './LicitacionesPanel'
import FavoritosPanel from './FavoritosPanel'
import { favoritesCount, loadMpFavorites } from './mpFavorites'
import { PageHeader } from '@slep/ui'

const MercadoPublicoDashboard = () => {
  const { can } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()

  const canOC = can('orden_compra.view_ordencompramp')
  const canLics = can('licitaciones.view_licitacionmp')

  const tabFromUrl = searchParams.get('tab')
  const defaultTab = () => {
    if (tabFromUrl === 'favoritos') return 'favoritos'
    if (tabFromUrl === 'licitaciones' && canLics) return 'licitaciones'
    if (tabFromUrl === 'oc' && canOC) return 'oc'
    if (canOC) return 'oc'
    if (canLics) return 'licitaciones'
    return 'favoritos'
  }

  const [mainTab, setMainTab] = useState(defaultTab)
  const [favCount, setFavCount] = useState(() => favoritesCount(loadMpFavorites()))

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

  useEffect(() => {
    if (mainTab === 'oc' && !canOC) {
      setMainTab(canLics ? 'licitaciones' : 'favoritos')
    }
    if (mainTab === 'licitaciones' && !canLics) {
      setMainTab(canOC ? 'oc' : 'favoritos')
    }
  }, [canOC, canLics, mainTab])

  useEffect(() => {
    setFavCount(favoritesCount(loadMpFavorites()))
  }, [mainTab])

  const selectMainTab = (id) => {
    setMainTab(id)
    const map = { oc: 'oc', licitaciones: 'licitaciones', favoritos: 'favoritos' }
    setSearchParams({ tab: map[id] || 'oc' }, { replace: true })
  }

  const showMainTabs = canOC || canLics

  return (
    <div
      className="page"
      data-od-id="mercado-publico-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="compras"
        title="Mercado Público"
        description="Visor de órdenes de compra, licitaciones y favoritos · SLEP Iquique"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Mercado Público' },
        ]}
        linkComponent={Link}
      />

      {showMainTabs ? (
        <div className="tabs">
          <ul className="tabs__list" role="tablist" aria-label="Secciones Mercado Público">
            {canOC ? (
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${mainTab === 'oc' ? ' is-active' : ''}`}
                  aria-selected={mainTab === 'oc'}
                  onClick={() => selectMainTab('oc')}
                >
                  Visor OC
                </button>
              </li>
            ) : null}
            {canLics ? (
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${mainTab === 'licitaciones' ? ' is-active' : ''}`}
                  aria-selected={mainTab === 'licitaciones'}
                  onClick={() => selectMainTab('licitaciones')}
                >
                  Licitaciones
                </button>
              </li>
            ) : null}
            <li>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${mainTab === 'favoritos' ? ' is-active' : ''}`}
                aria-selected={mainTab === 'favoritos'}
                onClick={() => selectMainTab('favoritos')}
              >
                Favoritos{favCount > 0 ? ` (${favCount})` : ''}
              </button>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="tabs__panel is-active mp-tab-panel" role="tabpanel">
        {mainTab === 'favoritos' ? (
          <FavoritosPanel isNarrow={isNarrow} />
        ) : mainTab === 'licitaciones' && canLics ? (
          <LicitacionesPanel isNarrow={isNarrow} />
        ) : canOC ? (
          <OCPanel isNarrow={isNarrow} />
        ) : canLics ? (
          <LicitacionesPanel isNarrow={isNarrow} />
        ) : (
          <FavoritosPanel isNarrow={isNarrow} />
        )}
      </div>
    </div>
  )
}

export default MercadoPublicoDashboard
