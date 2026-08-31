import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { StatusBadge, PriorityBadge } from './ticketBadges'
import TicketCreateModal from './TicketCreateModal'
import CategoriesModal from './CategoriesModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  MetricStrip,
  Icon,
} from '@slep/ui'

const TicketsDashboard = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const canManageCategories =
    user?.is_superuser || user?.user_permissions?.includes('tickets.add_ticketcategory')

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalResults, setTotalResults] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const debouncedSearch = useDebouncedValue(searchTerm)

  useEffect(() => {
    const nuevo = searchParams.get('nuevo') === '1'
    const cats = searchParams.get('categorias') === '1'
    if (!nuevo && !cats) return
    if (nuevo) setCreateOpen(true)
    if (cats) setCategoriesOpen(true)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    fetchTickets(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, pageSize])

  const fetchTickets = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
      }
      if (statusFilter !== 'ALL') params.estado = statusFilter
      if (debouncedSearch) params.search = debouncedSearch

      const [ticketsRes, statsRes] = await Promise.all([
        api.get('tickets/tickets/', { params }),
        api.get('tickets/tickets/estadisticas/'),
      ])

      if (ticketsRes.data.results) {
        setTickets(ticketsRes.data.results)
        setTotalResults(ticketsRes.data.count || 0)
      } else {
        const list = ticketsRes.data || []
        setTickets(list)
        setTotalResults(list.length)
      }
      setStats(statsRes.data)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching tickets:', error)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setCurrentPage(1)
  }

  const metrics = [
    {
      label: 'Abiertos',
      value: stats?.abiertos ?? 0,
      hint: 'Pendientes',
      active: statusFilter === 'ABIERTO',
      onClick: () => setStatusFilter((s) => (s === 'ABIERTO' ? 'ALL' : 'ABIERTO')),
    },
    {
      label: 'En progreso',
      value: stats?.en_progreso ?? 0,
      active: statusFilter === 'EN_PROGRESO',
      onClick: () => setStatusFilter((s) => (s === 'EN_PROGRESO' ? 'ALL' : 'EN_PROGRESO')),
    },
    {
      label: 'Resueltos',
      value: stats?.resueltos ?? 0,
      active: statusFilter === 'RESUELTO',
      onClick: () => setStatusFilter((s) => (s === 'RESUELTO' ? 'ALL' : 'RESUELTO')),
    },
    {
      label: 'Total',
      value: stats?.total ?? totalResults ?? 0,
      active: statusFilter === 'ALL',
      onClick: () => setStatusFilter('ALL'),
    },
  ]

  const columns = useMemo(
    () => [
      {
        key: 'correlativo',
        header: 'Folio',
        className: 'col--secondary mono',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => <span className="mono">{item.correlativo}</span>,
      },
      {
        key: 'titulo',
        header: 'Asunto',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <button
            type="button"
            className="table-link"
            onClick={() => navigate(`/tickets/${item.id}`)}
          >
            {item.titulo || '—'}
          </button>
        ),
      },
      {
        key: 'solicitante',
        header: 'Solicitante',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.creado_por_obj?.username || '—',
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <span className="line-clamp-2">{item.descripcion || '—'}</span>
        ),
      },
      {
        key: 'categoria',
        header: 'Categoría',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.categoria_obj?.nombre || '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => <StatusBadge status={item.estado} />,
      },
      {
        key: 'prioridad',
        header: 'Prioridad',
        cardRole: 'field',
        priority: 2,
        render: (item) => <PriorityBadge priority={item.prioridad} />,
      },
      {
        key: 'fecha_creacion',
        header: 'Creado',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) =>
          item.fecha_creacion
            ? new Date(item.fecha_creacion).toLocaleDateString('es-CL')
            : '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/tickets/${item.id}`)}
            >
              Ver
            </Button>
          </div>
        ),
      },
    ],
    [navigate],
  )

  return (
    <div className="page" data-od-id="tickets-list-page" data-fill-viewport>
      <PageHeader
        icon="help-circle"
        title="Mesa de ayuda"
        description="Gestiona solicitudes de soporte técnico y administrativo"
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Mesa de ayuda' }]}
        linkComponent={Link}
        split
        actions={
          <>
            {canManageCategories ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCategoriesOpen(true)}
              >
                Categorías
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size="sm" /> Crear ticket
            </Button>
          </>
        }
      />

      <MetricStrip items={metrics} />

      <FiltersBar onSearch={() => fetchTickets(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="ticket-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="ticket-q"
              type="search"
              placeholder="Folio o título…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={tickets}
        loading={loading}
        totalCount={totalResults}
        emptyTitle="Sin tickets"
        emptyDescription="No hay solicitudes con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="tickets-page-size"
        onPageChange={(page) => fetchTickets(page)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Ver',
            onClick: () => navigate(`/tickets/${item.id}`),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalResults} registros</Badge>
          </div>
        }
      />

      <TicketCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(ticket) => {
          if (ticket?.id) navigate(`/tickets/${ticket.id}`)
          else fetchTickets(1)
        }}
      />

      <CategoriesModal
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
      />
    </div>
  )
}

export default TicketsDashboard
