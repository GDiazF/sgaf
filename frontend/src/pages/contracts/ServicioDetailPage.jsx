import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Modal,
  ConfirmModal,
  Alert,
  Drawer,
  EmptyState,
  Icon,
  IconButton,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import api from '../../api'
import PeriodoCalendarioModal from '../../components/contracts/rutas/PeriodoCalendarioModal'
import ConsolidadoModal from '../../components/contracts/rutas/ConsolidadoModal'
import BulkAsistenciaModal from '../../components/contracts/rutas/BulkAsistenciaModal'
import BulkRouteSettingsModal from '../../components/contracts/rutas/BulkRouteSettingsModal'
import RutaFormModal, { EMPTY_FORM } from '../../components/contracts/rutas/RutaFormModal'

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const ServicioDetailPage = () => {
  const { id } = useParams()
  const { can } = usePermission()
  const [servicio, setServicio] = useState(null)
  const [contrato, setContrato] = useState(null)
  const [rutas, setRutas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('all')
  const [selectedRutasTable, setSelectedRutasTable] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [selectedRoute, setSelectedRoute] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelView, setPanelView] = useState('management')
  const [activePeriodId, setActivePeriodId] = useState(null)

  const [isRutaModalOpen, setIsRutaModalOpen] = useState(false)
  const [rutaFormData, setRutaFormData] = useState({ ...EMPTY_FORM })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editRutaData, setEditRutaData] = useState(null)

  const [isPeriodoModalOpen, setIsPeriodoModalOpen] = useState(false)
  const [periodoData, setPeriodoData] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  })
  const periodoOverlay = useFormOverlay()

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkPeriodoData, setBulkPeriodoData] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  })
  const bulkPeriodoOverlay = useFormOverlay()

  const [isActaModalOpen, setIsActaModalOpen] = useState(false)
  const [isConsolidadoModalOpen, setIsConsolidadoModalOpen] = useState(false)
  const [isBulkAsistenciaModalOpen, setIsBulkAsistenciaModalOpen] = useState(false)
  const [isBulkRouteModalOpen, setIsBulkRouteModalOpen] = useState(false)
  const [generatingActa, setGeneratingActa] = useState(false)
  const [actaSelection, setActaSelection] = useState({
    rutas: [],
    periodos: [],
    establecimientos: [],
  })

  const [sortConfig, setSortConfig] = useState({ key: 'nombre', direction: 'asc' })

  const [gruposPreset, setGruposPreset] = useState([])
  const [isSavingPreset, setIsSavingPreset] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [showSavePresetInput, setShowSavePresetInput] = useState(false)

  const { notify } = useNotify()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deletePresetId, setDeletePresetId] = useState(null)

  const closeActaModal = () => {
    setIsActaModalOpen(false)
    setActaSelection({ rutas: [], periodos: [], establecimientos: [] })
    setShowSavePresetInput(false)
    setNewPresetName('')
  }

  const handleGenerateActa = async () => {
    if (
      actaSelection.rutas.length === 0 ||
      actaSelection.periodos.length === 0 ||
      actaSelection.establecimientos.length === 0
    ) {
      notify({
        variant: 'warning',
        text: 'Por favor selecciona al menos una ruta, un periodo y un establecimiento.',
      })
      return
    }

    setGeneratingActa(true)
    try {
      const response = await api.post(
        `contratos/servicios/${id}/generar_acta_conformidad/`,
        {
          ruta_ids: actaSelection.rutas,
          periodo_ids: actaSelection.periodos,
          est_ids: actaSelection.establecimientos,
        },
        { responseType: 'blob' },
      )

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Acta_Conformidad_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      closeActaModal()
    } catch (err) {
      console.error('Error generating Acta:', err)
      notify({ variant: 'danger', text: 'Error al generar el acta de conformidad.' })
    } finally {
      setGeneratingActa(false)
    }
  }

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      notify({ variant: 'warning', text: 'Ingresa un nombre para el grupo.' })
      return
    }
    setIsSavingPreset(true)
    try {
      await api.post('contratos/grupos-preset/', {
        nombre: newPresetName,
        servicio: id,
        rutas: actaSelection.rutas,
      })
      setNewPresetName('')
      setShowSavePresetInput(false)
      fetchGruposPreset()
    } catch (err) {
      console.error('Error saving preset:', err)
      notify({ variant: 'danger', text: 'Error al guardar el grupo.' })
    } finally {
      setIsSavingPreset(false)
    }
  }

  const handleApplyPreset = (grupo) => {
    setActaSelection({
      ...actaSelection,
      rutas: grupo.rutas,
      periodos: [],
    })
  }

  const confirmDeletePreset = async () => {
    if (!deletePresetId) return
    try {
      await api.delete(`contratos/grupos-preset/${deletePresetId}/`)
      setDeletePresetId(null)
      fetchGruposPreset()
      notify({ variant: 'success', text: 'Grupo eliminado.' })
    } catch {
      notify({ variant: 'danger', text: 'Error al eliminar.' })
    }
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`contratos/servicios/${id}/`)
      setServicio(res.data)

      const rutasRes = await api.get(`contratos/rutas/?servicio=${id}`)
      const rutasData = (rutasRes.data.results || rutasRes.data).map((r) => ({
        ...r,
        periodos: (r.periodos || []).sort(
          (a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio),
        ),
      }))
      setRutas(rutasData)

      const contratoRes = await api.get(`contratos/contratos/${res.data.contrato}/`)
      setContrato(contratoRes.data)

      setSelectedRoute((prev) => {
        if (!prev) return prev
        return rutasData.find((r) => r.id === prev.id) || prev
      })
    } catch {
      setError('No se pudo cargar la información del servicio.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const fetchGruposPreset = useCallback(async () => {
    try {
      const res = await api.get(`contratos/grupos-preset/?servicio=${id}`)
      const data = Array.isArray(res.data) ? res.data : res.data.results || []
      setGruposPreset(data)
    } catch (err) {
      console.error('Error fetching presets:', err)
      setGruposPreset([])
    }
  }, [id])

  useEffect(() => {
    if (!isActaModalOpen) return

    const validEstIds = rutas
      .filter((r) => actaSelection.rutas.includes(r.id))
      .flatMap((r) => r.establecimientos || [])

    const filteredEsts = actaSelection.establecimientos.filter((estId) =>
      validEstIds.includes(estId),
    )

    if (filteredEsts.length !== actaSelection.establecimientos.length) {
      setActaSelection((prev) => ({
        ...prev,
        establecimientos: filteredEsts,
      }))
    }
  }, [actaSelection.rutas, rutas, isActaModalOpen, actaSelection.establecimientos.length])

  useEffect(() => {
    fetchData()
    fetchGruposPreset()
  }, [id, fetchGruposPreset, fetchData])

  const actaAvailableMonths = useMemo(() => {
    const selectedRutasData = rutas.filter((r) => actaSelection.rutas.includes(r.id))
    const months = []

    selectedRutasData.forEach((r) => {
      ;(r.periodos || []).forEach((p) => {
        const key = `${p.mes_referencia}-${p.anio_referencia}`
        if (!months.find((m) => m.key === key)) {
          months.push({
            key,
            mes: p.mes_referencia,
            anio: p.anio_referencia,
            label: `${MONTH_NAMES[p.mes_referencia - 1]} ${p.anio_referencia}`,
          })
        }
      })
    })

    return months
      .map((m) => {
        const matchingPeriodIds = []
        let coverageCount = 0
        selectedRutasData.forEach((r) => {
          const p = (r.periodos || []).find(
            (periodo) =>
              periodo.mes_referencia === m.mes && periodo.anio_referencia === m.anio,
          )
          if (p) {
            matchingPeriodIds.push(p.id)
            coverageCount++
          }
        })
        return {
          ...m,
          matchingPeriodIds,
          isFullyCovered: coverageCount === selectedRutasData.length && selectedRutasData.length > 0,
        }
      })
      .sort((a, b) => b.anio * 12 + b.mes - (a.anio * 12 + a.mes))
  }, [rutas, actaSelection.rutas])

  const selectedActaMonthKey = useMemo(() => {
    if (!actaSelection.periodos.length) return ''
    const match = actaAvailableMonths.find(
      (m) =>
        m.matchingPeriodIds.length > 0 &&
        m.matchingPeriodIds.length === actaSelection.periodos.length &&
        m.matchingPeriodIds.every((pid) => actaSelection.periodos.includes(pid)),
    )
    return match?.key || ''
  }, [actaAvailableMonths, actaSelection.periodos])

  useEffect(() => {
    if (!isActaModalOpen || !actaSelection.periodos.length) return
    if (selectedActaMonthKey) return
    setActaSelection((prev) => ({ ...prev, periodos: [] }))
  }, [isActaModalOpen, actaSelection.periodos.length, selectedActaMonthKey])

  const openRoutePanel = (ruta, view = 'management') => {
    setSelectedRoute(ruta)
    setPanelView(view)
    setIsPanelOpen(true)
  }

  const handleCreateRuta = async (data) => {
    await api.post('contratos/rutas/', { ...data, servicio: id })
  }

  const handleRutaModalClose = (result) => {
    setIsRutaModalOpen(false)
    if (result?.saved) {
      setRutaFormData({ ...EMPTY_FORM })
      fetchData()
    }
  }

  const confirmDeleteRuta = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/rutas/${deleteTarget.id}/`)
      setDeleteTarget(null)
      fetchData()
      notify({ variant: 'success', text: 'Ruta eliminada.' })
    } catch {
      notify({ variant: 'danger', text: 'Error al eliminar la ruta.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleUpdateRuta = async (data) => {
    await api.put(`contratos/rutas/${data.id}/`, data)
  }

  const handleEditRutaModalClose = (result) => {
    setIsEditModalOpen(false)
    if (result?.saved) {
      setEditRutaData(null)
      fetchData()
    }
  }

  const openEditRutaModal = (ruta) => {
    const pa = contrato?.proveedores_asociados.find(
      (p) => p.proveedor === parseInt(ruta.proveedor, 10),
    )
    const validEstIds = pa ? pa.establecimientos_detalle.map((e) => e.id) : []

    setEditRutaData({
      ...ruta,
      proveedor: ruta.proveedor.toString(),
      establecimientos: (ruta.establecimientos || []).filter((estId) =>
        validEstIds.includes(estId),
      ),
      itinerario: ruta.itinerario || '',
      incluir_fines_semana: ruta.incluir_fines_semana ?? false,
      excluir_feriados: ruta.excluir_feriados ?? true,
    })
    setIsEditModalOpen(true)
  }

  const closePeriodoModal = () => {
    if (periodoOverlay.busy) return
    periodoOverlay.reset()
    setIsPeriodoModalOpen(false)
  }

  const handlePeriodoOverlayDismiss = () => {
    if (periodoOverlay.status === 'success') {
      periodoOverlay.reset()
      setIsPeriodoModalOpen(false)
      fetchData()
      return
    }
    periodoOverlay.dismiss()
  }

  const handleGeneratePeriod = async (e) => {
    e.preventDefault()
    try {
      await periodoOverlay.run(
        async () => {
          await api.post(`contratos/rutas/${selectedRoute.id}/generar-periodo/`, periodoData)
        },
        {
          successDescription: 'Periodo generado.',
          formatError: (err) =>
            err.response?.data?.error || formatApiFormError(err, 'Error al generar periodo.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedRutas = useMemo(() => {
    const sortableItems = [
      ...rutas.filter((r) => {
        const matchesSearch =
          r.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.proveedor_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesProvider =
          selectedProvider === 'all' || r.proveedor === parseInt(selectedProvider, 10)
        return matchesSearch && matchesProvider
      }),
    ]

    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        if (sortConfig.key === 'proveedor_nombre') {
          aVal = a.proveedor_nombre
          bVal = b.proveedor_nombre
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortableItems
  }, [rutas, searchTerm, selectedProvider, sortConfig])

  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedProvider])

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedRutas.slice(start, start + pageSize)
  }, [sortedRutas, page, pageSize])

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selectedRutasTable.includes(r.id))

  const toggleSelectAllPage = (checked) => {
    if (checked) {
      const ids = new Set([...selectedRutasTable, ...pageRows.map((r) => r.id)])
      setSelectedRutasTable([...ids])
    } else {
      const pageIds = new Set(pageRows.map((r) => r.id))
      setSelectedRutasTable(selectedRutasTable.filter((rid) => !pageIds.has(rid)))
    }
  }

  const closeBulkPeriodoModal = () => {
    if (bulkPeriodoOverlay.busy) return
    bulkPeriodoOverlay.reset()
    setIsBulkModalOpen(false)
  }

  const handleBulkPeriodoOverlayDismiss = () => {
    if (bulkPeriodoOverlay.status === 'success') {
      bulkPeriodoOverlay.reset()
      setIsBulkModalOpen(false)
      setSelectedRutasTable([])
      fetchData()
      return
    }
    bulkPeriodoOverlay.dismiss()
  }

  const handleBulkCreatePeriod = async (e) => {
    e.preventDefault()
    try {
      await bulkPeriodoOverlay.run(
        async () => {
          const res = await api.post('contratos/rutas/bulk-generar-periodo/', {
            ruta_ids: selectedRutasTable,
            ...bulkPeriodoData,
          })
          return res.data
        },
        {
          successDescription: 'Periodos generados masivamente.',
          formatError: (err) => formatApiFormError(err, 'Error al generar periodos masivos.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const drawerTitle =
    panelView === 'contract'
      ? 'Detalles del contrato'
      : selectedRoute?.nombre || 'Ruta'

  const drawerSub =
    panelView === 'info'
      ? 'Ficha técnica'
      : panelView === 'contract'
        ? 'Información legal'
        : 'Gestión de operaciones'

  const columns = [
    {
      key: 'select',
      header: (
        <span className="rutas-detail-select-col">
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={(e) => toggleSelectAllPage(e.target.checked)}
            aria-label="Seleccionar todas"
          />
        </span>
      ),
      className: 'rutas-detail-select-col',
      render: (ruta) => (
        <span className="rutas-detail-select-col" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRutasTable.includes(ruta.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRutasTable([...selectedRutasTable, ruta.id])
              } else {
                setSelectedRutasTable(selectedRutasTable.filter((rid) => rid !== ruta.id))
              }
            }}
            aria-label={`Seleccionar ${ruta.nombre}`}
          />
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre de ruta',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
      sortable: true,
      render: (ruta) => (
        <button
          type="button"
          className="table-link"
          onClick={() => openRoutePanel(ruta, 'management')}
        >
          <strong>{ruta.nombre}</strong>
        </button>
      ),
    },
    {
      key: 'itinerario',
      header: 'Detalle del trayecto',
      className: 'col--secondary',
      cardRole: 'subtitle',
      priority: 1,
      sortable: true,
      render: (ruta) => ruta.itinerario || 'Sin detalle técnico',
    },
    {
      key: 'proveedor_nombre',
      header: 'Proveedor',
      cardRole: 'field',
      priority: 1,
      sortable: true,
      render: (ruta) => ruta.proveedor_nombre || '—',
    },
    {
      key: 'valor_diario',
      header: 'Valor diario',
      className: 'col--status',
      cardRole: 'status',
      priority: 1,
      sortable: true,
      render: (ruta) => (
        <Badge variant="neutral">
          ${new Intl.NumberFormat('es-CL').format(ruta.valor_diario)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'col--actions',
      render: (ruta) => (
        <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openRoutePanel(ruta, 'info')}
            title="Ver ficha técnica"
          >
            <Icon name="info" size="sm" />
          </Button>
          {can('contratos.change_rutatransporte') ? (
            <Button variant="ghost" size="sm" onClick={() => openEditRutaModal(ruta)}>
              <Icon name="edit" size="sm" />
            </Button>
          ) : null}
          {can('contratos.delete_rutatransporte') ? (
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(ruta)}>
              <Icon name="trash" size="sm" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  if (loading && !servicio) {
    return (
      <div className="page" data-od-id="rutas-detail-page" data-fill-viewport>
        <p className="sr-only" role="status">
          Cargando servicio…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page" data-od-id="rutas-detail-page" data-fill-viewport>
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      </div>
    )
  }

  return (
    <div className="page" data-od-id="rutas-detail-page" data-fill-viewport>
      <PageHeader
        icon="rutas"
        title={servicio?.nombre || 'Servicio'}
        description={`Control operativo y gestión de periodos (${rutas.length} rutas)`}
        breadcrumbs={[
          { label: 'SSGG' },
          { label: 'Gestión de Rutas', to: '/contracts/servicios' },
          { label: servicio?.nombre || 'Detalle' },
        ]}
        linkComponent={Link}
        split
        actions={
          <div className="rutas-detail-toolbar">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPanelView('contract')
                setIsPanelOpen(true)
              }}
            >
              <Icon name="info" size="sm" /> Info contrato
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConsolidadoModalOpen(true)}
            >
              <Icon name="file" size="sm" /> Consolidado
            </Button>
            {can('contratos.add_rutatransporte') ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setRutaFormData({ ...EMPTY_FORM })
                  setIsRutaModalOpen(true)
                }}
              >
                <Icon name="plus" size="sm" /> Nueva ruta
              </Button>
            ) : null}
          </div>
        }
      />

      

      <FiltersBar
        onSearch={() => setPage(1)}
        onClear={() => {
          setSearchTerm('')
          setSelectedProvider('all')
          setSelectedRutasTable([])
          setPage(1)
        }}
      >
        <Field label="Buscar" htmlFor="ruta-detail-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="ruta-detail-q"
              type="search"
              placeholder="Buscar ruta…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
        <Field label="Proveedor" htmlFor="ruta-detail-prov">
          <Select
            id="ruta-detail-prov"
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value)
              setSelectedRutasTable([])
            }}
          >
            <option value="all">Todos</option>
            {contrato?.proveedores_asociados.map((p) => (
              <option key={p.id} value={p.proveedor}>
                {p.proveedor_nombre}
              </option>
            ))}
          </Select>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        totalCount={sortedRutas.length}
        loading={loading}
        emptyTitle="Sin rutas"
        emptyDescription="No hay rutas con los filtros actuales."
        emptyAction={
          can('contratos.add_rutatransporte') ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setRutaFormData({ ...EMPTY_FORM })
                setIsRutaModalOpen(true)
              }}
            >
              <Icon name="plus" size="sm" /> Nueva ruta
            </Button>
          ) : undefined
        }
        fillViewport
        page={page}
        pageSize={pageSize}
        pageSizeId="ruta-detail-page"
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setPage(1)
        }}
        onSort={(key) => requestSort(key)}
        sortKey={sortConfig.key}
        toolbar={
          <div className="table-toolbar__left rutas-detail-toolbar">
            <span className="table-toolbar__title">Rutas operativas</span>
            <Badge variant="neutral">{sortedRutas.length}</Badge>
            {selectedRutasTable.length > 0 && can('contratos.add_periodocobro') ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <Icon name="reservas" size="sm" /> Abrir periodos (
                {selectedRutasTable.length})
              </Button>
            ) : null}
            {can('contratos.change_ausenciaruta') ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBulkAsistenciaModalOpen(true)}
              >
                <Icon name="reservas" size="sm" /> Gestión asistencia
              </Button>
            ) : null}
            {can('contratos.change_rutatransporte') ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsBulkRouteModalOpen(true)}
              >
                <Icon name="procedimientos" size="sm" /> Config. masiva
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => setIsActaModalOpen(true)}>
              <Icon name="file" size="sm" /> Acta
            </Button>
          </div>
        }
        mobileCardActions={(ruta) => ({
          primary: {
            label: 'Gestionar',
            onClick: () => openRoutePanel(ruta, 'management'),
          },
          secondary: can('contratos.change_rutatransporte')
            ? { label: 'Editar', onClick: () => openEditRutaModal(ruta) }
            : undefined,
        })}
      />

      <Drawer
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={drawerTitle}
        wide
      >
        <p style={{ marginTop: 0, fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
          {drawerSub}
        </p>

        {panelView === 'contract' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="rutas-detail-contract-budget">
              <p className="rutas-detail-contract-budget__label">Ejecución presupuestaria</p>
              <p className="rutas-detail-contract-budget__amount">
                ${new Intl.NumberFormat('es-CL').format(contrato?.monto_ejecutado || 0)}
              </p>
              <p style={{ fontSize: 'var(--text-xs)', opacity: 0.7, marginTop: 4 }}>
                Consumido de $
                {new Intl.NumberFormat('es-CL').format(contrato?.monto_total || 0)}
              </p>
              <div className="rutas-detail-contract-budget__bar">
                <span
                  style={{
                    width: `${
                      contrato?.monto_total > 0
                        ? (contrato.monto_ejecutado / contrato.monto_total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-3)',
                }}
              >
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>Disponible</p>
                  <p style={{ fontWeight: 700 }}>
                    ${new Intl.NumberFormat('es-CL').format(contrato?.monto_restante || 0)}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>
                    Gasto mensual prom.
                  </p>
                  <p style={{ fontWeight: 700 }}>
                    $
                    {new Intl.NumberFormat('es-CL').format(
                      Math.round(contrato?.monto_total / (contrato?.plazo_meses || 1)),
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rutas-detail-contract-meta">
              <div className="rutas-detail-contract-chip">
                <p>Nº CDP</p>
                <strong>{contrato?.cdp || 'Sin asignar'}</strong>
              </div>
              <div className="rutas-detail-contract-chip">
                <p>Nº orden compra</p>
                <strong>{contrato?.nro_oc || 'Sin asignar'}</strong>
              </div>
            </div>

            <div>
              <h4 className="rutas-detail-section-title">Vigencia del contrato</h4>
              <div className="rutas-detail-timeline">
                <div className="rutas-detail-timeline__item">
                  <strong>Fecha de inicio</strong>
                  <span>
                    {contrato?.fecha_inicio
                      ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
                <div className="rutas-detail-timeline__item">
                  <strong>Plazo de ejecución</strong>
                  <span>{contrato?.plazo_meses} meses de operación</span>
                </div>
                <div className="rutas-detail-timeline__item">
                  <strong>Fecha de término</strong>
                  <span>
                    {contrato?.fecha_termino
                      ? new Date(contrato.fecha_termino).toLocaleDateString('es-CL', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="rutas-detail-section-title">Clasificación técnica</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  ['Categoría', contrato?.categoria_nombre],
                  ['Proceso', contrato?.proceso_nombre],
                  ['Orientación', contrato?.orientacion_nombre],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rutas-detail-contract-chip"
                    style={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <p style={{ margin: 0 }}>{label}</p>
                    <strong>{value || '—'}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="rutas-detail-section-title">Descripción del servicio</h4>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: 0 }}>
                {contrato?.descripcion || '—'}
              </p>
            </div>

            <div>
              <h4 className="rutas-detail-section-title">
                Proveedores adjudicados ({contrato?.proveedores_asociados?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {contrato?.proveedores_asociados.map((pa) => (
                  <div key={pa.id} className="rutas-detail-provider-card">
                    <div className="rutas-detail-provider-card__top">
                      <strong>{pa.proveedor_nombre}</strong>
                      <span>
                        ${new Intl.NumberFormat('es-CL').format(pa.monto_adjudicado)}
                      </span>
                    </div>
                    <div className="rutas-detail-provider-card__bottom">
                      <span>
                        Restante: $
                        {new Intl.NumberFormat('es-CL').format(pa.monto_restante)}
                      </span>
                      <span>
                        {pa.monto_adjudicado > 0
                          ? Math.round((pa.monto_ejecutado / pa.monto_adjudicado) * 100)
                          : 0}
                        % ejecutado
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="rutas-detail-drawer-stats">
              <div className="rutas-detail-drawer-stat">
                <p>Corte de pago</p>
                <strong>
                  {selectedRoute?.dia_inicio_periodo} – {selectedRoute?.dia_fin_periodo}
                </strong>
              </div>
              <div className="rutas-detail-drawer-stat">
                <p>Valor diario</p>
                <strong>
                  $
                  {new Intl.NumberFormat('es-CL').format(selectedRoute?.valor_diario || 0)}
                </strong>
              </div>
            </div>

            {panelView === 'management' ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                    Historial de periodos
                  </h4>
                  {can('contratos.add_periodocobro') ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsPeriodoModalOpen(true)}
                    >
                      <Icon name="plus" size="sm" /> Generar
                    </Button>
                  ) : null}
                </div>
                <div className="rutas-detail-period-list">
                  {selectedRoute?.periodos?.map((periodo) => (
                    <button
                      key={periodo.id}
                      type="button"
                      className="rutas-detail-period-item"
                      onClick={() => setActivePeriodId(periodo.id)}
                    >
                      <span
                        className={`rutas-detail-period-item__dot${
                          periodo.estado === 'CERRADO' ? ' is-closed' : ''
                        }`}
                      />
                      <span className="rutas-detail-period-item__meta">
                        <strong>{periodo.nombre_estandarizado}</strong>
                        <span>Estado: {periodo.estado}</span>
                      </span>
                      <Icon name="chevron" size="sm" />
                    </button>
                  ))}
                  {selectedRoute?.periodos?.length === 0 ? (
                    <EmptyState
                      title="No hay periodos generados"
                      description="Genera el primer periodo de cobro para esta ruta."
                    />
                  ) : null}
                </div>
              </>
            ) : null}

            {panelView === 'info' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="rutas-detail-drawer-stats">
                  <div className="rutas-detail-drawer-stat">
                    <p>Fines de semana</p>
                    <strong>
                      {selectedRoute?.incluir_fines_semana ? 'Incluidos' : 'Excluidos'}
                    </strong>
                  </div>
                  <div className="rutas-detail-drawer-stat">
                    <p>Días feriados</p>
                    <strong>
                      {selectedRoute?.excluir_feriados ? 'Excluidos' : 'Incluidos'}
                    </strong>
                  </div>
                </div>

                <div className="rutas-detail-contract-chip">
                  <p>Detalle del itinerario</p>
                  <strong style={{ fontWeight: 500 }}>
                    {selectedRoute?.itinerario ||
                      'No se ha definido un detalle técnico del trayecto para esta ruta operativa.'}
                  </strong>
                </div>

                <div>
                  <h4 className="rutas-detail-section-title">
                    Establecimientos ({selectedRoute?.establecimientos_detalle?.length || 0})
                  </h4>
                  <div className="rutas-detail-chips">
                    {selectedRoute?.establecimientos_detalle?.map((est) => (
                      <span key={est.id} className="rutas-detail-chip">
                        {est.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Drawer>

      <PeriodoCalendarioModal
        open={!!activePeriodId}
        periodoId={activePeriodId}
        onClose={() => {
          setActivePeriodId(null)
          fetchData()
        }}
      />

      <BulkAsistenciaModal
        open={isBulkAsistenciaModalOpen}
        onClose={() => setIsBulkAsistenciaModalOpen(false)}
        rutas={rutas}
        onUpdate={fetchData}
      />

      <BulkRouteSettingsModal
        open={isBulkRouteModalOpen}
        onClose={(result) => {
          setIsBulkRouteModalOpen(false)
          if (result?.saved) fetchData()
        }}
        rutas={rutas}
      />

      <ConsolidadoModal
        open={isConsolidadoModalOpen}
        onClose={() => setIsConsolidadoModalOpen(false)}
        rutas={rutas}
      />

      <RutaFormModal
        open={isRutaModalOpen}
        onClose={handleRutaModalClose}
        mode="create"
        formData={rutaFormData}
        setFormData={setRutaFormData}
        onSave={handleCreateRuta}
        contrato={contrato}
      />

      <RutaFormModal
        open={isEditModalOpen && !!editRutaData}
        onClose={handleEditRutaModalClose}
        mode="edit"
        formData={editRutaData}
        setFormData={setEditRutaData}
        onSave={handleUpdateRuta}
        contrato={contrato}
        showEditWarning
      />

      <Modal
        open={isPeriodoModalOpen}
        onClose={closePeriodoModal}
        title="Generar periodo"
        {...periodoOverlay.modalProps}
        onOverlayDismiss={handlePeriodoOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closePeriodoModal}
              disabled={periodoOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="generar-periodo-form"
              loading={periodoOverlay.busy}
              disabled={periodoOverlay.busy || periodoOverlay.active}
            >
              Generar periodo
            </Button>
          </>
        }
      >
        <form id="generar-periodo-form" className="crud-form" onSubmit={handleGeneratePeriod}>
          <div className="form-grid">
            <Field label="Mes del periodo" htmlFor="periodo-mes">
              <Select
                id="periodo-mes"
                value={periodoData.mes}
                onChange={(e) =>
                  setPeriodoData({ ...periodoData, mes: parseInt(e.target.value, 10) })
                }
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Año" htmlFor="periodo-anio">
              <Input
                id="periodo-anio"
                type="number"
                value={periodoData.anio}
                onChange={(e) =>
                  setPeriodoData({ ...periodoData, anio: parseInt(e.target.value, 10) })
                }
              />
            </Field>
          </div>
          {selectedRoute ? (
            <div className="rutas-detail-period-preview" style={{ marginTop: 'var(--space-4)' }}>
              <p className="rutas-detail-period-preview__label">
                <Icon name="reservas" size="sm" /> Rango de fechas estimado
              </p>
              <div className="rutas-detail-period-preview__range">
                <div>
                  <p>
                    {selectedRoute.dia_inicio_periodo}/
                    {periodoData.mes === 1 ? 12 : periodoData.mes - 1}/
                    {periodoData.mes === 1 ? periodoData.anio - 1 : periodoData.anio}
                  </p>
                  <span>Inicio</span>
                </div>
                <Icon name="chevron" size="sm" />
                <div>
                  <p>
                    {selectedRoute.dia_fin_periodo}/{periodoData.mes}/{periodoData.anio}
                  </p>
                  <span>Término</span>
                </div>
              </div>
            </div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={isBulkModalOpen}
        onClose={closeBulkPeriodoModal}
        title="Apertura masiva"
        subheader={`${selectedRutasTable.length} rutas seleccionadas`}
        {...bulkPeriodoOverlay.modalProps}
        onOverlayDismiss={handleBulkPeriodoOverlayDismiss}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={closeBulkPeriodoModal}
              disabled={bulkPeriodoOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="bulk-periodo-form"
              loading={bulkPeriodoOverlay.busy}
              disabled={bulkPeriodoOverlay.busy || bulkPeriodoOverlay.active}
            >
              Generar periodos masivos
            </Button>
          </>
        }
      >
        <form id="bulk-periodo-form" className="crud-form" onSubmit={handleBulkCreatePeriod}>
          <div className="form-grid">
            <Field label="Mes del periodo" htmlFor="bulk-mes">
              <Select
                id="bulk-mes"
                value={bulkPeriodoData.mes}
                onChange={(e) =>
                  setBulkPeriodoData({ ...bulkPeriodoData, mes: e.target.value })
                }
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('es-CL', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Año" htmlFor="bulk-anio">
              <Input
                id="bulk-anio"
                type="number"
                value={bulkPeriodoData.anio}
                onChange={(e) =>
                  setBulkPeriodoData({ ...bulkPeriodoData, anio: e.target.value })
                }
              />
            </Field>
          </div>
          <Alert variant="warning" title="Nota" style={{ marginTop: 'var(--space-4)' }}>
            Se generarán automáticamente los calendarios operativos para todas las rutas
            seleccionadas. Los periodos que ya existan serán ignorados.
          </Alert>
        </form>
      </Modal>

      <Modal
        open={isActaModalOpen}
        onClose={closeActaModal}
        title="Generar acta de conformidad operativa"
        subheader="Configuración masiva de reporte oficial"
        size="lg"
        className="rutas-detail-modal--xl modal--shell"
        footer={
          <>
            <div className="rutas-detail-acta-summary" style={{ marginRight: 'auto' }}>
              <span>
                <strong>{actaSelection.rutas.length}</strong> rutas
              </span>
              <span>
                <strong>{selectedActaMonthKey ? 1 : 0}</strong> mes
              </span>
              <span>
                <strong>{actaSelection.establecimientos.length}</strong> firmas
              </span>
            </div>
            <Button variant="ghost" onClick={closeActaModal} disabled={generatingActa}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateActa}
              loading={generatingActa}
              disabled={
                generatingActa ||
                actaSelection.rutas.length === 0 ||
                actaSelection.periodos.length === 0
              }
            >
              <Icon name="file" size="sm" /> Generar acta
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div
            style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                marginBottom: 'var(--space-3)',
              }}
            >
              <div>
                <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                  Grupos de rutas guardados
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                  Carga rápida de selecciones frecuentes
                </p>
              </div>
              {actaSelection.rutas.length > 0 && !showSavePresetInput ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowSavePresetInput(true)}
                >
                  Guardar selección actual
                </Button>
              ) : null}
            </div>

            {showSavePresetInput ? (
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-3)',
                  flexWrap: 'wrap',
                }}
              >
                <Input
                  autoFocus
                  placeholder="Nombre del grupo (ej: Zona Norte)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                  style={{ flex: 1, minWidth: 180 }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSavePreset}
                  loading={isSavingPreset}
                >
                  Confirmar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavePresetInput(false)}
                >
                  Cancelar
                </Button>
              </div>
            ) : null}

            <div className="rutas-detail-acta-presets">
              {[...gruposPreset]
                .sort((a, b) =>
                  String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', {
                    sensitivity: 'base',
                  }),
                )
                .map((grupo) => (
                  <div key={grupo.id} className="rutas-detail-acta-preset">
                    <button
                      type="button"
                      className="rutas-detail-acta-preset__apply"
                      onClick={() => handleApplyPreset(grupo)}
                    >
                      <span className="rutas-detail-acta-preset__name">{grupo.nombre}</span>
                      <Badge variant="neutral">{grupo.rutas.length}</Badge>
                    </button>
                    <IconButton
                      aria-label={`Eliminar grupo ${grupo.nombre}`}
                      onClick={() => setDeletePresetId(grupo.id)}
                    >
                      <Icon name="close" size={14} />
                    </IconButton>
                  </div>
                ))}
              {gruposPreset.length === 0 ? (
                <p className="rutas-detail-acta-preset__empty">
                  No tienes grupos guardados para este servicio.
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                1. Seleccionar rutas ({actaSelection.rutas.length})
              </h4>
              <div className="rutas-detail-est-actions">
                <button
                  type="button"
                  onClick={() =>
                    setActaSelection({
                      ...actaSelection,
                      rutas: rutas.map((r) => r.id),
                      periodos: [],
                    })
                  }
                >
                  Seleccionar todas
                </button>
                <button
                  type="button"
                  className="is-muted"
                  onClick={() =>
                    setActaSelection({
                      ...actaSelection,
                      rutas: [],
                      periodos: [],
                      establecimientos: [],
                    })
                  }
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="rutas-detail-acta-check-grid rutas-detail-acta-check-grid--rutas">
              {rutas.map((r) => {
                const isSelected = actaSelection.rutas.includes(r.id)
                return (
                  <label
                    key={r.id}
                    className={`rutas-detail-acta-check${isSelected ? ' is-on' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setActaSelection({
                          ...actaSelection,
                          rutas: isSelected
                            ? actaSelection.rutas.filter((rid) => rid !== r.id)
                            : [...actaSelection.rutas, r.id],
                          periodos: [],
                        })
                      }}
                    />
                    <span>{r.nombre}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                2. Seleccionar periodo de cobro
              </h4>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                {actaSelection.rutas.length === 0
                  ? 'Selecciona rutas primero'
                  : `Analizando ${actaSelection.rutas.length} rutas`}
              </span>
            </div>
            <div className="rutas-detail-acta-period">
              {actaSelection.rutas.length === 0 ? (
                <p className="rutas-detail-acta-period__hint">
                  Primero selecciona las rutas operativas
                </p>
              ) : actaAvailableMonths.length === 0 ? (
                <p className="rutas-detail-acta-period__hint">
                  Las rutas seleccionadas no tienen periodos de cobro.
                </p>
              ) : (
                <Field label="Periodo" htmlFor="acta-periodo">
                  <Select
                    id="acta-periodo"
                    value={selectedActaMonthKey}
                    onChange={(e) => {
                      const key = e.target.value
                      const month = actaAvailableMonths.find((m) => m.key === key)
                      setActaSelection({
                        ...actaSelection,
                        periodos: month ? month.matchingPeriodIds : [],
                      })
                    }}
                  >
                    <option value="">Seleccionar periodo…</option>
                    {actaAvailableMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                        {!m.isFullyCovered ? ' (cobertura parcial)' : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-2)',
              }}
            >
              <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                3. Firmas de establecimientos ({actaSelection.establecimientos.length})
              </h4>
              <div className="rutas-detail-est-actions">
                <button
                  type="button"
                  onClick={() => {
                    const allEids = rutas
                      .filter((r) => actaSelection.rutas.includes(r.id))
                      .flatMap((r) => r.establecimientos)
                    setActaSelection({
                      ...actaSelection,
                      establecimientos: [...new Set(allEids)],
                    })
                  }}
                >
                  Incluir todos
                </button>
                <button
                  type="button"
                  className="is-muted"
                  onClick={() =>
                    setActaSelection({ ...actaSelection, establecimientos: [] })
                  }
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="rutas-detail-acta-check-grid rutas-detail-acta-check-grid--ests">
              {rutas
                .filter((r) => actaSelection.rutas.includes(r.id))
                .flatMap((r) => r.establecimientos_detalle || [])
                .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
                .map((est) => (
                  <label
                    key={est.id}
                    className={`rutas-detail-acta-check${
                      actaSelection.establecimientos.includes(est.id) ? ' is-on' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={actaSelection.establecimientos.includes(est.id)}
                      onChange={(e) => {
                        const newEsts = e.target.checked
                          ? [...actaSelection.establecimientos, est.id]
                          : actaSelection.establecimientos.filter((eid) => eid !== est.id)
                        setActaSelection({ ...actaSelection, establecimientos: newEsts })
                      }}
                    />
                    <span>
                      {est.nombre}
                      <br />
                      <span style={{ color: 'var(--muted)' }}>RBD: {est.rbd}</span>
                    </span>
                  </label>
                ))}
              {actaSelection.rutas.length === 0 ? (
                <p style={{ gridColumn: '1 / -1', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                  Selecciona rutas para identificar establecimientos
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteRuta}
        title="Eliminar ruta"
        description="¿Está seguro de eliminar esta ruta? Esta acción eliminará también todos sus periodos de cobro asociados."
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />

      <ConfirmModal
        open={!!deletePresetId}
        onClose={() => setDeletePresetId(null)}
        onConfirm={confirmDeletePreset}
        title="Eliminar grupo"
        description="¿Eliminar este grupo?"
        confirmLabel="Eliminar"
        danger
      />
    </div>
  )
}

export default ServicioDetailPage
