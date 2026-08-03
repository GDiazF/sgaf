import React, { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import {
  loadMpFavorites,
  saveMpFavorites,
  toggleMpFavorite,
  favoritesCount,
} from './mpFavorites'
import {
  LicitacionDetailContent,
  LicitacionDetailSubheader,
  LicitacionResponsableMeta,
} from './LicitacionDetailContent'
import { OCDetailContent } from './OCDetailContent'
import {
  DataTable,
  MetricStrip,
  Alert,
  Badge,
  Button,
  Modal,
  Icon,
} from '@slep/ui'

const DEFAULT_TICKET = 'F23CBE04-6C9D-40C4-985C-7F5FCD6070B6'

/**
 * Listado unificado de favoritos OC + Licitaciones.
 */
const FavoritosPanel = ({ isNarrow = false }) => {
  const [store, setStore] = useState(loadMpFavorites)
  const [filter, setFilter] = useState('todos') // todos | oc | licitaciones
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [selected, setSelected] = useState(null)
  const [detailType, setDetailType] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const ticket = useMemo(
    () => localStorage.getItem('mp_ticket') || DEFAULT_TICKET,
    [],
  )

  useEffect(() => {
    saveMpFavorites(store)
  }, [store])

  const refresh = useCallback(() => setStore(loadMpFavorites()), [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'mp_favorites' || e.key === 'slep_following') refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const rows = useMemo(() => {
    const oc = (store.oc || []).map((item) => ({
      ...item,
      _favType: 'oc',
      _tipoLabel: 'Orden de compra',
    }))
    const lics = (store.licitaciones || []).map((item) => ({
      ...item,
      _favType: 'licitacion',
      _tipoLabel: 'Licitación',
    }))
    if (filter === 'oc') return oc
    if (filter === 'licitaciones') return lics
    return [...lics, ...oc]
  }, [store, filter])

  useEffect(() => {
    setPage(1)
  }, [filter, rows.length])

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, page, pageSize])

  const metrics = useMemo(
    () => [
      {
        label: 'Todos',
        value: favoritesCount(store),
        hint: 'Favoritos',
        active: filter === 'todos',
        onClick: () => setFilter('todos'),
      },
      {
        label: 'Licitaciones',
        value: store.licitaciones?.length || 0,
        hint: 'Seguidas',
        active: filter === 'licitaciones',
        onClick: () => setFilter('licitaciones'),
      },
      {
        label: 'Órdenes OC',
        value: store.oc?.length || 0,
        hint: 'Seguidas',
        active: filter === 'oc',
        onClick: () => setFilter('oc'),
      },
    ],
    [store, filter],
  )

  const removeFav = (item) => {
    const type = item._favType === 'oc' ? 'oc' : 'licitaciones'
    setStore((prev) => toggleMpFavorite(prev, type, item))
  }

  const openDetail = async (item) => {
    const type = item._favType === 'oc' ? 'oc' : 'licitacion'
    setDetailType(type)
    setSelected(item)
    setDetailLoading(true)
    try {
      const endpoint =
        type === 'oc' ? 'orden_compra/visor/' : 'licitaciones/visor/'
      const response = await api.get(endpoint, {
        params: { codigo: item.CodigoExterno, ticket, force: type === 'oc' || undefined },
        timeout: 60000,
      })
      const data = response.data
      const detail = Array.isArray(data)
        ? data[0]
        : data?.resultados?.[0] || data
      if (detail) setSelected({ ...detail, _favType: item._favType, _has_full_detail: true })
    } catch (err) {
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant={item._favType === 'oc' ? 'accent' : 'success'}>
            {item._tipoLabel}
          </Badge>
        ),
      },
      {
        key: 'codigo',
        header: 'Código',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <strong style={{ fontFamily: 'var(--font-mono, monospace)' }}>
            {item.CodigoExterno}
          </strong>
        ),
      },
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => item.Nombre || '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--tablet-hide',
        cardRole: 'field',
        render: (item) => item.Estado || '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => openDetail(item)}
            >
              <Icon name="eye" size="sm" /> Ver
            </Button>
            <Button
              variant="quiet"
              size="sm"
              title="Quitar de favoritos"
              onClick={() => removeFav(item)}
            >
              <Icon name="star" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <div className="mp-panel-meta">
        <p>Favoritos guardados en este navegador (no sincronizan entre equipos).</p>
      </div>

      <MetricStrip items={metrics} />

      <DataTable
        columns={columns}
        rows={paged}
        totalCount={rows.length}
        emptyTitle="Sin favoritos"
        emptyDescription="Marque con estrella una OC o licitación desde su visor para verla aquí."
        fillViewport={!isNarrow}
        page={page}
        pageSize={pageSize}
        pageSizeId="mp-fav-page-size"
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        getRowKey={(row) => `${row._favType}-${row.CodigoExterno}`}
        mobileCardActions={(item) => ({
          primary: { label: 'Ver', onClick: () => openDetail(item) },
          secondary: { label: 'Quitar', onClick: () => removeFav(item) },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Favoritos</span>
            <Badge variant="accent">{rows.length}</Badge>
          </div>
        }
      />

      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null)
          setDetailType(null)
        }}
        size="lg"
        title={selected?.Nombre || selected?.CodigoExterno || 'Detalle'}
        subheader={
          detailType === 'licitacion' && selected && !detailLoading ? (
            <LicitacionDetailSubheader lic={selected} />
          ) : (
            selected?.CodigoExterno
          )
        }
        headerActions={
          selected && detailType === 'oc' ? (
            <Badge variant="accent">OC</Badge>
          ) : null
        }
        footer={
          <>
            {detailType === 'licitacion' && selected && !detailLoading ? (
              <LicitacionResponsableMeta lic={selected} />
            ) : null}
            <Button
              variant="quiet"
              onClick={() => selected && removeFav(selected)}
            >
              <Icon name="star" size="sm" /> Quitar favorito
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(null)
                setDetailType(null)
              }}
            >
              Cerrar
            </Button>
          </>
        }
      >
        {detailLoading ? (
          <Alert variant="info" title="Cargando">
            Obteniendo ficha desde Mercado Público…
          </Alert>
        ) : selected && detailType === 'licitacion' ? (
          <LicitacionDetailContent lic={selected} />
        ) : selected && detailType === 'oc' ? (
          <OCDetailContent oc={selected} />
        ) : null}
      </Modal>
    </>
  )
}

export default FavoritosPanel
