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
  Icon
} from '@slep/ui'

const formatDateParts = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return {
    day: date.toLocaleDateString('es-CL'),
    time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  }
}

const LoanHistory = () => {
  const navigate = useNavigate()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const { notify } = useNotify()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [ordering, setOrdering] = useState('-fecha_prestamo')

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  const debouncedSearch = useDebouncedValue(searchQuery)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const fetchLoans = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        search: debouncedSearch,
        ordering,
        page_size: pageSize,
      }

      if (statusFilter === 'active') {
        params.fecha_devolucion__isnull = 'true'
      } else if (statusFilter === 'returned') {
        params.fecha_devolucion__isnull = 'false'
      }

      const response = await api.get('prestamos/', { params })
      setLoans(response.data.results || [])
      setTotalCount(response.data.count || 0)
    } catch (error) {
      console.error('Error fetching history:', error)
      setLoans([])
      notify({ variant: 'danger', text: 'Error al cargar el historial.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, statusFilter, ordering, pageSize])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, ordering, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setOrdering('-fecha_prestamo')
    setCurrentPage(1)
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (ordering !== '-fecha_prestamo' ? 1 : 0)

  const columns = useMemo(
    () => [
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (loan) =>
          loan.fecha_devolucion ? (
            <Badge variant="success">Devuelto</Badge>
          ) : (
            <Badge variant="accent">Activo</Badge>
          ),
      },
      {
        key: 'activo',
        header: 'Activo',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (loan) => {
          const activo = loan.activo_obj || loan.llave_obj
          return (
            <div className="contracts-cat">
              <strong>{activo?.nombre || '—'}</strong>
              <span>{activo?.establecimiento_nombre || '—'}</span>
            </div>
          )
        },
      },
      {
        key: 'responsable',
        header: 'Responsable',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (loan) => (
          <div className="contracts-cat">
            <strong>
              {loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}
            </strong>
            <span>RUT: {loan.solicitante_obj?.rut || 'Sin RUT'}</span>
          </div>
        ),
      },
      {
        key: 'observacion',
        header: 'Observación',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (loan) => (
          <span title={loan.observacion || ''}>{loan.observacion || '—'}</span>
        ),
      },
      {
        key: 'fecha_prestamo',
        header: 'Préstamo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (loan) => {
          const d = formatDateParts(loan.fecha_prestamo)
          if (!d) return '—'
          return (
            <div className="contracts-cat">
              <strong>{d.day}</strong>
              <span>{d.time} hrs</span>
            </div>
          )
        },
      },
      {
        key: 'fecha_devolucion',
        header: 'Devolución',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (loan) => {
          const d = formatDateParts(loan.fecha_devolucion)
          if (!d) return '—'
          return (
            <div className="contracts-cat">
              <strong>{d.day}</strong>
              <span>{d.time} hrs</span>
            </div>
          )
        },
      },
    ],
    [],
  )

  return (
    <div
      className="page"
      data-od-id="loan-history-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="key"
        title="Historial de préstamos"
        description="Registro completo de movimientos y activos"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Préstamos', to: '/loans' },
          { label: 'Historial' },
        ]}
        linkComponent={Link}
        split
        actions={
          <Button variant="quiet" size="sm" onClick={() => navigate('/loans')}>
            Volver a préstamos
          </Button>
        }
      />

      

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <>
            <Field label="Estado" htmlFor="hist-status">
              <Select
                id="hist-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="returned">Devueltos</option>
              </Select>
            </Field>
            <Field label="Orden" htmlFor="hist-order">
              <Select
                id="hist-order"
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
              >
                <option value="-fecha_prestamo">Más recientes</option>
                <option value="fecha_prestamo">Más antiguos</option>
                <option value="activo__nombre">Activo</option>
                <option value="solicitante__nombre">Responsable</option>
              </Select>
            </Field>
          </>
        }
      >
        <Field label="Buscar" htmlFor="hist-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="hist-q"
              type="search"
              placeholder="Activo, establecimiento o responsable…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={loans}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin resultados"
        emptyDescription="No se encontraron registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="loan-history-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Historial</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />
    </div>
  )
}

export default LoanHistory
