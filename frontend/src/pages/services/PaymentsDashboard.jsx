import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import BulkUploadModal from '../../components/common/BulkUploadModal'
import PaymentModal from '../../components/services/PaymentModal'
import GenerateRCModal from '../../components/services/GenerateRCModal'
import BulkPdfUploadModal from '../../components/services/BulkPdfUploadModal'
import RecepcionConformeList from './RecepcionConformeList'
import { PaymentsReportPanel } from './PaymentsReport'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  ConfirmModal,
  Icon
} from '@slep/ui'

const emptyForm = {
        servicio: '',
        establecimiento: '',
        fecha_emision: '',
        fecha_vencimiento: '',
        fecha_pago: '',
        nro_documento: '',
        monto_interes: 0,
        monto_total: '',
  consumo: '',
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0)

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

const mediaUrl = (path) => {
  if (!path) return '#'
  if (path.startsWith('http')) return path
  return `${import.meta.env.VITE_API_URL || ''}${path}`
}

const PaymentsDashboard = () => {
  const { user } = useAuth()
  const { can } = usePermission()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isPrivileged = user?.is_superuser || can('servicios.delete_recepcionconforme')
  const canPagos = can('servicios.view_registropago')
  const canRC = can('servicios.view_recepcionconforme')
  const tabFromUrl = searchParams.get('tab')
  const activeTab = (() => {
    if (tabFromUrl === 'recepciones' && canRC) return 'recepciones'
    if (tabFromUrl === 'reporte' && canPagos) return 'reporte'
    if (canPagos) return 'pagos'
    if (canRC) return 'recepciones'
    return 'pagos'
  })()
  const showTabs =
    [canPagos, canRC, canPagos].filter(Boolean).length > 1

  const selectTab = (id) => {
    if (id === 'recepciones' && canRC) {
      setSearchParams({ tab: 'recepciones' }, { replace: true })
    } else if (id === 'reporte' && canPagos) {
      setSearchParams({ tab: 'reporte' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const [payments, setPayments] = useState([])
  const [services, setServices] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [providerTypes, setProviderTypes] = useState([])
  const [providers, setProviders] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [showBulkFilesModal, setShowBulkFilesModal] = useState(false)
  const [showRCModal, setShowRCModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [bulkErrors, setBulkErrors] = useState([])
  const [bulkFilesResults, setBulkFilesResults] = useState(null)
  const [processingIds, setProcessingIds] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [rcForm, setRCForm] = useState({ grupo_firmante: '', firmante: '' })
  const [selectedIds, setSelectedIds] = useState(new Set())

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const { notify } = useNotify()

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('-fecha_pago')
  const [pageSize, setPageSize] = useState(50)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const debouncedSearch = useDebouncedValue(searchQuery)

  const fetchLookups = async () => {
    try {
      const [typesRes, provRes, grpRes, servRes, estRes] = await Promise.all([
                    api.get('tipos-proveedores/', { params: { page_size: 1000 } }),
                    api.get('proveedores/', { params: { page_size: 1000 } }),
        api.get('grupos/', { params: { page_size: 1000 } }),
        api.get('servicios/', { params: { page_size: 1000 } }),
        api.get('establecimientos/', { params: { page_size: 1000 } }),
      ])
      setProviderTypes(typesRes.data.results || typesRes.data)
      setProviders(provRes.data.results || provRes.data)
      setGroups(grpRes.data.results || grpRes.data)
      setServices(servRes.data.results || servRes.data)
      setEstablishments(estRes.data.results || estRes.data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchData = async (
    page = 1,
    size = pageSize,
    search = debouncedSearch,
    order = ordering,
    status = statusFilter,
  ) => {
    setLoading(true)
    try {
      const params = {
        page,
        search,
        ordering: order,
        page_size: size,
      }
      if (status === 'paid') params.recepcion_conforme__isnull = 'false'
      else if (status === 'pending') params.recepcion_conforme__isnull = 'true'
      if (selectedType) params['servicio__proveedor__tipo_proveedor'] = selectedType
      if (selectedProvider) params['servicio__proveedor'] = selectedProvider

      const payRes = await api.get('registros-pagos/', { params })
      const data = payRes.data.results || []
      setPayments(data)
      setTotalCount(payRes.data.count || 0)
      setCurrentPage(page)
      setSelectedIds(new Set())
            } catch (error) {
      console.error(error)
      setPayments([])
      notify({ variant: 'danger', text: 'No se pudieron cargar los pagos.' })
    } finally {
      setLoading(false)
    }
  }

    useEffect(() => {
    if (canPagos) fetchLookups()
  }, [canPagos])

  useEffect(() => {
    if (activeTab !== 'pagos' || !canPagos) return
    fetchData(1, pageSize, debouncedSearch, ordering, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    canPagos,
    debouncedSearch,
    ordering,
    pageSize,
    statusFilter,
    selectedType,
    selectedProvider,
  ])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedType('')
    setSelectedProvider('')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const handleTypeChange = async (typeId) => {
    setSelectedType(typeId)
    setSelectedProvider('')
    setCurrentPage(1)
    try {
      const res = typeId
        ? await api.get('proveedores/', {
            params: { tipo_proveedor: typeId, page_size: 1000 },
          })
        : await api.get('proveedores/', { params: { page_size: 1000 } })
      setProviders(res.data.results || res.data)
            } catch (error) {
      console.error(error)
    }
  }

  const sortKeyMap = {
    documento: 'nro_documento',
    cliente: 'servicio__numero_cliente',
    establecimiento: 'establecimiento__nombre',
    emision: 'fecha_emision',
    vencimiento: 'fecha_vencimiento',
    monto: 'monto_total',
  }

  const handleSort = (colKey) => {
    const apiKey = sortKeyMap[colKey]
    if (!apiKey) return
    const next =
      ordering === apiKey ? `-${apiKey}` : ordering === `-${apiKey}` ? apiKey : apiKey
    setOrdering(next)
  }

  const activeSortKey = Object.entries(sortKeyMap).find(
    ([, apiKey]) => ordering === apiKey || ordering === `-${apiKey}`,
  )?.[0]

  const selectablePayments = useMemo(
    () => payments.filter((p) => !p.recepcion_conforme),
    [payments],
  )
  const allSelectableSelected =
    selectablePayments.length > 0 &&
    selectablePayments.every((p) => selectedIds.has(p.id))

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectablePayments.length === 0) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelectableSelected) selectablePayments.forEach((p) => next.delete(p.id))
      else selectablePayments.forEach((p) => next.add(p.id))
      return next
    })
  }

  const validateSameProvider = () => {
    const selectedPayments = payments.filter((p) => selectedIds.has(p.id))
    if (!selectedPayments.length) return null
    const firstService = services.find((s) => s.id === selectedPayments[0].servicio)
    if (!firstService) {
      notify({
        variant: 'danger',
        text: 'No se pudo identificar el servicio del pago seleccionado.',
      })
      return null
    }
    const providerId = firstService.proveedor
    for (const p of selectedPayments) {
      const s = services.find((srv) => srv.id === p.servicio)
      if (!s || s.proveedor !== providerId) {
        notify({
          variant: 'danger',
          text: 'Todos los pagos seleccionados deben pertenecer al mismo proveedor.',
        })
        return null
      }
    }
    return providerId
  }

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

    const handleEdit = (item) => {
        setFormData({
            servicio: item.servicio,
            establecimiento: item.establecimiento,
            fecha_emision: item.fecha_emision,
            fecha_vencimiento: item.fecha_vencimiento,
            fecha_pago: item.fecha_pago,
            nro_documento: item.nro_documento,
            monto_interes: item.monto_interes,
            monto_total: item.monto_total,
      consumo: item.consumo || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSave = async (dataToSubmit) => {
    const preparedData = {
      ...dataToSubmit,
      monto_total: parseInt(dataToSubmit.monto_total, 10) || 0,
      monto_interes: parseInt(dataToSubmit.monto_interes, 10) || 0,
      consumo: dataToSubmit.consumo !== '' ? parseFloat(dataToSubmit.consumo) : null,
    }
    try {
      if (editingId) {
        await api.put(`registros-pagos/${editingId}/`, preparedData)
      } else {
        await api.post('registros-pagos/', preparedData)
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleFormClose = (result) => {
    setShowForm(false)
    setEditingId(null)
    if (result?.saved) {
      fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
    }
  }

  const runConfirm = async () => {
    if (!confirmTarget) return
    setConfirming(true)
    try {
      if (confirmTarget.type === 'delete') {
        await api.delete(`registros-pagos/${confirmTarget.item.id}/`)
        notify({ variant: 'success', text: 'Registro de pago eliminado.' })
      } else if (confirmTarget.type === 'removeComprobante') {
        await api.patch(`registros-pagos/${confirmTarget.item.id}/`, { comprobante: null })
        notify({ variant: 'success', text: 'Comprobante eliminado.' })
      } else if (confirmTarget.type === 'historical') {
        const providerId = validateSameProvider()
        if (!providerId) {
          setConfirmTarget(null)
          return
        }
            await api.post('recepciones-conformes/create_historical/', {
                proveedor: providerId,
          registros_ids: Array.from(selectedIds),
        })
        notify({ variant: 'success', text: 'Pagos marcados como históricos.' })
        setSelectedIds(new Set())
      }
      setConfirmTarget(null)
      await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
        } catch (error) {
      console.error(error)
      notify({
        variant: 'danger',
        text:
          confirmTarget.type === 'delete'
            ? 'Error al eliminar. Verifique que no tenga documentos asociados.'
            : 'Error al procesar la acción.',
      })
    } finally {
      setConfirming(false)
    }
  }

  const handleGenerateRC = () => {
    if (!validateSameProvider()) return
    setRCForm({ grupo_firmante: '', firmante: '' })
    setShowRCModal(true)
  }

  const handleSaveRC = async (form) => {
    const providerId = validateSameProvider()
    if (!providerId) {
      throw new Error('Los pagos seleccionados deben pertenecer al mismo proveedor.')
    }
    await api.post('recepciones-conformes/', {
      proveedor: providerId,
      registros_ids: Array.from(selectedIds),
      grupo_firmante: form.grupo_firmante,
      firmante: form.firmante,
    })
  }

  const handleRCModalClose = (result) => {
    setShowRCModal(false)
    if (result?.saved) {
      setSelectedIds(new Set())
      fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
    }
  }

  const handleDownloadRC = async (payment, tipo = 'PAGO') => {
    try {
      const response = await api.get(
        `registros-pagos/${payment.id}/generate_pdf/?tipo=${tipo}`,
        { responseType: 'blob' },
      )
      const contentType = response.headers?.['content-type'] || ''
      if (contentType.includes('application/json')) {
        const text = await response.data.text()
        const payload = JSON.parse(text)
        notify({
          variant: 'danger',
          text: payload.hint || payload.error || 'No se pudo generar el PDF.',
        })
        return
      }
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `RC_${payment.recepcion_conforme_folio || payment.nro_documento}.pdf`,
      )
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      let message = 'Error al descargar la recepción conforme.'
      const data = error?.response?.data
      if (data instanceof Blob) {
        try {
          const payload = JSON.parse(await data.text())
          message = payload.hint || payload.error || message
        } catch {
          // ignore
        }
      } else if (data?.hint || data?.error) {
        message = data.hint || data.error
      }
      notify({ variant: 'danger', text: message })
    }
  }

    const handleDownloadTemplate = async () => {
        try {
            const response = await api.get('registros-pagos/download_template/', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_pagos.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
        } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al descargar la plantilla.' })
    }
  }

    const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formDataFile = new FormData()
    formDataFile.append('file', file)
    setUploading(true)
    setBulkErrors([])
        try {
            const res = await api.post('registros-pagos/bulk_upload/', formDataFile, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      notify({
        variant: 'success',
        text: res.data.message || 'Carga masiva procesada.',
      })
      setShowBulkForm(false)
      await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
        } catch (error) {
      console.error(error)
            if (error.response?.data?.errors) {
        setBulkErrors(error.response.data.errors)
            } else {
        notify({
          variant: 'danger',
          text: error.response?.data?.error || 'Error al subir el archivo.',
        })
            }
        } finally {
      setUploading(false)
      e.target.value = null
        }
  }

    const handleFileUpload = async (payment, file) => {
    if (!file) return
        if (file.type !== 'application/pdf') {
      notify({ variant: 'danger', text: 'Por favor, suba un archivo PDF.' })
      return
    }
    setProcessingIds((prev) => [...prev, payment.id])
    const fd = new FormData()
    fd.append('comprobante', file)
    try {
      await api.patch(`registros-pagos/${payment.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      notify({ variant: 'success', text: 'Comprobante actualizado.' })
      await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
        } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al subir el comprobante.' })
        } finally {
      setProcessingIds((prev) => prev.filter((id) => id !== payment.id))
        }
  }

    const handleBulkFilesUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    setBulkFilesResults(null)
    const fd = new FormData()
    files.forEach((file) => fd.append('files', file))
    try {
      const res = await api.post('registros-pagos/bulk_upload_files/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBulkFilesResults(res.data)
      await fetchData(currentPage, pageSize, debouncedSearch, ordering, statusFilter)
        } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error en la carga masiva de archivos.' })
        } finally {
      setUploading(false)
      e.target.value = null
    }
  }

  const confirmLabels = {
    delete: {
      title: 'Eliminar registro de pago',
      description: confirmTarget?.item
        ? `¿Eliminar el documento ${confirmTarget.item.nro_documento}?`
        : '',
      confirmLabel: confirming ? 'Eliminando…' : 'Eliminar',
      danger: true,
    },
    removeComprobante: {
      title: 'Eliminar comprobante',
      description: '¿Eliminar el comprobante PDF para poder subir uno nuevo?',
      confirmLabel: confirming ? 'Eliminando…' : 'Eliminar',
      danger: true,
    },
    historical: {
      title: 'Marcar RC histórica',
      description: `¿Marcar ${selectedIds.size} pago${selectedIds.size === 1 ? '' : 's'} como recepción conforme histórica?`,
      confirmLabel: confirming ? 'Procesando…' : 'Confirmar',
      danger: false,
    },
  }
  const activeConfirm = confirmTarget ? confirmLabels[confirmTarget.type] : null

  const columns = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        className: 'col--select',
        headerClassName: 'col--select',
        cardRole: 'meta',
        priority: 2,
        render: (item) =>
          item.recepcion_conforme ? (
            <input type="checkbox" className="no-global" checked disabled aria-label="Con RC" />
          ) : (
                    <input
              type="checkbox"
              className="no-global"
              checked={selectedIds.has(item.id)}
              onChange={() => toggleSelection(item.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Seleccionar ${item.nro_documento}`}
            />
          ),
      },
      {
        key: 'documento',
        header: 'Documento',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => (
          <div className="contracts-cat">
            <strong className="mono">{item.nro_documento}</strong>
            <span>{item.servicio_detalle || '—'}</span>
                </div>
        ),
      },
      {
        key: 'cliente',
        header: 'Nº Cliente',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => (
          <Badge variant="accent">#{item.servicio_numero_cliente || '—'}</Badge>
        ),
      },
      {
        key: 'rc',
        header: 'Folio RC',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) =>
          item.recepcion_conforme_folio ? (
            <Badge
              variant={item.recepcion_conforme_estado === 'HISTORICA' ? 'warning' : 'success'}
            >
              {item.recepcion_conforme_estado === 'HISTORICA' ? 'H-RC' : 'RC'}:{' '}
              {item.recepcion_conforme_folio}
            </Badge>
          ) : (
            <Badge variant="neutral">Pendiente</Badge>
          ),
      },
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--secondary col--tablet-hide',
        cardRole: 'subtitle',
        priority: 1,
        sortable: true,
        render: (item) => item.establecimiento_nombre || '—',
      },
      {
        key: 'emision',
        header: 'Emisión',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        sortable: true,
        render: (item) => formatDate(item.fecha_emision),
      },
      {
        key: 'vencimiento',
        header: 'Vencimiento',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        sortable: true,
        render: (item) => formatDate(item.fecha_vencimiento),
      },
      {
        key: 'consumo',
        header: 'Consumo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) =>
          item.consumo !== null && item.consumo !== undefined && item.consumo !== '' ? (
            <Badge variant="accent">
              {item.consumo} {item.servicio_unidad_medida || ''}
            </Badge>
          ) : (
            '—'
          ),
      },
      {
        key: 'monto',
        header: 'Monto',
        className: 'col--numeric',
        cardRole: 'field',
        priority: 1,
        sortable: true,
        render: (item) => formatCurrency(item.monto_total),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => {
          const locked = item.recepcion_conforme && !isPrivileged
          const processing = processingIds.includes(item.id)
          return (
            <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
                                    {item.comprobante ? (
                <>
                  {canPagos ? (
                    <a 
                    href={mediaUrl(item.comprobante)}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                    className="btn btn--ghost btn--sm"
                    title="Ver comprobante"
                  >
                    <Icon name="file" size="sm" />
                  </a>
                  ) : null}
                  {can('servicios.change_registropago') ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Eliminar comprobante"
                      onClick={() =>
                        setConfirmTarget({ type: 'removeComprobante', item })
                      }
                    >
                      <Icon name="close" size="sm" />
                    </Button>
                  ) : null}
                </>
              ) : can('servicios.change_registropago') ? (
                <label
                  className={`btn btn--ghost btn--sm${processing ? ' is-disabled' : ''}`}
                  title="Subir comprobante"
                >
                  <input
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    disabled={processing}
                    onChange={(e) => handleFileUpload(item, e.target.files?.[0])}
                  />
                  <Icon name="upload" size="sm" />
                                            </label>
              ) : null}

              {canPagos ? (
                <>
              <Button
                variant="ghost"
                size="sm"
                title="RLB Monto JUNJI (un registro)"
                                    disabled={!item.recepcion_conforme}
                onClick={() => handleDownloadRC(item, 'ESTANDAR')}
              >
                <Icon name="file" size="sm" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="RLB un registro (enviar a pago)"
                                    disabled={!item.recepcion_conforme}
                onClick={() => handleDownloadRC(item, 'PAGO')}
              >
                <Icon name="download" size="sm" />
              </Button>
                </>
              ) : null}
              {can('servicios.change_registropago') ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Editar"
                  disabled={locked}
                  onClick={() => handleEdit(item)}
                >
                  <Icon name="edit" size="sm" />
                </Button>
              ) : null}
              {can('servicios.delete_registropago') ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Eliminar"
                  disabled={locked}
                  onClick={() => setConfirmTarget({ type: 'delete', item })}
                >
                  <Icon name="trash" size="sm" />
                </Button>
              ) : null}
                            </div>
          )
        },
      },
    ],
    [
      allSelectableSelected,
      selectablePayments.length,
      selectedIds,
      can,
      isPrivileged,
      processingIds,
    ],
  )

  return (
    <div className="page" data-od-id="pagos-servicios-page" data-fill-viewport>
      <PageHeader
        icon="credit-card"
        title="Pagos"
        description={
          activeTab === 'recepciones'
            ? 'Historial y gestión de documentos tributarios aceptados'
            : activeTab === 'reporte'
              ? 'Consulta histórica de consumos, facturación y pagos corporativos'
              : `Gestión y registro de consumos de servicios básicos (${totalCount})`
        }
        breadcrumbs={[{ label: 'SSGG' }, { label: 'Pagos' }]}
        linkComponent={Link}
        split
        actions={
          activeTab === 'pagos' ? (
            <>
              {can('servicios.add_registropago') ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBulkFilesResults(null)
                    setShowBulkFilesModal(true)
                  }}
                >
                  <Icon name="upload" size="sm" /> Subir boletas
                </Button>
              ) : null}
              {can('servicios.add_registropago') ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setBulkErrors([])
                    setShowBulkForm(true)
                  }}
                >
                  <Icon name="file" size="sm" /> Carga masiva
                </Button>
              ) : null}
              {can('servicios.add_registropago') ? (
                <Button variant="primary" size="sm" onClick={handleNew}>
                  <Icon name="plus" size="sm" /> Registrar pago
                </Button>
              ) : null}
            </>
          ) : can('servicios.view_cdp') ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/services/cdp')}
            >
              <Icon name="file-check" size="sm" /> CDPs
            </Button>
          ) : null
        }
      />

      {showTabs ? (
        <div className="tabs">
          <ul className="tabs__list" role="tablist" aria-label="Secciones de pagos">
            {canPagos ? (
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'pagos' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'pagos'}
                  onClick={() => selectTab('pagos')}
                >
                  Pagos
                </button>
              </li>
            ) : null}
            {canRC ? (
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'recepciones' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'recepciones'}
                  onClick={() => selectTab('recepciones')}
                >
                  Recepciones
                </button>
              </li>
            ) : null}
            {canPagos ? (
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${activeTab === 'reporte' ? ' is-active' : ''}`}
                  aria-selected={activeTab === 'reporte'}
                  onClick={() => selectTab('reporte')}
                >
                  Reporte de consumos
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div
        className="tabs__panel is-active payments-tab-panel"
        role="tabpanel"
        aria-label={
          activeTab === 'recepciones'
            ? 'Recepciones'
            : activeTab === 'reporte'
              ? 'Reporte de consumos'
              : 'Pagos'
        }
      >
      {activeTab === 'pagos' && canPagos ? (
      <>
      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={
          [selectedType, selectedProvider, statusFilter !== 'all'].filter(Boolean).length
        }
        advanced={
          <>
            <Field label="Tipo proveedor" htmlFor="pay-tipo">
              <Select
                id="pay-tipo"
                value={selectedType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="">Todos</option>
                {providerTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Proveedor" htmlFor="pay-prov">
              <Select
                id="pay-prov"
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Todos</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado RC" htmlFor="pay-status">
              <Select
                id="pay-status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendientes de RC</option>
                <option value="paid">Con RC generada</option>
              </Select>
            </Field>
          </>
        }
      >
        <Field label="Buscar" htmlFor="pay-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="pay-q"
              type="search"
              placeholder="Boleta, medidor, cliente, RBD, monto…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={payments}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin pagos"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          can('servicios.add_registropago') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Registrar pago
            </Button>
          ) : (
            <Button variant="quiet" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="pagos-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={(p) =>
          fetchData(p, pageSize, debouncedSearch, ordering, statusFilter)
        }
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: can('servicios.change_registropago')
            ? {
                label: 'Editar',
                onClick: () => handleEdit(item),
              }
            : undefined,
          secondary:
            can('servicios.delete_registropago') && !item.recepcion_conforme
              ? {
                  label: 'Eliminar',
                  onClick: () => setConfirmTarget({ type: 'delete', item }),
                }
              : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount}</Badge>
            {selectedIds.size > 0 ? (
              <Badge variant="accent">{selectedIds.size} seleccionados</Badge>
            ) : null}
            {selectablePayments.length > 0 ? (
              <label className="payments-select-all">
                                                        <input
                  type="checkbox"
                  className="no-global"
                  checked={allSelectableSelected}
                  onChange={toggleSelectAll}
                />
                Seleccionar pendientes
                                                    </label>
            ) : null}
                                        </div>
        }
      />

      {selectedIds.size > 0 ? (
        <div className="payments-bulk-bar" role="toolbar" aria-label="Acciones masivas">
          <div className="payments-bulk-bar__count">
            <strong>{selectedIds.size}</strong>
            <span>seleccionados</span>
                </div>
          <p className="payments-bulk-bar__label">Acción masiva: recepción conforme</p>
          <div className="payments-bulk-bar__actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              title="Limpiar selección"
            >
              <Icon name="close" size="sm" />
            </Button>
            {can('servicios.add_recepcionconforme') ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!validateSameProvider()) return
                  setConfirmTarget({ type: 'historical' })
                }}
              >
                Histórica
              </Button>
            ) : null}
            {can('servicios.add_recepcionconforme') ? (
              <Button variant="primary" size="sm" onClick={handleGenerateRC}>
                Generar RC
              </Button>
            ) : null}
                                </div>
                            </div>
      ) : null}
      </>
      ) : null}

      {activeTab === 'recepciones' && canRC ? (
        <RecepcionConformeList embedded />
      ) : null}

      {activeTab === 'reporte' && canPagos ? (
        <PaymentsReportPanel embedded />
      ) : null}
      </div>

      <PaymentModal
        open={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={{ establishments, services }}
      />

      <BulkUploadModal
        open={showBulkForm}
        onClose={() => {
          if (!uploading) setShowBulkForm(false)
        }}
        title="Carga masiva de pagos"
        description="Suba un Excel con los registros de pago. Emisión puede ir vacía; vencimiento y pago son obligatorios."
        onUpload={handleBulkUpload}
        onDownloadTemplate={handleDownloadTemplate}
        uploading={uploading}
        errors={bulkErrors}
      />

      <BulkPdfUploadModal
        open={showBulkFilesModal}
        onClose={() => {
          if (!uploading) setShowBulkFilesModal(false)
        }}
        onUpload={handleBulkFilesUpload}
        uploading={uploading}
        results={bulkFilesResults}
        onClearResults={() => setBulkFilesResults(null)}
      />

      <GenerateRCModal
        open={showRCModal}
        onClose={handleRCModalClose}
        selectedCount={selectedIds.size}
        groups={groups}
        form={rcForm}
        onChange={setRCForm}
        onSave={handleSaveRC}
      />

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
                            </div>
  )
}

export default PaymentsDashboard
