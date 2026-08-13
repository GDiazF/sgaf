import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
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
  Textarea,
  Modal,
  ConfirmModal,
  EmptyState,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

const formatDateTime = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('es-CL')
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0)

const mediaUrl = (path) => {
  if (!path) return '#'
  if (path.startsWith('http')) return path
  return `${import.meta.env.VITE_API_URL || ''}${path}`
}

const ESTADO_BADGE = {
  EMITIDA: { variant: 'warning', label: 'Pendiente' },
  COMPLETADA: { variant: 'success', label: 'Completada' },
  ANULADA: { variant: 'danger', label: 'Anulada' },
  HISTORICA: { variant: 'neutral', label: 'Histórica' },
}

const RecepcionConformeList = ({ embedded = false }) => {
  const { can } = usePermission()

  const [rcs, setRcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('-fecha_emision')
  const [statusFilter, setStatusFilter] = useState('all')
  const { notify } = useNotify()
  const debouncedSearch = useDebouncedValue(searchQuery)

  const [editingRC, setEditingRC] = useState(null)
  const [editForm, setEditForm] = useState({
    observaciones: '',
    registros_ids: [],
    grupo_firmante: '',
    firmante: '',
    folio: '',
  })
  const [currentPayments, setCurrentPayments] = useState([])
  const [availablePayments, setAvailablePayments] = useState([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [groups, setGroups] = useState([])
  const editOverlay = useFormOverlay()

  const [historyRC, setHistoryRC] = useState(null)
  const [processingIds, setProcessingIds] = useState([])
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const fetchData = async (
    page = currentPage,
    size = pageSize,
    search = debouncedSearch,
    order = ordering,
    status = statusFilter,
  ) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: size,
        search: search || undefined,
        ordering: order,
      }
      if (status === 'all') {
        params.estado__in = 'EMITIDA,COMPLETADA,ANULADA'
      } else {
        params.estado = status
      }

      const [rcRes, grpRes] = await Promise.all([
        api.get('recepciones-conformes/', { params }),
        api.get('grupos/', { params: { page_size: 1000 } }),
      ])

      const rcData = rcRes.data.results || rcRes.data
      const rcCount = rcRes.data.count ?? (Array.isArray(rcRes.data) ? rcRes.data.length : 0)

      setRcs(Array.isArray(rcData) ? rcData : [])
      setTotalCount(rcCount)
      setGroups(grpRes.data.results || grpRes.data || [])
    } catch (error) {
      console.error('Error fetching RCs:', error)
      setRcs([])
      notify({ variant: 'danger', text: 'No se pudieron cargar las recepciones.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery !== debouncedSearch) return
    fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, ordering, debouncedSearch, searchQuery, statusFilter])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const sortKeyMap = {
    folio: 'folio',
    emision: 'fecha_emision',
    proveedor: 'proveedor__nombre',
  }

  const handleSort = (colKey) => {
    const apiKey = sortKeyMap[colKey]
    if (!apiKey) return
    const next =
      ordering === apiKey ? `-${apiKey}` : ordering === `-${apiKey}` ? apiKey : apiKey
    setOrdering(next)
    setCurrentPage(1)
  }

  const activeSortKey = Object.entries(sortKeyMap).find(
    ([, apiKey]) => ordering === apiKey || ordering === `-${apiKey}`,
  )?.[0]

  const fetchAvailablePayments = async (providerId) => {
    setLoadingAvailable(true)
    try {
      const response = await api.get(
        `registros-pagos/?servicio__proveedor=${providerId}&page_size=1000`,
      )
      const data = response.data.results || response.data
      setAvailablePayments(data.filter((p) => !p.recepcion_conforme))
    } catch (error) {
      console.error('Error fetching available payments:', error)
      setAvailablePayments([])
    } finally {
      setLoadingAvailable(false)
    }
  }

  const handleDownloadPDF = async (item, tipo = 'PAGO') => {
    try {
      const response = await api.get(
        `recepciones-conformes/${item.id}/generate_pdf/?tipo=${tipo}`,
        { responseType: 'blob' },
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const filename = `RC_${item.folio || item.id}.pdf`.replace(/[/\\?%*:|"<>]/g, '-')
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      notify({ variant: 'danger', text: 'Error al generar el PDF.' })
    }
  }

  const handleEdit = (rc) => {
    editOverlay.reset()
    setEditingRC(rc)
    setEditForm({
      observaciones: rc.observaciones || '',
      registros_ids: (rc.registros || []).map((r) => r.id),
      grupo_firmante: rc.grupo_firmante || '',
      firmante: rc.firmante || '',
      folio: rc.folio || '',
    })
    setCurrentPayments(rc.registros || [])
    fetchAvailablePayments(rc.proveedor)
  }

  const handleRemovePayment = (paymentId) => {
    setConfirmTarget({ type: 'removePayment', paymentId })
  }

  const handleAddPayment = (payment) => {
    if (editForm.registros_ids.includes(payment.id)) return
    setEditForm((prev) => ({
      ...prev,
      registros_ids: [...prev.registros_ids, payment.id],
    }))
    setCurrentPayments((prev) => [...prev, payment])
    setAvailablePayments((prev) => prev.filter((p) => p.id !== payment.id))
  }

  const closeEditModal = () => {
    if (editOverlay.busy) return
    editOverlay.reset()
    setEditingRC(null)
  }

  const handleEditOverlayDismiss = () => {
    if (editOverlay.status === 'success') {
      editOverlay.reset()
      setEditingRC(null)
      fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
      return
    }
    editOverlay.dismiss()
  }

  const handleSaveEdit = async (e) => {
    e?.preventDefault?.()
    if (!editingRC) return
    try {
      await editOverlay.run(
        async () => {
          await api.patch(`recepciones-conformes/${editingRC.id}/`, editForm)
        },
        {
          successDescription: 'Cambios guardados correctamente.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const runFileUpload = async (rc, file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      notify({ variant: 'danger', text: 'Por favor, suba un archivo PDF.' })
      return
    }

    setProcessingIds((prev) => [...prev, rc.id])
    const formData = new FormData()
    formData.append('archivo_escaneado', file)

    try {
      await api.patch(`recepciones-conformes/${rc.id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
      notify({ variant: 'success', text: 'Documento firmado subido correctamente.' })
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al subir el archivo.' })
    } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== rc.id))
    }
  }

  const runConfirm = async () => {
    if (!confirmTarget) return
    setConfirming(true)
    try {
      if (confirmTarget.type === 'upload') {
        await runFileUpload(confirmTarget.item, confirmTarget.file)
      } else if (confirmTarget.type === 'deleteFile') {
        const rc = confirmTarget.item
        setProcessingIds((prev) => [...prev, rc.id])
        try {
          await api.patch(`recepciones-conformes/${rc.id}/`, { archivo_escaneado: null })
          await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
          notify({ variant: 'success', text: 'Archivo eliminado correctamente.' })
        } finally {
          setProcessingIds((prev) => prev.filter((id) => id !== rc.id))
        }
      } else if (confirmTarget.type === 'anular') {
        const rc = confirmTarget.item
        setProcessingIds((prev) => [...prev, rc.id])
        try {
          await api.post(`recepciones-conformes/${rc.id}/anular/`)
          await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
          notify({ variant: 'success', text: 'Recepción conforme anulada correctamente.' })
        } catch (error) {
          const errorMsg =
            error.response?.data?.error ||
            error.response?.data?.detail ||
            'Error desconocido'
          notify({ variant: 'danger', text: `Error al anular la RC: ${errorMsg}` })
        } finally {
          setProcessingIds((prev) => prev.filter((id) => id !== rc.id))
        }
      } else if (confirmTarget.type === 'removePayment') {
        const paymentId = confirmTarget.paymentId
        setEditForm((prev) => ({
          ...prev,
          registros_ids: prev.registros_ids.filter((id) => id !== paymentId),
        }))
        setCurrentPayments((prev) => prev.filter((p) => p.id !== paymentId))
      }
      setConfirmTarget(null)
    } finally {
      setConfirming(false)
    }
  }

  const activeConfirm = useMemo(() => {
    if (!confirmTarget) return null
    if (confirmTarget.type === 'upload') {
      const folio = confirmTarget.item?.folio || confirmTarget.item?.id
      return {
        title: 'Subir recepción firmada',
        description: `¿Subir recepción firmada para el folio ${folio}? Esto marcará el documento como COMPLETADO.`,
        confirmLabel: 'Subir',
        danger: false,
      }
    }
    if (confirmTarget.type === 'deleteFile') {
      const folio = confirmTarget.item?.folio || confirmTarget.item?.id
      return {
        title: 'Eliminar archivo firmado',
        description: `¿Eliminar el archivo firmado de la RC ${folio}?`,
        confirmLabel: 'Eliminar',
        danger: true,
      }
    }
    if (confirmTarget.type === 'anular') {
      const folio = confirmTarget.item?.folio || confirmTarget.item?.id
      return {
        title: 'Anular recepción conforme',
        description: `¿Anular la RC ${folio}? Se liberarán todos los pagos asociados. El folio quedará marcado como ANULADA.`,
        confirmLabel: 'Anular',
        danger: true,
      }
    }
    if (confirmTarget.type === 'removePayment') {
      return {
        title: 'Quitar pago',
        description: '¿Quitar este pago de la Recepción Conforme?',
        confirmLabel: 'Quitar',
        danger: true,
      }
    }
    return null
  }, [confirmTarget])

  const selectedGroup = groups.find(
    (g) => g.id.toString() === String(editForm.grupo_firmante || ''),
  )

  const columns = useMemo(
    () => [
      {
        key: 'folio',
        header: 'Folio',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) =>
          item.estado === 'ANULADA' ? (
            <s>{item.folio || 'Sin folio'}</s>
          ) : (
            item.folio || 'Sin folio'
          ),
      },
      {
        key: 'estado',
        header: 'Estado',
        cardRole: 'status',
        priority: 2,
        render: (item) => {
          const meta = ESTADO_BADGE[item.estado] || { variant: 'neutral', label: item.estado }
          return <Badge variant={meta.variant}>{meta.label}</Badge>
        },
      },
      {
        key: 'emision',
        header: 'Emisión',
        cardRole: 'field',
        priority: 3,
        sortable: true,
        render: (item) => formatDate(item.fecha_emision),
      },
      {
        key: 'proveedor',
        header: 'Proveedor',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 4,
        sortable: true,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.proveedor_nombre || 'S/P'}</strong>
            {item.tipo_proveedor_nombre ? <span>{item.tipo_proveedor_nombre}</span> : null}
          </div>
        ),
      },
      {
        key: 'pagos',
        header: 'Pagos',
        cardRole: 'field',
        priority: 5,
        className: 'col--tablet-hide',
        render: (item) => (
          <Badge variant="accent">{item.registros?.length || 0}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => {
          const processing = processingIds.includes(item.id)
          const isAnulada = item.estado === 'ANULADA'
          return (
            <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                title="Historial"
                onClick={() => setHistoryRC(item)}
              >
                <Icon name="activity" size="sm" />
              </Button>

              {!isAnulada ? (
                <>
                  {item.archivo_escaneado ? (
                    <>
                      <a
                        href={mediaUrl(item.archivo_escaneado)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--ghost btn--sm"
                        title="Ver recepción escaneada"
                      >
                        <Icon name="file" size="sm" />
                      </a>
                      {can('servicios.change_recepcionconforme') ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar archivo"
                          disabled={processing}
                          onClick={() => setConfirmTarget({ type: 'deleteFile', item })}
                        >
                          <Icon name="close" size="sm" />
                        </Button>
                      ) : null}
                    </>
                  ) : can('servicios.change_recepcionconforme') ? (
                    <label
                      className={`btn btn--ghost btn--sm${processing ? ' is-disabled' : ''}`}
                      title="Subir recepción firmada"
                    >
                      <input
                        type="file"
                        accept=".pdf"
                        className="sr-only"
                        disabled={processing}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          if (file.type !== 'application/pdf') {
                            notify({
                              variant: 'danger',
                              text: 'Por favor, suba un archivo PDF.',
                            })
                            return
                          }
                          setConfirmTarget({ type: 'upload', item, file })
                        }}
                      />
                      <Icon name="upload" size="sm" />
                    </label>
                  ) : null}

                  <Button
                    variant="ghost"
                    size="sm"
                    title="Descargar PDF"
                    onClick={() => handleDownloadPDF(item, 'PAGO')}
                  >
                    <Icon name="download" size="sm" />
                  </Button>

                  {can('servicios.change_recepcionconforme') ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Editar"
                      onClick={() => handleEdit(item)}
                    >
                      <Icon name="edit" size="sm" />
                    </Button>
                  ) : null}

                  {can('servicios.delete_recepcionconforme') ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Anular"
                      disabled={processing}
                      onClick={() => setConfirmTarget({ type: 'anular', item })}
                    >
                      <Icon name="trash" size="sm" />
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        },
      },
    ],
    [can, processingIds],
  )

  const list = (
    <>
      {!embedded ? (
        <PageHeader
          icon="clipboard-check"
          title="Recepciones conformes"
          description={`Historial y gestión de documentos tributarios aceptados (${totalCount})`}
          breadcrumbs={[
            { label: 'SSGG' },
            { label: 'Recepciones conformes' },
          ]}
          linkComponent={Link}
          split
        />
      ) : null}

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={statusFilter !== 'all' ? 1 : 0}
        advanced={
          <Field label="Estado" htmlFor="rc-estado">
            <Select
              id="rc-estado"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">Todos (vigentes)</option>
              <option value="EMITIDA">Pendientes</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="ANULADA">Anuladas</option>
              <option value="HISTORICA">Históricas</option>
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="rc-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="rc-q"
              type="search"
              placeholder="Folio, proveedor…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={rcs}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin recepciones"
        emptyDescription="No hay recepciones conformes con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="rc-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => {
          const isAnulada = item.estado === 'ANULADA'
          if (isAnulada) {
            return {
              primary: {
                label: 'Historial',
                onClick: () => setHistoryRC(item),
              },
            }
          }
          return {
            primary: can('servicios.change_recepcionconforme')
              ? {
                  label: 'Editar',
                  onClick: () => handleEdit(item),
                }
              : {
                  label: 'Descargar',
                  onClick: () => handleDownloadPDF(item, 'PAGO'),
                },
            secondary: {
              label: 'Historial',
              onClick: () => setHistoryRC(item),
            },
          }
        }}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <Modal
        open={!!historyRC}
        onClose={() => setHistoryRC(null)}
        title="Trazabilidad"
        size="lg"
        subheader={historyRC?.folio || 'RC sin folio'}
      >
        <div className="rc-history-timeline">
          {historyRC?.historial?.length > 0 ? (
            historyRC.historial.map((ev, i) => (
              <div key={i} className="rc-history-timeline__item">
                <div
                  className={`rc-history-timeline__dot rc-history-timeline__dot--${
                    ev?.accion === 'CREACION'
                      ? 'create'
                      : ev?.accion === 'MODIFICACION_PAGOS'
                        ? 'danger'
                        : 'info'
                  }`}
                >
                  <Icon name="activity" size="sm" />
                </div>
                <div className="rc-history-timeline__card">
                  <div className="rc-history-timeline__meta">
                    <Badge variant="neutral">
                      {(ev?.accion || '').replace(/_/g, ' ') || 'Evento'}
                    </Badge>
                    <time>{formatDateTime(ev?.fecha)}</time>
                  </div>
                  <p>{ev?.detalle || '—'}</p>
                  <div className="rc-history-timeline__user">
                    <Icon name="user" size="sm" />
                    {ev?.usuario || 'Sistema'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="Sin registros históricos." />
          )}
        </div>
      </Modal>

      <Modal
        open={!!editingRC}
        onClose={closeEditModal}
        title="Editar contenido"
        size="lg"
        subheader="Ajuste de pagos y firmantes"
        {...editOverlay.modalProps}
        onOverlayDismiss={handleEditOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={closeEditModal} disabled={editOverlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="rc-edit-form"
              loading={editOverlay.busy}
              disabled={editOverlay.busy || editOverlay.active}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        <form id="rc-edit-form" onSubmit={handleSaveEdit} className="crud-form">
          <div className="form-grid">
            <Field label="Grupo de firmante" htmlFor="rc-grupo">
              <Select
                id="rc-grupo"
                value={editForm.grupo_firmante || ''}
                onChange={(e) => {
                  const gid = e.target.value
                  const grp = groups.find((g) => g.id.toString() === gid)
                  setEditForm({
                    ...editForm,
                    grupo_firmante: gid,
                    firmante: grp ? grp.jefe || '' : '',
                  })
                }}
              >
                <option value="">Seleccione grupo…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Firmante específico" htmlFor="rc-firmante">
              <Select
                id="rc-firmante"
                value={editForm.firmante || ''}
                disabled={!editForm.grupo_firmante}
                onChange={(e) =>
                  setEditForm({ ...editForm, firmante: e.target.value })
                }
              >
                <option value="">Seleccione firmante…</option>
                {(selectedGroup?.miembros_detalle || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {m.id === selectedGroup?.jefe ? ' (Jefe)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="rc-edit-section">
            <div className="rc-edit-section__header">
              <h4>Pagos asociados ({currentPayments.length})</h4>
              <strong>
                {formatCurrency(
                  currentPayments.reduce((acc, curr) => acc + (curr.monto_total || 0), 0),
                )}
              </strong>
            </div>
            <ul className="rc-payment-list">
              {currentPayments.length === 0 ? (
                <li className="rc-payment-list__empty">Sin pagos vinculados</li>
              ) : (
                currentPayments.map((p) => (
                  <li key={p?.id} className="rc-payment-list__item">
                    <div>
                      <strong>{p?.nro_documento}</strong>
                      <span>{p?.servicio_detalle}</span>
                    </div>
                    <div className="rc-payment-list__actions">
                      <span>{formatCurrency(p?.monto_total || 0)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        title="Quitar"
                        onClick={() => handleRemovePayment(p?.id)}
                      >
                        <Icon name="trash" size="sm" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rc-edit-section">
            <h4>Agregar pagos disponibles</h4>
            <ul className="rc-payment-list rc-payment-list--scroll">
              {loadingAvailable ? (
                <li className="rc-payment-list__empty">Cargando pagos disponibles…</li>
              ) : availablePayments.length === 0 ? (
                <li className="rc-payment-list__empty">
                  No hay pagos pendientes para este proveedor
                </li>
              ) : (
                availablePayments.map((p) => (
                  <li key={p.id} className="rc-payment-list__item">
                    <div>
                      <strong>{p.nro_documento}</strong>
                      <span>{p.servicio_detalle}</span>
                    </div>
                    <div className="rc-payment-list__actions">
                      <span>{formatCurrency(p.monto_total)}</span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddPayment(p)}
                      >
                        <Icon name="plus" size="sm" /> Agregar
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <Field label="Glosa / observaciones" htmlFor="rc-obs">
            <Textarea
              id="rc-obs"
              rows={3}
              placeholder="Estas observaciones aparecerán en el documento PDF generado…"
              value={editForm.observaciones}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  observaciones: e.target.value.toUpperCase(),
                })
              }
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={!!confirmTarget}
        onClose={() => {
          if (!confirming) setConfirmTarget(null)
        }}
        onConfirm={runConfirm}
        title={activeConfirm?.title || ''}
        description={activeConfirm?.description || ''}
        confirmLabel={activeConfirm?.confirmLabel}
        danger={activeConfirm?.danger}
      />
    </>
  )

  if (embedded) return list

  return (
    <div className="page" data-od-id="recepciones-conformes-page" data-fill-viewport>
      {list}
    </div>
  )
}

export default RecepcionConformeList
