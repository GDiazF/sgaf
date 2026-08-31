import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import ReturnLoanModal from '../../components/loans/ReturnLoanModal'
import TransferModal from '../../components/loans/TransferModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  MetricStrip,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Icon
} from '@slep/ui'

const formatLoanDate = (dateString) => {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return {
    day: date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
    time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  }
}

const LoansDashboard = () => {
  const navigate = useNavigate()
  const { can } = usePermission()

  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLoan, setSelectedLoan] = useState(null)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [returning, setReturning] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [totalAssets, setTotalAssets] = useState(0)
  const [ordering, setOrdering] = useState('-fecha_prestamo')
  const [searchQuery, setSearchQuery] = useState('')
  const { notify } = useNotify()

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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        search: debouncedSearch,
        active: 'true',
        ordering,
        page_size: pageSize,
      }
      const [loansRes, assetsRes] = await Promise.all([
        api.get('prestamos/', { params }),
        api.get('activos/'),
      ])

      setLoans(loansRes.data.results || [])
      setTotalCount(loansRes.data.count || 0)
      setTotalAssets(assetsRes.data.count || 0)
    } catch (error) {
      console.error('Error fetching loans:', error)
      setLoans([])
      notify({ variant: 'danger', text: 'Error al cargar préstamos activos.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, ordering, debouncedSearch, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, ordering, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setOrdering('-fecha_prestamo')
    setCurrentPage(1)
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) + (ordering !== '-fecha_prestamo' ? 1 : 0)

  const handleReturnClick = (loan) => {
    setSelectedLoan(loan)
    setShowReturnModal(true)
  }

  const handleTransferClick = (loan) => {
    setSelectedLoan(loan)
    setShowTransferModal(true)
  }

  const handleConfirmReturn = async (id) => {
    setReturning(true)
    try {
      await api.post(`prestamos/${id}/devolver/`)
      setShowReturnModal(false)
      setSelectedLoan(null)
      notify({ variant: 'success', text: 'Activo devuelto correctamente.' })
      await fetchData()
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al devolver el activo.' })
    } finally {
      setReturning(false)
    }
  }

  const metrics = useMemo(() => {
    const items = [
      {
        label: 'En circulación',
        value: totalCount,
      },
      {
        label: 'Total activos',
        value: totalAssets,
        ...(can('prestamo_llaves.view_activo')
          ? { onClick: () => navigate('/keys') }
          : {}),
      },
    ]
    if (can('prestamo_llaves.add_prestamo')) {
      items.unshift({
        label: 'Nuevo préstamo',
        value: '+',
        onClick: () => navigate('/loans/new'),
      })
    }
    return items
  }, [totalCount, totalAssets, can, navigate])

  const columns = useMemo(
    () => [
      {
        key: 'responsable',
        header: 'Responsable',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (loan) => {
          const isInternal = !!loan.solicitante_obj?.funcionario
          return (
            <div className="contracts-cat">
              <strong>
                {loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}
              </strong>
              <span>
                {loan.solicitante_obj?.rut || 'Sin RUT'} ·{' '}
                <Badge variant={isInternal ? 'accent' : 'neutral'}>
                  {isInternal ? 'Personal' : 'Externo'}
                </Badge>
              </span>
            </div>
          )
        },
      },
      {
        key: 'activo',
        header: 'Activo',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
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
        key: 'desde',
        header: 'Desde',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (loan) => {
          const d = formatLoanDate(loan.fecha_prestamo)
          return (
            <div className="contracts-cat">
              <strong>{d.day}</strong>
              <span>{d.time} hrs</span>
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (loan) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="quiet"
              size="sm"
              title="Traspasar"
              onClick={() => handleTransferClick(loan)}
            >
              Traspasar
            </Button>
            <Button
              variant="primary"
              size="sm"
              title="Devolver"
              onClick={() => handleReturnClick(loan)}
            >
              <Icon name="check" size="sm" /> Devolver
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div
      className="page"
      data-od-id="loans-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="key"
        title="Gestión de préstamos"
        description="Monitoreo y control de activos institucionales en circulación"
        breadcrumbs={[{ label: 'Operaciones' }, { label: 'Préstamos' }]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button variant="quiet" size="sm" onClick={() => navigate('/history')}>
              <Icon name="reservas" size="sm" /> Historial
            </Button>
            {can('prestamo_llaves.add_prestamo') ? (
              <Button variant="primary" size="sm" onClick={() => navigate('/loans/new')}>
                <Icon name="plus" size="sm" /> Nuevo préstamo
              </Button>
            ) : null}
          </>
        }
      />

      

      <MetricStrip items={metrics} />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <Field label="Orden" htmlFor="loans-order">
            <Select
              id="loans-order"
              value={ordering}
              onChange={(e) => setOrdering(e.target.value)}
            >
              <option value="-fecha_prestamo">Más recientes</option>
              <option value="fecha_prestamo">Más antiguos</option>
              <option value="activo__nombre">Nombre activo</option>
              <option value="solicitante__nombre">Responsable</option>
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="loans-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="loans-q"
              type="search"
              placeholder="RUT, responsable o activo…"
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
        emptyTitle="Todo en orden"
        emptyDescription="No hay activos en circulación. Todo el inventario está bajo resguardo."
        emptyAction={
          can('prestamo_llaves.add_prestamo') ? (
            <Button variant="primary" size="sm" onClick={() => navigate('/loans/new')}>
              <Icon name="plus" size="sm" /> Nuevo préstamo
            </Button>
          ) : null
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="loans-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(loan) => ({
          primary: {
            label: 'Devolver',
            onClick: () => handleReturnClick(loan),
          },
          secondary: {
            label: 'Traspasar',
            onClick: () => handleTransferClick(loan),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">En circulación</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <ReturnLoanModal
        open={showReturnModal}
        onClose={() => {
          if (!returning) {
            setShowReturnModal(false)
            setSelectedLoan(null)
          }
        }}
        onConfirm={handleConfirmReturn}
        loanData={selectedLoan}
        confirming={returning}
      />

      <TransferModal
        open={showTransferModal}
        onClose={(result) => {
          setShowTransferModal(false)
          setSelectedLoan(null)
          if (result?.saved) {
            fetchData()
          }
        }}
        loan={selectedLoan}
      />
    </div>
  )
}

export default LoansDashboard
