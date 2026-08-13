import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../../api'
import ContractModal from '../../components/contracts/ContractModal'
import ContractReceptionModal from '../../components/contracts/ContractReceptionModal'
import ContratoServiciosTab from './ContratoServiciosTab'
import DocumentViewerModal from '../../components/common/DocumentViewerModal'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  PageHeader,
  ChartCard,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  FileInput,
  Modal,
  ConfirmModal,
  DetailItem,
  EmptyState,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const TABS = [
  { id: 'info', label: 'General' },
  { id: 'providers', label: 'Proveedores' },
  { id: 'servicios', label: 'Gestión' },
  { id: 'receptions', label: 'Recepciones' },
  { id: 'docs', label: 'Archivos' },
  { id: 'history', label: 'Historial' },
]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount || 0)

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CL')
}

const estadoVariant = (nombre) => {
  const n = (nombre || '').toLowerCase()
  if (n.includes('activo') || n.includes('vigente')) return 'success'
  if (n.includes('pendiente')) return 'warning'
  if (n.includes('caducado') || n.includes('anul')) return 'danger'
  return 'neutral'
}

const ContractDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermission()

  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(true)
  const [receptions, setReceptions] = useState([])
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('info')
  const { notify } = useNotify()

  const [isEditModalOpen, setEditModalOpen] = useState(false)
  const [isDocModalOpen, setDocModalOpen] = useState(false)
  const [isReceptionModalOpen, setReceptionModalOpen] = useState(false)
  const [editingRC, setEditingRC] = useState(null)
  const [previewDoc, setPreviewDoc] = useState(null)
  const [deleteDocTarget, setDeleteDocTarget] = useState(null)
  const [deleteRcTarget, setDeleteRcTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [uploadFormData, setUploadFormData] = useState({ nombre: '', archivo: null })
  const docOverlay = useFormOverlay()
  const [sortConfig, setSortConfig] = useState({ key: 'periodo', direction: 'desc' })
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [historySearch, setHistorySearch] = useState('')
  const [historySort, setHistorySort] = useState({ key: 'fecha', direction: 'desc' })
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(25)
  const debouncedHistorySearch = useDebouncedValue(historySearch)

  const [lookups, setLookups] = useState({
    establishments: [],
    establecimientos: [],
    providers: [],
    proveedores: [],
    deliveryTypes: [],
    groups: [],
    establishmentTypes: [],
    tiposEstablecimiento: [],
    procesos: [],
    estados: [],
    categorias: [],
    orientaciones: [],
  })

  const fetchLookups = async () => {
    try {
      const [estRes, provRes, delRes, grpRes, typRes, procRes, estsRes, catRes, oriRes] =
        await Promise.all([
          api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
          api.get('proveedores/', { params: { page_size: 1000 } }),
          api.get('tipos-entrega/', { params: { page_size: 1000 } }),
          api.get('grupos/', { params: { page_size: 1000 } }),
          api.get('tipos-establecimiento/'),
          api.get('contratos/procesos/'),
          api.get('contratos/estados/'),
          api.get('contratos/categorias/'),
          api.get('contratos/orientaciones/'),
        ])
      const establishments = estRes.data.results || estRes.data
      const providers = provRes.data.results || provRes.data
      const types = typRes.data.results || typRes.data
      setLookups({
        establishments,
        establecimientos: establishments,
        providers,
        proveedores: providers,
        deliveryTypes: delRes.data.results || delRes.data,
        groups: grpRes.data.results || grpRes.data,
        establishmentTypes: types,
        tiposEstablecimiento: types,
        procesos: procRes.data.results || procRes.data,
        estados: estsRes.data.results || estsRes.data,
        categorias: catRes.data.results || catRes.data,
        orientaciones: oriRes.data.results || oriRes.data,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const fetchContract = async () => {
    try {
      setLoading(true)
      const response = await api.get(`contratos/contratos/${id}/`)
      setContract(response.data)
      setReceptions(response.data.recepciones || [])
      setHistory(response.data.historial || [])
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al cargar el contrato.' })
      navigate('/contracts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContract()
    fetchLookups()
  }, [id])

  useEffect(() => {
    if (!isDocModalOpen) return
    docOverlay.reset()
    setUploadFormData({ nombre: '', archivo: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [isDocModalOpen])

  const editFormData = useMemo(() => {
    if (!contract) return null
    return {
      codigo_mercado_publico: contract.codigo_mercado_publico,
      descripcion: contract.descripcion,
      proceso: contract.proceso,
      estado: contract.estado,
      categoria: contract.categoria,
      orientacion: contract.orientacion || '',
      proveedor: contract.proveedor || '',
      fecha_adjudicacion: contract.fecha_adjudicacion,
      fecha_inicio: contract.fecha_inicio,
      fecha_termino: contract.fecha_termino,
      tipo_oc: contract.tipo_oc || 'UNICA',
      nro_oc: contract.nro_oc || '',
      cdp: contract.cdp || '',
      proveedores_asociados: contract.proveedores_asociados || [],
      establecimientos: contract.establecimientos || [],
    }
  }, [contract])

  const handleEditSave = async (dataToSubmit) => {
    const finalData = { ...dataToSubmit }
    if (finalData.orientacion === '') delete finalData.orientacion
    try {
      await api.put(`contratos/contratos/${contract.id}/`, finalData)
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleEditClose = (result) => {
    setEditModalOpen(false)
    if (result?.saved) fetchContract()
  }

  const handleFileUpload = async () => {
    const data = new FormData()
    data.append('contrato', id)
    data.append('nombre', uploadFormData.nombre)
    data.append('archivo', uploadFormData.archivo)
    await api.post('contratos/documentos/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const handleDocSubmit = async (e) => {
    e.preventDefault()
    try {
      await docOverlay.run(handleFileUpload, {
        successDescription: 'Documento adjuntado.',
        formatError: (err) => formatApiFormError(err, 'Error al subir documento.'),
      })
    } catch {
      // FormOverlay
    }
  }

  const handleDocOverlayDismiss = () => {
    if (docOverlay.status === 'success') {
      docOverlay.reset()
      setDocModalOpen(false)
      setUploadFormData({ nombre: '', archivo: null })
      fetchContract()
      return
    }
    docOverlay.dismiss()
  }

  const handleDocClose = () => {
    if (docOverlay.busy) return
    docOverlay.reset()
    setDocModalOpen(false)
  }

  const confirmDeleteDoc = async () => {
    if (!deleteDocTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/documentos/${deleteDocTarget.id}/`)
      setDeleteDocTarget(null)
      notify({ variant: 'success', text: 'Documento eliminado.' })
      await fetchContract()
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el documento.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateReception = async (formData, isSplit = false) => {
    if (editingRC) {
      await api.put(`contratos/recepciones-contrato/${editingRC.id}/`, {
        ...formData,
        contrato: contract.id,
      })
    } else if (isSplit && formData.establecimientos?.length > 1) {
      let currentFolio = formData.folio || ''
      for (const estId of formData.establecimientos) {
        const estName =
          lookups.establishments.find((e) => e.id === estId)?.nombre || ''
        await api.post('contratos/recepciones-contrato/', {
          ...formData,
          establecimientos: [estId],
          contrato: contract.id,
          folio: currentFolio,
          descripcion: formData.descripcion + (estName ? `\n- ${estName}` : ''),
        })
        if (currentFolio) {
          currentFolio = currentFolio.replace(/(\d+)(?!.*\d)/, (match) => {
            const num = parseInt(match, 10) + 1
            return num.toString().padStart(match.length, '0')
          })
        }
      }
    } else {
      await api.post('contratos/recepciones-contrato/', {
        ...formData,
        contrato: contract.id,
      })
    }
  }

  const handleReceptionClose = (result) => {
    setReceptionModalOpen(false)
    setEditingRC(null)
    if (result?.saved) fetchContract()
  }

  const confirmDeleteRc = async () => {
    if (!deleteRcTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/recepciones-contrato/${deleteRcTarget.id}/`)
      setDeleteRcTarget(null)
      notify({ variant: 'success', text: 'Recepción anulada.' })
      await fetchContract()
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar la recepción.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadPDF = async (rc) => {
    try {
      const response = await api.get(`contratos/recepciones-contrato/${rc.id}/generate_pdf/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const oc = rc.nro_oc || contract.nro_oc
      const rawFilename = oc ? `RC ${oc}.pdf` : `RC ${rc.folio || rc.id}.pdf`
      const filename = rawFilename.replace(/[/\\?%*:|"<>]/g, '-')
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al generar el PDF.' })
    }
  }

  const sortedReceptions = useMemo(() => {
    const list = [...receptions]
    if (!sortConfig.key) return list
    return list.sort((a, b) => {
      const valA = a[sortConfig.key]
      const valB = b[sortConfig.key]
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [receptions, sortConfig])

  const filteredHistory = useMemo(() => {
    const q = debouncedHistorySearch.toLowerCase().trim()
    let rows = history || []
    if (q) {
      rows = rows.filter(
        (log) =>
          (log.accion || '').toLowerCase().includes(q) ||
          (log.detalle || '').toLowerCase().includes(q) ||
          (log.usuario || '').toLowerCase().includes(q),
      )
    }
    const { key, direction } = historySort
    const sorted = [...rows].sort((a, b) => {
      let valA = a[key]
      let valB = b[key]
      if (key === 'fecha') {
        valA = new Date(a.fecha).getTime()
        valB = new Date(b.fecha).getTime()
      } else {
        valA = (valA || '').toString().toLowerCase()
        valB = (valB || '').toString().toLowerCase()
      }
      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [history, debouncedHistorySearch, historySort])

  useEffect(() => {
    setHistoryPage(1)
  }, [debouncedHistorySearch, historySort])

  const historyPageRows = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize
    return filteredHistory.slice(start, start + historyPageSize)
  }, [filteredHistory, historyPage, historyPageSize])

  const handleSortReceptions = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  const handleHistorySort = (key) => {
    setHistorySort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }))
  }

  if (loading) {
    return (
      <div className="page">
        <EmptyState title="Cargando…" description="Obteniendo expediente del contrato." />
      </div>
    )
  }

  if (!contract) return null

  const executionPercentage =
    contract.monto_total > 0
      ? Math.min(Math.round((contract.monto_ejecutado / contract.monto_total) * 100), 100)
      : 0

  const calculateTimeExecution = () => {
    if (!contract.fecha_inicio || (!contract.fecha_termino && !contract.plazo_meses)) {
      return { percentage: 0, monthsLeft: 0 }
    }
    const start = new Date(contract.fecha_inicio)
    let end
    if (contract.fecha_termino) {
      end = new Date(contract.fecha_termino)
    } else {
      end = new Date(start)
      end.setMonth(start.getMonth() + contract.plazo_meses)
    }
    const now = new Date()
    const totalDuration = end.getTime() - start.getTime()
    if (totalDuration <= 0) return { percentage: 100, monthsLeft: 0 }
    const elapsed = now.getTime() - start.getTime()
    const percentage = Math.max(
      0,
      Math.min(Math.round((elapsed / totalDuration) * 100), 100),
    )
    const monthsLeft = Math.max(
      0,
      Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
    )
    return { percentage, monthsLeft }
  }

  const { percentage: timePercentage, monthsLeft } = calculateTimeExecution()

  const tabLabel = (tab) => {
    if (tab.id === 'providers') {
      return `${tab.label} (${contract.proveedores_asociados?.length || 0})`
    }
    if (tab.id === 'receptions') return `${tab.label} (${receptions.length})`
    if (tab.id === 'docs') return `${tab.label} (${contract.documentos?.length || 0})`
    if (tab.id === 'history') return `${tab.label} (${history.length})`
    return tab.label
  }

  const providerColumns = [
    {
      key: 'proveedor',
      header: 'Proveedor',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
      render: (p) => (
        <button
          type="button"
          className="contracts-provider-link"
          onClick={() => setSelectedProvider(p)}
        >
          {p.proveedor_nombre}
        </button>
      ),
    },
    {
      key: 'adjudicado',
      header: 'Adjudicado',
      className: 'col--secondary',
      cardRole: 'subtitle',
      priority: 1,
      render: (p) => formatCurrency(p.monto_adjudicado),
    },
    {
      key: 'ejecutado',
      header: 'Ejecutado',
      className: 'col--tablet-hide',
      cardRole: 'field',
      priority: 2,
      render: (p) => (
        <>
          {formatCurrency(p.monto_ejecutado)}
          {p.monto_consumido_previo > 0 ? (
            <span className="contracts-cat">
              <span>Incluye {formatCurrency(p.monto_consumido_previo)} previo</span>
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: 'saldo',
      header: 'Saldo',
      className: 'col--status',
      cardRole: 'status',
      priority: 1,
      render: (p) => formatCurrency(p.monto_restante),
    },
    {
      key: 'establecimientos',
      header: 'Establec.',
      className: 'col--tablet-hide',
      cardRole: 'field',
      priority: 2,
      render: (p) => (
        <Badge variant="neutral">
          {(p.establecimientos_detalle || p.establecimientos || []).length}
        </Badge>
      ),
    },
    {
      key: 'consumo',
      header: 'Consumo',
      className: 'col--tablet-hide',
      cardRole: 'field',
      priority: 2,
      render: (p) => {
        const pct =
          p.monto_adjudicado > 0
            ? Math.min(100, Math.round((p.monto_ejecutado / p.monto_adjudicado) * 100))
            : 0
        return (
          <div>
            <div className="contracts-gauge__track">
              <div className="contracts-gauge__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="contracts-cat">
              <span>{pct}%</span>
            </span>
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'col--actions',
      render: (p) => (
        <div className="data-table__actions">
          <Button variant="outline" size="sm" onClick={() => setSelectedProvider(p)}>
            Ver
          </Button>
        </div>
      ),
    },
  ]

  const resolveProviderCatalog = (row) => {
    const id = row?.proveedor
    return (
      lookups.providers?.find((p) => String(p.id) === String(id)) ||
      lookups.proveedores?.find((p) => String(p.id) === String(id)) ||
      null
    )
  }

  const receptionColumns = [
    {
      key: 'folio',
      header: 'Folio / OC',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
      sortable: true,
      render: (rc) => (
        <>
          <strong>{rc.folio}</strong>
          <span className="contracts-cat">
            <span>{rc.nro_oc || contract.nro_oc || 'SIN OC'}</span>
          </span>
        </>
      ),
    },
    {
      key: 'descripcion',
      header: 'Glosa',
      className: 'col--secondary',
      cardRole: 'subtitle',
      priority: 1,
      render: (rc) => rc.descripcion || '—',
    },
    {
      key: 'total_pagar',
      header: 'Total RC',
      className: 'col--tablet-hide',
      cardRole: 'field',
      priority: 2,
      sortable: true,
      render: (rc) => formatCurrency(rc.total_pagar),
    },
    {
      key: 'periodo',
      header: 'Periodo',
      className: 'col--status',
      cardRole: 'status',
      priority: 1,
      sortable: true,
      render: (rc) => (
        <Badge variant={rc.nro_factura ? 'success' : 'warning'} dot>
          {rc.nro_factura ? 'Con factura' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'col--actions',
      render: (rc) => (
        <div className="data-table__actions">
          {can('servicios.change_facturaadquisicion') ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingRC(rc)
                setReceptionModalOpen(true)
              }}
            >
              <Icon name="edit" size="sm" />
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(rc)}>
            PDF
          </Button>
          {can('servicios.delete_facturaadquisicion') ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleteRcTarget(rc)}>
              <Icon name="trash" size="sm" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const docColumns = [
    {
      key: 'nombre',
      header: 'Documento',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
    },
    {
      key: 'fecha',
      header: 'Fecha',
      className: 'col--secondary',
      cardRole: 'subtitle',
      priority: 1,
      render: (doc) => formatDate(doc.fecha_subida),
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'col--actions',
      render: (doc) => (
        <div className="data-table__actions">
          <Button variant="outline" size="sm" onClick={() => setPreviewDoc(doc)}>
            Ver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(doc.archivo, '_blank', 'noopener,noreferrer')}
          >
            Descargar
          </Button>
          {can('contratos.delete_documentocontrato') ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleteDocTarget(doc)}>
              <Icon name="trash" size="sm" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const historyColumns = [
    {
      key: 'fecha',
      header: 'Momento',
      className: 'col--secondary',
      cardRole: 'subtitle',
      priority: 1,
      sortable: true,
      render: (log) =>
        new Date(log.fecha).toLocaleString('es-CL', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
    },
    {
      key: 'accion',
      header: 'Acción',
      className: 'col--status',
      cardRole: 'status',
      priority: 1,
      sortable: true,
      render: (log) => <Badge variant="accent">{log.accion}</Badge>,
    },
    {
      key: 'detalle',
      header: 'Detalle',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
      sortable: true,
      render: (log) => log.detalle,
    },
    {
      key: 'usuario',
      header: 'Usuario',
      className: 'col--tablet-hide',
      cardRole: 'field',
      priority: 2,
      sortable: true,
      render: (log) => log.usuario || '—',
    },
  ]

  return (
    <div className="page" data-od-id="contract-detail-page" data-fill-viewport>
      <PageHeader
        icon="contratos"
        title={contract.codigo_mercado_publico}
        description={contract.descripcion}
        breadcrumbs={[
          { label: 'SSGG' },
          { label: 'Contratos', to: '/contracts' },
          { label: contract.codigo_mercado_publico },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            <Badge variant={estadoVariant(contract.estado_nombre)} dot>
              {contract.estado_nombre}
            </Badge>
            {can('contratos.change_contrato') ? (
              <Button variant="primary" size="sm" onClick={() => setEditModalOpen(true)}>
                <Icon name="edit" size="sm" /> Editar
              </Button>
            ) : null}
          </>
        }
      />

      

      <div className="tabs contracts-tabs">
        <ul className="tabs__list" role="tablist" aria-label="Secciones del contrato">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                role="tab"
                id={`contract-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`contract-panel-${tab.id}`}
                className={`tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tabLabel(tab)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="tabs__panel is-active contracts-tabs__panel"
        role="tabpanel"
        id={`contract-panel-${activeTab}`}
        aria-labelledby={`contract-tab-${activeTab}`}
      >
        {activeTab === 'info' ? (
          <div className="contracts-tab contracts-general">
            <div className="contracts-metric-strip">
              <div className="contracts-metric contracts-metric--total">
                <span className="contracts-metric__label">Presupuesto total</span>
                <span className="contracts-metric__value">
                  {formatCurrency(contract.monto_total)}
                </span>
                <span className="contracts-metric__hint">Monto adjudicado del convenio</span>
              </div>
              <div className="contracts-metric contracts-metric--spent">
                <span className="contracts-metric__label">Ejecutado</span>
                <span className="contracts-metric__value">
                  {formatCurrency(contract.monto_ejecutado)}
                </span>
                <div className="contracts-metric__bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, executionPercentage)}%` }} />
                </div>
                <span className="contracts-metric__hint">{executionPercentage}% del presupuesto</span>
              </div>
              <div className="contracts-metric contracts-metric--available">
                <span className="contracts-metric__label">Disponible</span>
                <span className="contracts-metric__value">
                  {formatCurrency(contract.monto_restante)}
                </span>
                <div className="contracts-metric__bar" aria-hidden>
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(0, 100 - executionPercentage))}%`,
                    }}
                  />
                </div>
                <span className="contracts-metric__hint">
                  {Math.max(0, 100 - executionPercentage)}% aún disponible
                </span>
              </div>
              <div className="contracts-metric contracts-metric--time">
                <span className="contracts-metric__label">Plazo restante</span>
                <span className="contracts-metric__value">
                  {monthsLeft}
                  <small> meses</small>
                </span>
                <div className="contracts-metric__bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, timePercentage)}%` }} />
                </div>
                <span className="contracts-metric__hint">
                  {timePercentage}% del tiempo transcurrido
                </span>
              </div>
            </div>
            <div className="contracts-general__top">
              <ChartCard title="Información del proceso" subtitle="Ficha del convenio">
                <dl className="contracts-meta">
                  <div className="contracts-meta__item">
                    <dt>Proceso</dt>
                    <dd>{contract.proceso_nombre || '—'}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Categoría</dt>
                    <dd>{contract.categoria_nombre || '—'}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Orientación</dt>
                    <dd>{contract.orientacion_nombre || 'No definida'}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Tipo de OC</dt>
                    <dd>{contract.tipo_oc === 'UNICA' ? 'Única' : 'Múltiple'}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Nº OC</dt>
                    <dd>{contract.nro_oc || 'No aplica'}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>CDP</dt>
                    <dd>{contract.cdp || '—'}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Adjudicación</dt>
                    <dd>{formatDate(contract.fecha_adjudicacion)}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Inicio</dt>
                    <dd>{formatDate(contract.fecha_inicio)}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Término</dt>
                    <dd>{formatDate(contract.fecha_termino)}</dd>
                  </div>
                  <div className="contracts-meta__item">
                    <dt>Plazo</dt>
                    <dd>
                      {contract.plazo_meses != null
                        ? `${contract.plazo_meses} meses`
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </ChartCard>
              <ChartCard title="Ejecución mensual" subtitle="Histórico de gastos">
                <div className="contracts-chart">
                  {contract.gastos_mensuales?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart
                        data={contract.gastos_mensuales}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorMonto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(val) => `$${val / 1000000}M`}
                        />
                        <Tooltip
                          formatter={(val) => formatCurrency(val)}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="monto"
                          stroke="var(--primary)"
                          strokeWidth={2}
                          fill="url(#colorMonto)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState
                      title="Sin ejecución"
                      description="Aún no hay registros mensuales."
                    />
                  )}
                </div>
              </ChartCard>
            </div>
            <div className="contracts-kpi-grid">
              <ChartCard
                title="Control presupuestario"
                subtitle="Avance del gasto frente al techo"
                range={`${formatCurrency(contract.monto_restante)} disponibles`}
              >
                <div className="chart-kpi">
                  <div className="chart-kpi__label">Presupuesto utilizado</div>
                  <div className="chart-kpi__row">
                    <span className="chart-kpi__value">{executionPercentage}%</span>
                    <span
                      className={`chart-kpi__trend ${
                        executionPercentage >= 80
                          ? 'chart-kpi__trend--up'
                          : executionPercentage >= 40
                            ? 'chart-kpi__trend--flat'
                            : 'chart-kpi__trend--down'
                      }`}
                    >
                      {formatCurrency(contract.monto_restante)} libre
                    </span>
                  </div>
                  <div className="chart-kpi__hint">
                    {formatCurrency(contract.monto_ejecutado)} ejecutados de{' '}
                    {formatCurrency(contract.monto_total)}
                  </div>
                  <div className="contracts-timeline">
                    <div className="contracts-timeline__rail contracts-timeline__rail--success">
                      <div
                        className="contracts-timeline__elapsed contracts-timeline__elapsed--success"
                        style={{ width: `${Math.min(100, executionPercentage)}%` }}
                      />
                      <span
                        className="contracts-timeline__marker contracts-timeline__marker--success"
                        style={{ left: `${Math.min(100, executionPercentage)}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="contracts-timeline__labels">
                      <span>$0</span>
                      <span>Actual</span>
                      <span>Techo</span>
                    </div>
                  </div>
                  <div className="contracts-kpi-split">
                    <div>
                      <span className="contracts-kpi-split__label">Ejecutado</span>
                      <strong>{formatCurrency(contract.monto_ejecutado)}</strong>
                    </div>
                    <div>
                      <span className="contracts-kpi-split__label">Disponible</span>
                      <strong>{formatCurrency(contract.monto_restante)}</strong>
                    </div>
                  </div>
                </div>
              </ChartCard>

              <ChartCard
                title="Control de plazos"
                subtitle="Avance temporal del convenio"
                range={`${monthsLeft} meses restantes`}
              >
                <div className="chart-kpi">
                  <div className="chart-kpi__label">Tiempo transcurrido</div>
                  <div className="chart-kpi__row">
                    <span className="chart-kpi__value">{timePercentage}%</span>
                    <span
                      className={`chart-kpi__trend ${
                        monthsLeft <= 2
                          ? 'chart-kpi__trend--up'
                          : monthsLeft <= 6
                            ? 'chart-kpi__trend--flat'
                            : 'chart-kpi__trend--down'
                      }`}
                    >
                      {monthsLeft} mes{monthsLeft === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <div className="chart-kpi__hint">
                    {formatDate(contract.fecha_inicio)} → {formatDate(contract.fecha_termino)}
                  </div>
                  <div className="contracts-timeline">
                    <div className="contracts-timeline__rail">
                      <div
                        className="contracts-timeline__elapsed"
                        style={{ width: `${Math.min(100, timePercentage)}%` }}
                      />
                      <span
                        className="contracts-timeline__marker"
                        style={{ left: `${Math.min(100, timePercentage)}%` }}
                        aria-hidden
                      />
                    </div>
                    <div className="contracts-timeline__labels">
                      <span>Inicio</span>
                      <span>Hoy</span>
                      <span>Término</span>
                    </div>
                  </div>
                  <div className="contracts-kpi-split">
                    <div>
                      <span className="contracts-kpi-split__label">Plazo total</span>
                      <strong>
                        {contract.plazo_meses != null
                          ? `${contract.plazo_meses} meses`
                          : '—'}
                      </strong>
                    </div>
                    <div>
                      <span className="contracts-kpi-split__label">Restante</span>
                      <strong>
                        {monthsLeft} mes{monthsLeft === 1 ? '' : 'es'}
                      </strong>
                    </div>
                  </div>
                </div>
              </ChartCard>
            </div>
          </div>
        ) : null}

        {activeTab === 'providers' ? (
          <div className="contracts-tab">
            <DataTable
              columns={providerColumns}
              rows={contract.proveedores_asociados || []}
              totalCount={contract.proveedores_asociados?.length || 0}
              emptyTitle="Sin proveedores"
              emptyDescription="No hay proveedores adjudicados."
              fillViewport
              showFooter={false}
              pageSizeId="prov-page"
              mobileCardActions={(p) => ({
                primary: { label: 'Ver detalle', onClick: () => setSelectedProvider(p) },
              })}
              toolbar={
                <div className="table-toolbar__left">
                  <span className="table-toolbar__title">Proveedores adjudicados</span>
                  <Badge variant="neutral">
                    {contract.proveedores_asociados?.length || 0}
                  </Badge>
                </div>
              }
            />
          </div>
        ) : null}

        {activeTab === 'servicios' ? (
          <div className="contracts-tab">
            <ContratoServiciosTab contractId={contract.id} />
          </div>
        ) : null}

        {activeTab === 'receptions' ? (
          <div className="contracts-tab">
            <DataTable
              columns={receptionColumns}
              rows={sortedReceptions}
              totalCount={receptions.length}
              emptyTitle="Sin recepciones"
              emptyDescription="No hay recepciones conformes registradas."
              emptyAction={
                can('servicios.add_facturaadquisicion') ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setEditingRC(null)
                      setReceptionModalOpen(true)
                    }}
                  >
                    <Icon name="plus" size="sm" /> Nueva recepción
                  </Button>
                ) : undefined
              }
              fillViewport
              showFooter={false}
              sortKey={sortConfig.key}
              onSort={handleSortReceptions}
              pageSizeId="rc-page"
              toolbar={
                <>
                  <div className="table-toolbar__left">
                    <span className="table-toolbar__title">Recepciones</span>
                    <Badge variant="neutral">{receptions.length}</Badge>
                  </div>
                  {can('servicios.add_facturaadquisicion') ? (
                    <div className="table-toolbar__right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEditingRC(null)
                          setReceptionModalOpen(true)
                        }}
                      >
                        <Icon name="plus" size="sm" /> Nueva recepción
                      </Button>
                    </div>
                  ) : null}
                </>
              }
            />
          </div>
        ) : null}

        {activeTab === 'docs' ? (
          <div className="contracts-tab">
            <DataTable
              columns={docColumns}
              rows={contract.documentos || []}
              totalCount={contract.documentos?.length || 0}
              emptyTitle="Sin archivos"
              emptyDescription="No hay documentos en el expediente."
              emptyAction={
                can('contratos.add_documentocontrato') ? (
                  <Button variant="primary" size="sm" onClick={() => setDocModalOpen(true)}>
                    <Icon name="plus" size="sm" /> Adjuntar
                  </Button>
                ) : undefined
              }
              fillViewport
              showFooter={false}
              pageSizeId="docs-page"
              toolbar={
                <>
                  <div className="table-toolbar__left">
                    <span className="table-toolbar__title">Expediente</span>
                    <Badge variant="neutral">{contract.documentos?.length || 0}</Badge>
                  </div>
                  {can('contratos.add_documentocontrato') ? (
                    <div className="table-toolbar__right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setDocModalOpen(true)}
                      >
                        <Icon name="plus" size="sm" /> Adjuntar
                      </Button>
                    </div>
                  ) : null}
                </>
              }
            />
          </div>
        ) : null}

        {activeTab === 'history' ? (
          <div className="contracts-tab contracts-history-tab">
            <FiltersBar
              onSearch={() => setHistoryPage(1)}
              onClear={() => {
                setHistorySearch('')
                setHistoryPage(1)
              }}
            >
              <Field label="Buscar" htmlFor="hist-q">
                <div className="input-wrap">
                  <Icon name="search" className="input-wrap__icon" size="sm" />
                  <Input
                    id="hist-q"
                    type="search"
                    placeholder="Acción, detalle o usuario…"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
              </Field>
            </FiltersBar>
            <DataTable
              columns={historyColumns}
              rows={historyPageRows}
              totalCount={filteredHistory.length}
              emptyTitle="Sin historial"
              emptyDescription="No hay registros con la búsqueda actual."
              fillViewport
              page={historyPage}
              pageSize={historyPageSize}
              pageSizeId="hist-page"
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={setHistoryPage}
              onPageSizeChange={(n) => {
                setHistoryPageSize(n)
                setHistoryPage(1)
              }}
              sortKey={historySort.key}
              onSort={handleHistorySort}
              toolbar={
                <div className="table-toolbar__left">
                  <span className="table-toolbar__title">Bitácora</span>
                  <Badge variant="neutral">{filteredHistory.length}</Badge>
                </div>
              }
            />
          </div>
        ) : null}
      </div>

      <ContractModal
        open={isEditModalOpen}
        onClose={handleEditClose}
        onSave={handleEditSave}
        editingId={contract.id}
        initialData={editFormData}
        lookups={lookups}
      />

      <ContractReceptionModal
        open={isReceptionModalOpen}
        onClose={handleReceptionClose}
        onSave={handleCreateReception}
        contract={contract}
        lookups={lookups}
        editingRC={editingRC}
      />

      <Modal
        open={isDocModalOpen}
        onClose={handleDocClose}
        title="Adjuntar documento"
        subheader="PDF, DOCX o imagen · máx. 10MB"
        {...docOverlay.modalProps}
        onOverlayDismiss={handleDocOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={handleDocClose}
              disabled={docOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="contract-doc-form"
              loading={docOverlay.busy}
              disabled={docOverlay.busy || docOverlay.active}
            >
              Subir
            </Button>
          </>
        }
      >
        <form id="contract-doc-form" className="crud-form" onSubmit={handleDocSubmit}>
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="doc-nombre" className="field--full">
              <Input
                id="doc-nombre"
                required
                value={uploadFormData.nombre}
                onChange={(e) =>
                  setUploadFormData({ ...uploadFormData, nombre: e.target.value })
                }
              />
            </Field>
            <Field label="Archivo" required htmlFor="doc-file" className="field--full">
              <FileInput
                id="doc-file"
                label="Seleccionar archivo"
                required
                onChange={(e) =>
                  setUploadFormData({
                    ...uploadFormData,
                    archivo: e.target.files?.[0] || null,
                  })
                }
              />
            </Field>
          </div>
        </form>
      </Modal>

      <DocumentViewerModal
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.nombre}
        subtitle={contract.codigo_mercado_publico}
        documentType="Documento de Contrato"
        fileUrl={previewDoc?.archivo}
      />

      <Modal
        open={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        title={selectedProvider?.proveedor_nombre || 'Proveedor'}
        subheader="Detalle de adjudicación en este contrato"
        footer={
          <Button variant="secondary" type="button" onClick={() => setSelectedProvider(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedProvider ? (
          <div className="ticket-aside__details">
            {(() => {
              const catalog = resolveProviderCatalog(selectedProvider)
              const pct =
                selectedProvider.monto_adjudicado > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (selectedProvider.monto_ejecutado /
                          selectedProvider.monto_adjudicado) *
                          100,
                      ),
                    )
                  : 0
              const establecimientos =
                selectedProvider.establecimientos_detalle ||
                (selectedProvider.establecimientos || [])
                  .map((id) =>
                    typeof id === 'object'
                      ? id
                      : lookups.establishments.find((e) => e.id === id),
                  )
                  .filter(Boolean)
              return (
                <>
                  <DetailItem label="RUT">{catalog?.rut || '—'}</DetailItem>
                  <DetailItem label="Acrónimo">{catalog?.acronimo || '—'}</DetailItem>
                  <DetailItem label="Tipo">
                    {catalog?.tipo_proveedor_nombre || '—'}
                  </DetailItem>
                  <DetailItem label="Contacto">{catalog?.contacto || '—'}</DetailItem>
                  <DetailItem label="Adjudicado">
                    {formatCurrency(selectedProvider.monto_adjudicado)}
                  </DetailItem>
                  <DetailItem label="Ejecutado">
                    {formatCurrency(selectedProvider.monto_ejecutado)}
                  </DetailItem>
                  <DetailItem label="Consumo previo">
                    {formatCurrency(selectedProvider.monto_consumido_previo)}
                  </DetailItem>
                  <DetailItem label="Saldo">
                    {formatCurrency(selectedProvider.monto_restante)}
                  </DetailItem>
                  <DetailItem label="Consumo">
                    <div className="contracts-gauge__track" style={{ marginTop: '0.35rem' }}>
                      <div
                        className="contracts-gauge__fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span>{pct}%</span>
                  </DetailItem>
                  <DetailItem label="Establecimientos">
                    {establecimientos.length ? (
                      <ul className="contracts-estab-list">
                        {establecimientos.map((e) => (
                          <li key={e.id || e.nombre}>{e.nombre || e}</li>
                        ))}
                      </ul>
                    ) : (
                      'Sin asignaciones'
                    )}
                  </DetailItem>
                </>
              )
            })()}
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        open={!!deleteDocTarget}
        onClose={() => {
          if (!deleting) setDeleteDocTarget(null)
        }}
        onConfirm={confirmDeleteDoc}
        title="Eliminar documento"
        description={
          deleteDocTarget ? `¿Eliminar «${deleteDocTarget.nombre}»?` : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />

      <ConfirmModal
        open={!!deleteRcTarget}
        onClose={() => {
          if (!deleting) setDeleteRcTarget(null)
        }}
        onConfirm={confirmDeleteRc}
        title="Anular recepción"
        description="¿Anular esta recepción? El presupuesto se restaurará."
        confirmLabel={deleting ? 'Anulando…' : 'Anular'}
        danger
      />
    </div>
  )
}

export default ContractDetail
