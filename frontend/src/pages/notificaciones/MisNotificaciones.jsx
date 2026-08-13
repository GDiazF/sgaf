import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Icon,
} from '@slep/ui'

function formatFecha(iso) {
  if (!iso) return { day: '—', time: '' }
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('es-CL'),
    time: d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  }
}

function refreshBell() {
  window.dispatchEvent(new CustomEvent('refresh-notifications'))
}

export default function MisNotificaciones() {
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [leidaFilter, setLeidaFilter] = useState('all')
  const [markingAll, setMarkingAll] = useState(false)

  const debouncedSearch = useDebouncedValue(searchQuery)

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

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        ordering: '-fecha_creacion',
      }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      if (leidaFilter === 'unread') params.leida = 'false'
      if (leidaFilter === 'read') params.leida = 'true'

      const res = await api.get('notificaciones/', { params })
      setRows(res.data.results || res.data || [])
      setTotalCount(res.data.count ?? (res.data.results || res.data || []).length)
    } catch (err) {
      console.error(err)
      notify({ variant: 'danger', text: 'No se pudieron cargar las notificaciones.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, debouncedSearch, leidaFilter, notify])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, leidaFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setLeidaFilter('all')
    setCurrentPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (searchQuery.trim()) n += 1
    if (leidaFilter !== 'all') n += 1
    return n
  }, [searchQuery, leidaFilter])

  const markOne = async (row) => {
    if (!row.leida) {
      try {
        await api.post(`notificaciones/${row.id}/marcar_leida/`)
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, leida: true } : r)))
        refreshBell()
      } catch {
        /* ignore */
      }
    }
    if (row.link) navigate(row.link)
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    try {
      await api.post('notificaciones/marcar_todas_leidas/')
      setRows((prev) => prev.map((r) => ({ ...r, leida: true })))
      refreshBell()
      notify({ variant: 'success', text: 'Todas marcadas como leídas.' })
    } catch {
      notify({ variant: 'danger', text: 'No se pudieron marcar como leídas.' })
    } finally {
      setMarkingAll(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        render: (row) => (
          <Badge variant={row.leida ? 'neutral' : 'accent'} dot>
            {row.leida ? 'Leída' : 'Nueva'}
          </Badge>
        ),
      },
      {
        key: 'titulo',
        header: 'Notificación',
        className: 'col--primary',
        cardRole: 'title',
        render: (row) => (
          <div className="contracts-cat">
            <strong>{row.titulo || 'Sin título'}</strong>
            {row.mensaje ? <span>{row.mensaje}</span> : null}
          </div>
        ),
      },
      {
        key: 'modulo',
        header: 'Módulo',
        className: 'col--secondary',
        cardRole: 'subtitle',
        render: (row) => row.modulo || '—',
      },
      {
        key: 'fecha',
        header: 'Fecha',
        render: (row) => {
          const f = formatFecha(row.fecha_creacion)
          return (
            <span>
              {f.day}
              {f.time ? ` · ${f.time}` : ''}
            </span>
          )
        },
      },
      {
        key: 'acciones',
        header: 'Acciones',
        className: 'col--actions',
        render: (row) => (
          <Button size="sm" variant="secondary" onClick={() => markOne(row)}>
            {row.link ? 'Abrir' : row.leida ? 'Ver' : 'Marcar leída'}
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div
      className="page"
      data-od-id="mis-notificaciones-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="bell"
        title="Mis notificaciones"
        description="Historial de avisos de campana. Las colas en vivo (p. ej. reservas pendientes) no aparecen aquí."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Mis notificaciones' },
        ]}
        linkComponent={Link}
        split
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={markAllRead}
            loading={markingAll}
            disabled={markingAll}
          >
            Marcar todas como leídas
          </Button>
        }
      />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <Field label="Estado" htmlFor="notif-leida">
            <Select
              id="notif-leida"
              value={leidaFilter}
              onChange={(e) => setLeidaFilter(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="unread">No leídas</option>
              <option value="read">Leídas</option>
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="notif-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="notif-q"
              type="search"
              placeholder="Título, mensaje o módulo…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        fillViewport={!isNarrow}
        totalCount={totalCount}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setCurrentPage(1)
        }}
        emptyTitle="Sin notificaciones"
        emptyDescription={
          activeFilterCount
            ? 'No hay resultados con los filtros actuales.'
            : 'Cuando recibas avisos de campana, aparecerán aquí.'
        }
        emptyAction={
          activeFilterCount ? (
            <Button variant="quiet" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null
        }
        onRowClick={markOne}
      />
    </div>
  )
}
