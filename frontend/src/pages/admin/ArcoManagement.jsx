import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
  Textarea,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const getEstadoBadge = (estado) => {
  switch (estado) {
    case 'PENDIENTE':
      return { label: 'Pendiente', variant: 'warning' }
    case 'APROBADA':
      return { label: 'Aprobada', variant: 'success' }
    case 'RECHAZADA':
      return { label: 'Rechazada', variant: 'danger' }
    default:
      return { label: estado, variant: 'neutral' }
  }
}

const ArcoManagement = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [resolvingRequest, setResolvingRequest] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [resolutionData, setResolutionData] = useState({
    estado: 'APROBADA',
    motivo_rechazo: '',
  })

  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const savedOkRef = useRef(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

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

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterEstado) params.estado = filterEstado
      if (filterTipo) params.tipo_derecho = filterTipo
      if (submittedSearch) params.search = submittedSearch

      const res = await api.get('arco/', { params })
      setRequests(res.data.results || res.data || [])
    } catch (err) {
      console.error('Error al obtener solicitudes ARCO:', err)
      showAlert('danger', 'No se pudieron cargar las solicitudes ARCO.')
    } finally {
      setLoading(false)
    }
  }, [filterEstado, filterTipo, submittedSearch])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterEstado, filterTipo, submittedSearch, pageSize])

  const showAlert = (variant, text) => {
    notify({ variant, text })
  }

  const handleSearchSubmit = () => {
    setSubmittedSearch(search)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setSubmittedSearch('')
    setFilterEstado('')
    setFilterTipo('')
    setCurrentPage(1)
  }

  const activeFilterCount =
    (submittedSearch ? 1 : 0) + (filterEstado ? 1 : 0) + (filterTipo ? 1 : 0)

  const openResolve = (req) => {
    savedOkRef.current = false
    overlay.reset()
    setValidationError('')
    setResolvingRequest(req)
    setResolutionData({ estado: 'APROBADA', motivo_rechazo: '' })
  }

  const closeResolveModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setResolvingRequest(null)
    setValidationError('')
    setResolutionData({ estado: 'APROBADA', motivo_rechazo: '' })
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setResolvingRequest(null)
      setValidationError('')
      setResolutionData({ estado: 'APROBADA', motivo_rechazo: '' })
      if (savedOkRef.current) fetchRequests()
      savedOkRef.current = false
      return
    }
    overlay.dismiss()
  }

  const handleResolve = async () => {
    if (!resolvingRequest) return

    if (resolutionData.estado === 'RECHAZADA' && !resolutionData.motivo_rechazo) {
      setValidationError('Debe ingresar el motivo del rechazo según exige la ley.')
      return
    }

    try {
      await overlay.run(
        async () => {
          await api.post(`arco/${resolvingRequest.id}/resolver/`, resolutionData)
          savedOkRef.current = true
        },
        {
          successDescription:
            resolutionData.estado === 'APROBADA'
              ? 'Solicitud aprobada.'
              : 'Solicitud rechazada.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al procesar la resolución.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return requests.slice(start, start + pageSize)
  }, [requests, currentPage, pageSize])

  const columns = useMemo(
    () => [
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (req) => {
          const badge = getEstadoBadge(req.estado)
          return <Badge variant={badge.variant}>{badge.label}</Badge>
        },
      },
      {
        key: 'solicitante',
        header: 'Solicitante',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (req) => (
          <div className="contracts-cat">
            <strong>{req.solicitante_nombre}</strong>
            <span>RUT: {req.solicitante_rut}</span>
            {req.solicita_bloqueo && req.estado === 'PENDIENTE' ? (
              <Badge variant="danger">Bloqueo req. (Art. 8° ter)</Badge>
            ) : null}
          </div>
        ),
      },
      {
        key: 'tipo',
        header: 'Derecho',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (req) => (
          <div className="contracts-cat">
            <strong>{req.tipo_derecho}</strong>
            {req.campo ? <span>Campo: {req.campo}</span> : null}
          </div>
        ),
      },
      {
        key: 'detalle',
        header: 'Detalle',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (req) => (
          <div className="contracts-cat">
            {req.tipo_derecho === 'RECTIFICACION' ? (
              <span>
                {req.valor_anterior || '(vacío)'} → {req.valor_propuesto}
              </span>
            ) : null}
            <span title={req.justificacion}>«{req.justificacion}»</span>
            {req.estado === 'RECHAZADA' && req.motivo_rechazo ? (
              <span>Rechazo: «{req.motivo_rechazo}»</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'fecha',
        header: 'Fechas',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (req) => (
          <div className="contracts-cat">
            <strong>Solicitado</strong>
            <span>{new Date(req.fecha_solicitud).toLocaleString('es-CL')}</span>
            {req.estado !== 'PENDIENTE' ? (
              <>
                <strong>Resuelto</strong>
                <span>
                  {new Date(req.fecha_resolucion).toLocaleString('es-CL')} ·{' '}
                  {req.resuelto_por_nombre}
                </span>
              </>
            ) : null}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acción',
        className: 'col--actions',
        render: (req) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            {req.archivo_respaldo ? (
              <a
                href={req.archivo_respaldo}
                target="_blank"
                rel="noreferrer"
                className="btn btn--ghost btn--sm"
                title="Ver respaldo"
              >
                <Icon name="file" size="sm" />
              </a>
            ) : null}
            {req.estado === 'PENDIENTE' ? (
              <Button variant="primary" size="sm" onClick={() => openResolve(req)}>
                <Icon name="check" size="sm" /> Resolver
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div
      className="page"
      data-od-id="arco-management-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="lock"
        title="Gestión de derechos ARCO"
        description="Resolución y control de solicitudes de privacidad (Ley N° 21.719)."
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'ARCO' },
        ]}
        linkComponent={Link}
        split
      />

      

      <FiltersBar
        onSearch={handleSearchSubmit}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <Field label="Estado" htmlFor="arco-estado">
            <Select
              id="arco-estado"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="RECHAZADA">Rechazadas</option>
            </Select>
          </Field>
        }
      >
        <Field label="Buscar funcionario" htmlFor="arco-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="arco-q"
              type="search"
              placeholder="Nombre, RUT, anexo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading && requests.length === 0}
        totalCount={requests.length}
        emptyTitle="Sin solicitudes"
        emptyDescription="No se encontraron solicitudes que coincidan con los filtros."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="arco-page-size"
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(req) =>
          req.estado === 'PENDIENTE'
            ? {
                primary: {
                  label: 'Resolver',
                  onClick: () => openResolve(req),
                },
                secondary: req.archivo_respaldo
                  ? {
                      label: 'Respaldo',
                      onClick: () => window.open(req.archivo_respaldo, '_blank', 'noopener'),
                    }
                  : undefined,
              }
            : req.archivo_respaldo
              ? {
                  primary: {
                    label: 'Ver respaldo',
                    onClick: () => window.open(req.archivo_respaldo, '_blank', 'noopener'),
                  },
                }
              : undefined
        }
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Solicitudes ARCO</span>
            <Badge variant="neutral">{requests.length}</Badge>
          </div>
        }
      />

      <Modal
        open={Boolean(resolvingRequest)}
        onClose={closeResolveModal}
        title="Resolver solicitud ARCO"
        subheader={
          resolvingRequest
            ? `${resolvingRequest.solicitante_nombre} · ${resolvingRequest.tipo_derecho}`
            : undefined
        }
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={closeResolveModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleResolve}
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              Enviar resolución
            </Button>
          </>
        }
      >
        {resolvingRequest ? (
          <div className="crud-form">
            {validationError ? (
              <Alert variant="danger" title="Error" onClose={() => setValidationError('')}>
                {validationError}
              </Alert>
            ) : null}

            <Field label="Acción" htmlFor="arco-resolve-estado">
              <Select
                id="arco-resolve-estado"
                value={resolutionData.estado}
                onChange={(e) =>
                  setResolutionData({ ...resolutionData, estado: e.target.value })
                }
              >
                <option value="APROBADA">Aprobar y aplicar</option>
                <option value="RECHAZADA">Rechazar solicitud</option>
              </Select>
            </Field>

            {resolutionData.estado === 'RECHAZADA' ? (
              <Field label="Motivo de rechazo" htmlFor="arco-motivo" required>
                <Textarea
                  id="arco-motivo"
                  rows={4}
                  placeholder="Motivo formal…"
                  value={resolutionData.motivo_rechazo}
                  onChange={(e) =>
                    setResolutionData({
                      ...resolutionData,
                      motivo_rechazo: e.target.value,
                    })
                  }
                />
              </Field>
            ) : null}

            {resolvingRequest.solicita_bloqueo ? (
              <Alert variant="warning" title="Bloqueo solicitado">
                El titular solicita bloqueo temporal conforme al Art. 8° ter.
              </Alert>
            ) : null}
          </div>
        ) : (
          <EmptyState title="Sin solicitud seleccionada" />
        )}
      </Modal>
    </div>
  )
}

export default ArcoManagement
