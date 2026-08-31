import React, { useState, useEffect, useMemo } from 'react'
import api from '../../api'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import { downloadCsv } from '../../utils/csvDownload'
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

const RESPONSE_STATES = new Set(['RESPONDIDO', 'CERRADO'])

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CL')
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('es-CL')
}

const getPasosSummary = (gestion) => {
  const pasos = Array.isArray(gestion.subtareas) ? gestion.subtareas : []
  const completed = pasos.filter((paso) => paso.completada).length
  const pending = pasos.length - completed
  const progress = pasos.length ? Math.round((completed / pasos.length) * 100) : 0
  const detail = pasos.length
    ? pasos
        .map((paso, index) => {
          const status = paso.completada ? 'Completado' : 'Pendiente'
          const completedAt = paso.fecha_completada
            ? `, completado ${formatDateTime(paso.fecha_completada)}`
            : ''
          return `${index + 1}. [${status}] ${paso.titulo || 'Sin título'}${completedAt}`
        })
        .join(' | ')
    : 'Sin pasos registrados'

  return { total: pasos.length, completed, pending, progress, detail }
}

const getLastHistoryEntry = (gestion) => {
  const historial = Array.isArray(gestion.historial) ? gestion.historial : []
  if (!historial.length) return ''
  const latest = [...historial].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  )[0]
  return [
    latest.accion,
    latest.usuario_nombre ? `por ${latest.usuario_nombre}` : '',
    latest.fecha ? `el ${formatDateTime(latest.fecha)}` : '',
    latest.detalles ? `(${latest.detalles})` : '',
  ].filter(Boolean).join(' ')
}

const getUnidadRequirente = (gestion, empty = '—') => {
  const unidades = Array.isArray(gestion.unidades_detalles)
    ? gestion.unidades_detalles
    : []
  return unidades.length ? unidades.map((unidad) => unidad.nombre).join(', ') : empty
}

const getResponseTimeDays = (gestion) => {
  const storedDays = Number(gestion.tiempo_gestion_dias)
  if (Number.isFinite(storedDays) && storedDays > 0) return storedDays
  if (!RESPONSE_STATES.has(gestion.estado)) return ''
  if (!gestion.fecha_creacion || !gestion.fecha_actualizacion) return ''

  const createdAt = new Date(gestion.fecha_creacion).getTime()
  const updatedAt = new Date(gestion.fecha_actualizacion).getTime()
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return ''

  return Math.max(0, Math.floor((updatedAt - createdAt) / 86400000))
}

const formatResponseTime = (gestion) => {
  const days = getResponseTimeDays(gestion)
  if (days === '') return RESPONSE_STATES.has(gestion.estado) ? '—' : 'En curso'
  return `${days} d`
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
  }, [notify])

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
          getUnidadRequirente(g, '').toLowerCase().includes(q) ||
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
        case 'unidad':
          aValue = getUnidadRequirente(a, '')
          bValue = getUnidadRequirente(b, '')
          break
        case 'tiempo_respuesta':
          aValue = getResponseTimeDays(a)
          bValue = getResponseTimeDays(b)
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

  const handleDownload = () => {
    downloadCsv(
      'gestiones_ejecutivos.csv',
      [
        'Fecha',
        'Establecimiento',
        'RBD',
        'Ejecutivo',
        'Unidad requirente',
        'Requerimiento',
        'Estado',
        'Tiempo de respuesta (días)',
        'Respuesta',
        'Pasos total',
        'Pasos completados',
        'Pasos pendientes',
        'Avance pasos (%)',
        'Detalle pasos',
        'Último movimiento',
      ],
      filteredSorted.map((item) => {
        const pasos = getPasosSummary(item)
        return [
          formatDate(item.fecha_creacion),
          item.establecimiento_details?.nombre || '',
          item.establecimiento_details?.rbd ?? '',
          item.ejecutivo_details?.nombre_funcionario || '',
          getUnidadRequirente(item, ''),
          item.requerimiento || '',
          ESTADO_BADGE[item.estado]?.label || item.estado || '',
          getResponseTimeDays(item),
          item.respuesta || '',
          pasos.total,
          pasos.completed,
          pasos.pending,
          pasos.progress,
          pasos.detail,
          getLastHistoryEntry(item),
        ]
      }),
    )
  }

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
        key: 'unidad',
        header: 'Unidad requirente',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 5,
        sortable: true,
        render: (item) => getUnidadRequirente(item),
      },
      {
        key: 'requerimiento',
        header: 'Requerimiento',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 6,
        render: (item) => item.requerimiento || '—',
      },
      {
        key: 'tiempo_respuesta',
        header: 'Tiempo resp.',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 6,
        sortable: true,
        render: (item) => formatResponseTime(item),
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
          <>
            <div className="table-toolbar__left">
              <span className="table-toolbar__title">Gestiones</span>
              <Badge variant="neutral">{filteredSorted.length}</Badge>
            </div>
            <div className="table-toolbar__right">
              <Button
                action="download"
                size="sm"
                onClick={handleDownload}
                disabled={!filteredSorted.length}
              >
                <Icon name="download" size="sm" /> Descargar
              </Button>
            </div>
          </>
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
