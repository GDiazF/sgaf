import React, { useState, useEffect, useMemo } from 'react'
import api from '../../api'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import GestionSeguimientoPanel from '../../components/comunicaciones/GestionSeguimientoPanel'
import {
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Icon,
  IconButton,
  Drawer
} from '@slep/ui'

const ESTADO_BADGE = {
  PENDIENTE: { variant: 'danger', label: 'Pendiente' },
  EN_PROCESO: { variant: 'warning', label: 'En proceso' },
  RESPONDIDO: { variant: 'accent', label: 'Respondido' },
  CERRADO: { variant: 'success', label: 'Cerrado' },
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CL')
}

const AdminGestionesGlobal = () => {
  const [gestiones, setGestiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [sortKey, setSortKey] = useState('fecha')
  const [sortDir, setSortDir] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const { notify } = useNotify()
  const [selected, setSelected] = useState(null)
  const debouncedSearch = useDebouncedValue(searchQuery)

  useEffect(() => {
    const fetchGestiones = async () => {
      setLoading(true)
      try {
        const res = await api.get('ejecutivos/gestiones/', {
          params: { page_size: 1000 },
        })
        const data = res.data.results || res.data
        setGestiones(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Error fetching gestiones', error)
        setGestiones([])
        notify({
          variant: 'danger',
          text: 'No se pudieron cargar las gestiones.',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchGestiones()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterEstado, pageSize])

  const filteredSorted = useMemo(() => {
    let items = [...gestiones]

    if (filterEstado !== 'TODOS') {
      items = items.filter((g) => g.estado === filterEstado)
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      items = items.filter(
        (g) =>
          g.establecimiento_details?.nombre?.toLowerCase().includes(q) ||
          g.ejecutivo_details?.nombre_funcionario?.toLowerCase().includes(q) ||
          g.requerimiento?.toLowerCase().includes(q) ||
          g.establecimiento_details?.rbd?.toString().includes(q),
      )
    }

    items.sort((a, b) => {
      let aValue
      let bValue
      switch (sortKey) {
        case 'establecimiento':
          aValue = a.establecimiento_details?.nombre || ''
          bValue = b.establecimiento_details?.nombre || ''
          break
        case 'rbd':
          aValue = a.establecimiento_details?.rbd ?? ''
          bValue = b.establecimiento_details?.rbd ?? ''
          break
        case 'ejecutivo':
          aValue = a.ejecutivo_details?.nombre_funcionario || ''
          bValue = b.ejecutivo_details?.nombre_funcionario || ''
          break
        case 'fecha':
          aValue = new Date(a.fecha_creacion).getTime()
          bValue = new Date(b.fecha_creacion).getTime()
          break
        case 'estado':
          aValue = a.estado || ''
          bValue = b.estado || ''
          break
        default:
          aValue = a[sortKey]
          bValue = b[sortKey]
      }
      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return items
  }, [gestiones, filterEstado, debouncedSearch, sortKey, sortDir])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSorted.slice(start, start + pageSize)
  }, [filteredSorted, currentPage, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterEstado('TODOS')
    setCurrentPage(1)
  }

  const handleSort = (colKey) => {
    if (sortKey === colKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(colKey)
      setSortDir(colKey === 'fecha' ? 'desc' : 'asc')
    }
  }

  const openDetail = (item) => setSelected(item)

  const columns = useMemo(
    () => [
      {
        key: 'fecha',
        header: 'Fecha',
        cardRole: 'field',
        priority: 3,
        sortable: true,
        render: (item) => formatDate(item.fecha_creacion),
      },
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => item.establecimiento_details?.nombre || '—',
      },
      {
        key: 'rbd',
        header: 'RBD',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        sortable: true,
        render: (item) => item.establecimiento_details?.rbd ?? '—',
      },
      {
        key: 'ejecutivo',
        header: 'Ejecutivo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        sortable: true,
        render: (item) =>
          item.ejecutivo_details?.nombre_funcionario || 'Sin asignar',
      },
      {
        key: 'requerimiento',
        header: 'Requerimiento',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 5,
        render: (item) => item.requerimiento || '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => {
          const meta = ESTADO_BADGE[item.estado] || {
            variant: 'neutral',
            label: (item.estado || '').replace('_', ' '),
          }
          return <Badge variant={meta.variant}>{meta.label}</Badge>
        },
      },
      {
        key: 'acciones',
        header: '',
        className: 'col--actions',
        cardRole: 'actions',
        render: (item) => (
          <IconButton
            type="button"
            aria-label="Ver detalle"
            title="Ver detalle"
            onClick={() => openDetail(item)}
          >
            <Icon name="eye" size={16} />
          </IconButton>
        ),
      },
    ],
    [],
  )

  const estadoMeta = selected
    ? ESTADO_BADGE[selected.estado] || {
        variant: 'neutral',
        label: selected.estado,
      }
    : null

  return (
    <>
      

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={filterEstado !== 'TODOS' ? 1 : 0}
        advanced={
          <Field label="Estado" htmlFor="com-gest-estado">
            <Select
              id="com-gest-estado"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="EN_PROCESO">En proceso</option>
              <option value="RESPONDIDO">Respondidos</option>
              <option value="CERRADO">Cerrados</option>
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="com-gest-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="com-gest-q"
              type="search"
              placeholder="Colegio, RBD, ejecutivo o requerimiento…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={filteredSorted.length}
        emptyTitle="Sin gestiones"
        emptyDescription="No hay gestiones con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="com-gestiones-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={sortKey}
        onSort={handleSort}
        onRowClick={openDetail}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Ver detalle',
            onClick: () => openDetail(item),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Gestiones</span>
            <Badge variant="neutral">{filteredSorted.length}</Badge>
          </div>
        }
      />

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        wide
        title={selected?.requerimiento || 'Detalle de gestión'}
        footer={
          <Button type="button" variant="quiet" onClick={() => setSelected(null)}>
            Cerrar
          </Button>
        }
      >
        {selected ? (
          <div className="comunicaciones-gestion-admin-detail">
            <div className="comunicaciones-gestion-admin-detail__context">
              <div className="comunicaciones-gestion-admin-detail__context-main">
                {estadoMeta ? (
                  <Badge variant={estadoMeta.variant}>{estadoMeta.label}</Badge>
                ) : null}
                <span className="comunicaciones-gestion-admin-detail__date">
                  {formatDate(selected.fecha_creacion)}
                </span>
              </div>
              <p className="comunicaciones-gestion-admin-detail__estab">
                {selected.establecimiento_details?.nombre || 'Sin establecimiento'}
                {selected.establecimiento_details?.rbd != null
                  ? ` · RBD ${selected.establecimiento_details.rbd}`
                  : ''}
              </p>
              <p className="comunicaciones-gestion-admin-detail__ejecutivo">
                Ejecutivo:{' '}
                <strong>
                  {selected.ejecutivo_details?.nombre_funcionario || 'Sin asignar'}
                </strong>
              </p>
            </div>

            <GestionSeguimientoPanel
              gestion={selected}
              newPaso=""
              onNewPasoChange={() => {}}
              onAddPaso={() => {}}
              onToggleSubtarea={() => {}}
              canEditPasos={false}
              hideHeader
            />
          </div>
        ) : null}
      </Drawer>
    </>
  )
}

export default AdminGestionesGlobal
