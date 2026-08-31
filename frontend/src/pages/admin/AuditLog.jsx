import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Modal,
  Field,
  Input,
  Select,
  Button,
  Icon,
  Badge,
  Alert,
  EmptyState,
  DetailGrid,
  DetailItem,
} from '@slep/ui'

const formatDateParts = (dateString) => {
  if (!dateString) return null
  const date = new Date(dateString)
  return {
    day: date.toLocaleDateString('es-CL'),
    time: date.toLocaleTimeString('es-CL'),
  }
}

const getActionBadge = (action) => {
  switch (action) {
    case 0:
      return { label: 'Creación', variant: 'success' }
    case 1:
      return { label: 'Edición', variant: 'accent' }
    case 2:
      return { label: 'Eliminación', variant: 'danger' }
    default:
      return { label: 'Otro', variant: 'neutral' }
  }
}

const AuditLog = () => {
  const { notify } = useNotify()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('-timestamp')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  const [actionFilter, setActionFilter] = useState('')
  const [modelFilter, setModelFilter] = useState('')

  const [lookups, setLookups] = useState({
    tipos_documentos: {},
    establecimientos: {},
    proveedores: {},
    funcionarios: {},
  })

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

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      let url = `admin/audit-log/?page=${currentPage}&ordering=${ordering}&page_size=${pageSize}`
      if (actionFilter) url += `&action=${actionFilter}`
      if (modelFilter) url += `&content_type_name=${modelFilter}`
      if (searchQuery) url += `&search=${searchQuery}`

      const response = await api.get(url)
      setLogs(response.data.results || [])
      setTotalCount(response.data.count || 0)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      notify({ variant: 'danger', text: 'No se pudieron cargar los registros de auditoría.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, ordering, actionFilter, modelFilter, searchQuery, pageSize])

  const fetchLookups = async () => {
    try {
      const [docs, ests, provs] = await Promise.all([
        api.get('tipos-documentos/'),
        api.get('establecimientos/', { params: { page_size: 1000 } }),
        api.get('proveedores/', { params: { page_size: 1000 } }),
      ])

      const mapData = (arr) => {
        const map = {}
        ;(arr.results || arr).forEach((item) => {
          map[item.id] = item.nombre
        })
        return map
      }

      setLookups({
        tipos_documentos: mapData(docs.data),
        establecimientos: mapData(ests.data),
        proveedores: mapData(provs.data),
      })
    } catch (e) {
      console.warn('No se pudieron cargar todos los diccionarios de nombres:', e)
    }
  }

  useEffect(() => {
    fetchLookups()
  }, [])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    setCurrentPage(1)
  }, [actionFilter, modelFilter, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setActionFilter('')
    setModelFilter('')
    setOrdering('-timestamp')
    setCurrentPage(1)
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (actionFilter ? 1 : 0) +
    (modelFilter ? 1 : 0) +
    (ordering !== '-timestamp' ? 1 : 0)

  const handleSort = (colKey) => {
    if (colKey !== 'timestamp') return
    setOrdering((prev) => (prev === 'timestamp' ? '-timestamp' : 'timestamp'))
  }

  const activeSortKey =
    ordering === 'timestamp' || ordering === '-timestamp' ? 'timestamp' : undefined

  const openDetail = (log) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  const renderChanges = (changesJson) => {
    if (!changesJson) return null

    try {
      const changes =
        typeof changesJson === 'string' ? JSON.parse(changesJson) : changesJson
      const isNullLike = (val) =>
        val === null ||
        val === undefined ||
        val === 'None' ||
        val === 'null' ||
        String(val).trim() === ''

      const changeEntries = Object.entries(changes).filter(([, values]) => {
        const [oldVal, newVal] = values
        return oldVal !== newVal && !(isNullLike(oldVal) && isNullLike(newVal))
      })

      if (changeEntries.length === 0) {
        return (
          <EmptyState
            title="Sin cambios significativos"
            description="Los ajustes detectados no afectan el contenido de los datos (ej: formateo interno)."
          />
        )
      }

      return (
        <DetailGrid>
          {changeEntries.map(([field, values]) => {
            const [oldVal, newVal] = values

            const formatValue = (val) => {
              if (isNullLike(val)) return '(sin valor)'

              const fieldLower = field.toLowerCase()
              if (fieldLower.includes('tipo documento') && lookups.tipos_documentos[val]) {
                return lookups.tipos_documentos[val]
              }
              if (fieldLower.includes('establecimiento') && lookups.establecimientos[val]) {
                return lookups.establecimientos[val]
              }
              if (fieldLower.includes('proveedor') && lookups.proveedores[val]) {
                return lookups.proveedores[val]
              }

              if (typeof val === 'object') return JSON.stringify(val)
              return String(val)
            }

            const fieldLabel = field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

            return (
              <DetailItem key={field} label={fieldLabel} full>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <span>
                    <Badge variant="danger">Antes</Badge>{' '}
                    {formatValue(oldVal)}
                  </span>
                  <span>
                    <Badge variant="success">Después</Badge>{' '}
                    {formatValue(newVal)}
                  </span>
                </div>
              </DetailItem>
            )
          })}
        </DetailGrid>
      )
    } catch {
      return (
        <pre
          style={{
            fontSize: 'var(--text-xs)',
            padding: 'var(--space-3)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)',
            overflow: 'auto',
          }}
        >
          {String(changesJson)}
        </pre>
      )
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'timestamp',
        header: 'Fecha y hora',
        className: 'col--secondary',
        cardRole: 'field',
        priority: 3,
        sortable: true,
        render: (log) => {
          const d = formatDateParts(log.timestamp)
          if (!d) return '—'
          return (
            <div className="contracts-cat">
              <strong>{d.day}</strong>
              <span>{d.time}</span>
            </div>
          )
        },
      },
      {
        key: 'actor',
        header: 'Usuario / IP',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (log) => (
          <div className="contracts-cat">
            <strong>{log.actor_name}</strong>
            <span>{log.remote_addr || 'Local'}</span>
          </div>
        ),
      },
      {
        key: 'action',
        header: 'Acción',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (log) => {
          const action = getActionBadge(log.action)
          return <Badge variant={action.variant}>{action.label}</Badge>
        },
      },
      {
        key: 'resource',
        header: 'Recurso afectado',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (log) => (
          <div className="contracts-cat">
            <strong>{log.content_type_name.replace(/_/g, ' ')}</strong>
            <span>{log.object_repr}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Detalles',
        className: 'col--actions',
        render: (log) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" title="Ver detalle" onClick={() => openDetail(log)}>
              <Icon name="eye" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const selectedAction = selectedLog ? getActionBadge(selectedLog.action) : null

  return (
    <div
      className="page"
      data-od-id="audit-log-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="activity"
        title="Registro de auditoría"
        description="Historial de altas, ediciones y eliminaciones en el sistema."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Auditoría' },
        ]}
        linkComponent={Link}
        split
      />

      <FiltersBar
        onSearch={() => {
          setCurrentPage(1)
          fetchLogs()
        }}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <>
            <Field label="Acción" htmlFor="audit-action">
              <Select
                id="audit-action"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Todas las acciones</option>
                <option value="0">Creaciones</option>
                <option value="1">Ediciones</option>
                <option value="2">Eliminaciones</option>
              </Select>
            </Field>
            <Field label="Módulo" htmlFor="audit-model">
              <Select
                id="audit-model"
                value={modelFilter}
                onChange={(e) => {
                  setModelFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Todos los módulos</option>
                <option value="Funcionario">Funcionarios</option>
                <option value="PersonalTI">Personal TI</option>
                <option value="Establecimiento">Establecimientos</option>
                <option value="Contrato">Contratos</option>
                <option value="Proveedor">Proveedores</option>
                <option value="Procedimiento">Procedimientos</option>
                <option value="Servicio">Servicios</option>
                <option value="RecepcionConforme">Recepciones</option>
                <option value="RegistroPago">Pagos</option>
                <option value="CDP">CDPs</option>
                <option value="Vehiculo">Vehículos</option>
                <option value="SolicitudReserva">Reservas</option>
                <option value="Ticket">Tickets</option>
                <option value="User">Usuarios</option>
                <option value="CuentaSMTP">Cuentas SMTP</option>
                <option value="PlantillaCorreo">Plantillas correo</option>
                <option value="Beneficio">Bienestar</option>
              </Select>
            </Field>
          </>
        }
      >
        <Field label="Buscar" htmlFor="audit-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="audit-q"
              type="search"
              placeholder="ID, nombre o IP… (Enter o buscar)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrentPage(1)
                  fetchLogs()
                }
              }}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={logs}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="No se encontraron registros"
        emptyDescription="Intenta ajustar los filtros de búsqueda."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="audit-log-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        onRowClick={openDetail}
        mobileCardActions={(log) => ({
          primary: {
            label: 'Ver detalle',
            onClick: () => openDetail(log),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Auditoría</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <Modal
        open={isDetailModalOpen && Boolean(selectedLog)}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedLog(null)
        }}
        title="Detalle de actividad"
        subheader={
          selectedLog ? `ID transacción #${selectedLog.id}` : undefined
        }
        size="lg"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setIsDetailModalOpen(false)
              setSelectedLog(null)
            }}
          >
            Cerrar detalle
          </Button>
        }
      >
        {selectedLog ? (
          <>
            <DetailGrid>
              <DetailItem label="Ejecución">
                {new Date(selectedLog.timestamp).toLocaleString('es-CL')}
              </DetailItem>
              <DetailItem label="IP">
                {selectedLog.remote_addr || 'Desconocida'}
              </DetailItem>
              <DetailItem label="Objeto afectado">
                {selectedLog.content_type_name.replace(/_/g, ' ')}
              </DetailItem>
              <DetailItem label="Referencia">{selectedLog.object_repr}</DetailItem>
              <DetailItem label="Responsable">{selectedLog.actor_name}</DetailItem>
              <DetailItem label="Acción">
                {selectedAction ? (
                  <Badge variant={selectedAction.variant}>{selectedAction.label}</Badge>
                ) : (
                  '—'
                )}
              </DetailItem>
            </DetailGrid>

            <div style={{ marginTop: 'var(--space-5)' }}>
              <h4
                style={{
                  margin: '0 0 var(--space-3)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                }}
              >
                Comparativa de cambios
              </h4>
              {selectedLog.changes &&
              typeof selectedLog.changes === 'object' &&
              Object.keys(selectedLog.changes).length > 0 ? (
                renderChanges(selectedLog.changes)
              ) : (
                <Alert variant="warning" title="Sin detalle de campos">
                  No hay detalles de campos para esta acción.
                </Alert>
              )}
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  )
}

export default AuditLog
