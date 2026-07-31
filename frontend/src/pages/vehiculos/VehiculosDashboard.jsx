import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../../api'
import VehiculoDetalle from './VehiculoDetalle'
import TipoDocumentoMantenedor from './TipoDocumentoMantenedor'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
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
  MetricStrip,
  Card,
  Icon,
  KmInput,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const YEARS = [2024, 2025, 2026, 2027]

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount || 0)

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="vehiculos-chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry, index) => (
        <p key={index} style={{ color: entry.color }}>
          {entry.name}:{' '}
          {String(entry.name || '').includes('Gasto') ||
          String(entry.name || '').includes('Bencina') ||
          String(entry.name || '').includes('Peajes') ||
          String(entry.name || '').includes('Seguros')
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  )
}

const VehiculosDashboard = () => {
  const { can } = usePermission()
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = location.pathname.includes('/flota') ? 'flota' : 'registros'

  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [registros, setRegistros] = useState([])
  const [flota, setFlota] = useState([])
  const [viewMode, setViewMode] = useState('individual')
  const [selectedVehiculoFilter, setSelectedVehiculoFilter] = useState('all')
  const [selectedVehicles, setSelectedVehicles] = useState([])
  const { notify } = useNotify()
  const registroOverlay = useFormOverlay()
  const flotaOverlay = useFormOverlay()
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isModalOpen, setModalOpen] = useState(false)
  const [isExportModalOpen, setExportModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [isTipoMantenedorOpen, setIsTipoMantenedorOpen] = useState(false)
  const [isFlotaModalOpen, setFlotaModalOpen] = useState(false)
  const [selectedVehiculoForDetail, setSelectedVehiculoForDetail] = useState(null)

  const [formData, setFormData] = useState({
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    vehiculo: '',
    kilometros_recorridos: '',
    km_inicial: '',
    km_final: '',
    gasto_bencina: '',
    gasto_peajes: '',
    gasto_seguros: '',
  })
  const [flotaFormData, setFlotaFormData] = useState({
    marca: '',
    modelo: '',
    patente: '',
  })
  const [isAggregatorOpen, setAggregatorOpen] = useState(false)
  const [aggregatorField, setAggregatorField] = useState(null)
  const [aggregatorValue, setAggregatorValue] = useState('')
  const [history, setHistory] = useState({
    gasto_bencina: [],
    gasto_peajes: [],
    gasto_seguros: [],
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const flotaRes = await api.get('vehiculos/flota/')
      setFlota(flotaRes.data.results || flotaRes.data)

      const params = { anio: year }
      const listRes = await api.get('vehiculos/registros/', { params })
      setRegistros(listRes.data.results || listRes.data)
    } catch (error) {
      console.error('Error fetching vehicle data:', error)
      notify({ variant: 'danger', text: 'Error al cargar datos de vehículos.' })
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [viewMode, selectedVehiculoFilter, year, pageSize])

  const setTab = (tab) => {
    navigate(tab === 'flota' ? '/vehiculos/flota' : '/vehiculos')
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const val = value === '' ? '' : parseInt(value, 10)
    setFormData((prev) => ({ ...prev, [name]: val }))
  }

  const handleKmChange = (name, raw) => {
    const val = raw === '' ? '' : parseInt(raw, 10)
    setFormData((prev) => {
      const nextData = { ...prev, [name]: val }
      const kIni = name === 'km_inicial' ? val : prev.km_inicial
      const kFin = name === 'km_final' ? val : prev.km_final
      if (typeof kIni === 'number' && typeof kFin === 'number') {
        nextData.kilometros_recorridos = kFin - kIni
      } else {
        nextData.kilometros_recorridos = ''
      }
      return nextData
    })
  }

  const handleAddAmount = (name) => {
    setAggregatorField(name)
    setAggregatorValue('')
    setAggregatorOpen(true)
  }

  const confirmAddition = () => {
    const value = parseInt(aggregatorValue, 10)
    if (isNaN(value) || value <= 0) return
    setFormData((prev) => ({
      ...prev,
      [aggregatorField]: (parseInt(prev[aggregatorField], 10) || 0) + value,
    }))
    setHistory((prev) => ({
      ...prev,
      [aggregatorField]: [...prev[aggregatorField], value],
    }))
    setAggregatorOpen(false)
  }

  const removeAddition = (field, index) => {
    const valToRemove = history[field][index]
    setHistory((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
    setFormData((prev) => ({
      ...prev,
      [field]: Math.max(0, (parseInt(prev[field], 10) || 0) - valToRemove),
    }))
  }

  const closeRegistroModal = () => {
    if (registroOverlay.busy) return
    registroOverlay.reset()
    setModalOpen(false)
  }

  const handleRegistroOverlayDismiss = () => {
    if (registroOverlay.status === 'success') {
      registroOverlay.reset()
      setModalOpen(false)
      fetchData()
      return
    }
    registroOverlay.dismiss()
  }

  const closeFlotaModal = () => {
    if (flotaOverlay.busy) return
    flotaOverlay.reset()
    setFlotaModalOpen(false)
  }

  const handleFlotaOverlayDismiss = () => {
    if (flotaOverlay.status === 'success') {
      flotaOverlay.reset()
      setFlotaFormData({ marca: '', modelo: '', patente: '' })
      setFlotaModalOpen(false)
      fetchData()
      return
    }
    flotaOverlay.dismiss()
  }

  const handleOpenCreateModal = () => {
    registroOverlay.reset()
    setEditingRecord(null)
    setFormData({
      anio: year,
      mes:
        registros.length > 0
          ? (registros[registros.length - 1].mes % 12) + 1
          : new Date().getMonth() + 1,
      vehiculo: flota.length > 0 ? flota[0].id : '',
      kilometros_recorridos: '',
      km_inicial: '',
      km_final: '',
      gasto_bencina: '',
      gasto_peajes: '',
      gasto_seguros: '',
    })
    setHistory({ gasto_bencina: [], gasto_peajes: [], gasto_seguros: [] })
    setModalOpen(true)
  }

  const handleOpenEditModal = (registro) => {
    registroOverlay.reset()
    setEditingRecord(registro)
    setFormData({
      anio: registro.anio,
      mes: registro.mes,
      vehiculo: registro.vehiculo,
      kilometros_recorridos: registro.kilometros_recorridos,
      km_inicial: '',
      km_final: '',
      gasto_bencina: registro.gasto_bencina,
      gasto_peajes: registro.gasto_peajes,
      gasto_seguros: registro.gasto_seguros,
    })
    setHistory({
      gasto_bencina: registro.gasto_bencina > 0 ? [registro.gasto_bencina] : [],
      gasto_peajes: registro.gasto_peajes > 0 ? [registro.gasto_peajes] : [],
      gasto_seguros: registro.gasto_seguros > 0 ? [registro.gasto_seguros] : [],
    })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const restData = { ...formData }
    delete restData.km_inicial
    delete restData.km_final
    const payload = {
      ...restData,
      kilometros_recorridos:
        formData.kilometros_recorridos === '' ? 0 : formData.kilometros_recorridos,
      gasto_bencina: formData.gasto_bencina === '' ? 0 : formData.gasto_bencina,
      gasto_peajes: formData.gasto_peajes === '' ? 0 : formData.gasto_peajes,
      gasto_seguros: formData.gasto_seguros === '' ? 0 : formData.gasto_seguros,
      numero_vehiculos: formData.numero_vehiculos || 0,
    }
    try {
      await registroOverlay.run(
        async () => {
          if (editingRecord) {
            await api.put(`vehiculos/registros/${editingRecord.id}/`, payload)
          } else {
            await api.post('vehiculos/registros/', payload)
          }
        },
        {
          successDescription: editingRecord ? 'Registro actualizado.' : 'Registro guardado.',
          formatError: (err) =>
            formatApiFormError(
              err,
              'Error al guardar. Verifique los datos o si ya existe un registro para este período.',
            ),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      if (pendingDelete.type === 'registro') {
        await api.delete(`vehiculos/registros/${pendingDelete.id}/`)
      } else {
        await api.delete(`vehiculos/flota/${pendingDelete.id}/`)
      }
      setPendingDelete(null)
      notify({ variant: 'success', text: 'Eliminado correctamente.' })
      await fetchData()
    } catch (error) {
      console.error('Error deleting:', error)
      notify({
        variant: 'danger',
        text:
          pendingDelete.type === 'registro'
            ? 'Error al eliminar el registro.'
            : 'Error al eliminar el vehículo.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSaveFlota = async (e) => {
    e?.preventDefault?.()
    try {
      await flotaOverlay.run(
        async () => {
          await api.post('vehiculos/flota/', flotaFormData)
        },
        {
          successDescription: 'Vehículo agregado a la flota.',
          formatError: (err) => formatApiFormError(err, 'Error al guardar el vehículo.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleUpdateVehiculoInList = (updatedVehiculo) => {
    setFlota((prev) =>
      prev.map((v) => (v.id === updatedVehiculo.id ? updatedVehiculo : v)),
    )
    setSelectedVehiculoForDetail(updatedVehiculo)
  }

  const handleExportExcel = async (shouldSum = false) => {
    try {
      const searchParams = new URLSearchParams()
      searchParams.append('anio', year)
      searchParams.append('sumar', shouldSum)
      selectedVehicles.forEach((id) => searchParams.append('vehiculos[]', id))
      const response = await api.get(
        `vehiculos/registros/exportar_excel/?${searchParams.toString()}`,
        { responseType: 'blob' },
      )
      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8-sig',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'reporte_flota.csv')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      setExportModalOpen(false)
    } catch (error) {
      console.error('Error exporting csv:', error)
      notify({ variant: 'danger', text: 'Error al descargar el CSV.' })
    }
  }

  const displayRegistros = useMemo(() => {
    const summed = Object.values(
      registros.reduce((acc, curr) => {
        const key = `${curr.anio}-${curr.mes}`
        if (!acc[key]) {
          acc[key] = {
            ...curr,
            id: `sum-${key}`,
            kilometros_recorridos: 0,
            gasto_bencina: 0,
            gasto_peajes: 0,
            gasto_seguros: 0,
            vehiculo_detalle: {
              display_name: 'Resumen mensual (suma)',
              patente: 'FLOTA',
            },
            isSummary: true,
          }
        }
        acc[key].kilometros_recorridos += curr.kilometros_recorridos
        acc[key].gasto_bencina += curr.gasto_bencina
        acc[key].gasto_peajes += curr.gasto_peajes
        acc[key].gasto_seguros += curr.gasto_seguros
        return acc
      }, {}),
    ).sort((a, b) => a.mes - b.mes)

    if (viewMode === 'general') return summed
    if (selectedVehiculoFilter === 'all') return registros
    return registros.filter(
      (r) => r.vehiculo === parseInt(selectedVehiculoFilter, 10),
    )
  }, [registros, viewMode, selectedVehiculoFilter])

  const dynamicStats = useMemo(
    () =>
      displayRegistros.reduce(
        (acc, curr) => {
          acc.bencina += curr.gasto_bencina || 0
          acc.kms += curr.kilometros_recorridos || 0
          acc.seguros += curr.gasto_seguros || 0
          acc.peajes += curr.gasto_peajes || 0
          return acc
        },
        { bencina: 0, kms: 0, seguros: 0, peajes: 0 },
      ),
    [displayRegistros],
  )

  const chartData = useMemo(
    () =>
      displayRegistros.map((r) => ({
        mes:
          viewMode === 'general'
            ? r.mes_nombre
            : `${r.mes_nombre} (${r.vehiculo_detalle?.patente || ''})`,
        gasto_bencina: r.gasto_bencina,
        gasto_peajes: r.gasto_peajes,
        gasto_seguros: r.gasto_seguros,
        kilometros: r.kilometros_recorridos,
      })),
    [displayRegistros, viewMode],
  )

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return displayRegistros.slice(start, start + pageSize)
  }, [displayRegistros, currentPage, pageSize])

  const metrics = [
    { label: 'Combustible', value: formatCurrency(dynamicStats.bencina) },
    { label: 'Kilometraje', value: `${dynamicStats.kms.toLocaleString()} km` },
    { label: 'Seguros', value: formatCurrency(dynamicStats.seguros) },
    { label: 'Peajes', value: formatCurrency(dynamicStats.peajes) },
  ]

  const vistaSelectValue =
    viewMode === 'general' ? 'general' : selectedVehiculoFilter

  const columns = useMemo(
    () => [
      {
        key: 'periodo',
        header: 'Mes / Vehículo',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => item.mes_nombre || '—',
      },
      {
        key: 'vehiculo',
        header: 'Vehículo',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) =>
          item.vehiculo_detalle?.display_name ||
          item.vehiculo_detalle?.patente ||
          '—',
      },
      {
        key: 'kms',
        header: 'KMS',
        cardRole: 'field',
        priority: 3,
        render: (item) =>
          `${(item.kilometros_recorridos || 0).toLocaleString()} km`,
      },
      {
        key: 'total',
        header: 'Total gastos',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant="accent">
            {formatCurrency(
              (item.gasto_bencina || 0) +
                (item.gasto_peajes || 0) +
                (item.gasto_seguros || 0),
            )}
          </Badge>
        ),
      },
      {
        key: 'detalle',
        header: 'Detalle',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (item) => (
          <span className="vehiculos-gasto-detalle">
            <span title="Combustible">{formatCurrency(item.gasto_bencina)}</span>
            <span title="Peajes">{formatCurrency(item.gasto_peajes)}</span>
            <span title="Seguros">{formatCurrency(item.gasto_seguros)}</span>
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => {
          if (viewMode !== 'individual' || item.isSummary) return null
          return (
            <div
              className="data-table__actions"
              onClick={(e) => e.stopPropagation()}
            >
              {can('vehiculos.change_registromensual') ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Editar"
                  onClick={() => handleOpenEditModal(item)}
                >
                  <Icon name="edit" size="sm" />
                </Button>
              ) : null}
              {can('vehiculos.delete_registromensual') ? (
                <Button
                  variant="ghost"
                  size="sm"
                  title="Eliminar"
                  onClick={() =>
                    setPendingDelete({
                      type: 'registro',
                      id: item.id,
                      label: `registro de ${item.mes_nombre}`,
                    })
                  }
                >
                  <Icon name="trash" size="sm" />
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    [viewMode, can],
  )

  const gastoFields = [
    { key: 'gasto_bencina', label: 'Combustible' },
    { key: 'gasto_peajes', label: 'Peajes / TAG' },
    { key: 'gasto_seguros', label: 'Seguros / Otros' },
  ]

  return (
    <div
      className="page"
      data-od-id="vehiculos-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="car"
        title="Vehículos"
        description={
          activeTab === 'flota'
            ? 'Control técnico y documental de la flota'
            : `Control de gastos y kilometraje · ${year}`
        }
        breadcrumbs={[{ label: 'Operaciones' }, { label: 'Vehículos' }]}
        linkComponent={Link}
        split
        actions={
          activeTab === 'registros' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setExportModalOpen(true)}
              >
                <Icon name="download" size="sm" /> Exportar
              </Button>
              {can('vehiculos.add_registromensual') ? (
                <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                  <Icon name="plus" size="sm" /> Nuevo registro
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsTipoMantenedorOpen(true)}
              >
                <Icon name="procedimientos" size="sm" /> Configurar tipos
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  flotaOverlay.reset()
                  setFlotaModalOpen(true)
                }}
              >
                <Icon name="plus" size="sm" /> Agregar vehículo
              </Button>
            </>
          )
        }
      />

      

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Secciones de vehículos">
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${activeTab === 'registros' ? ' is-active' : ''}`}
              aria-selected={activeTab === 'registros'}
              onClick={() => setTab('registros')}
            >
              Registros
            </button>
          </li>
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${activeTab === 'flota' ? ' is-active' : ''}`}
              aria-selected={activeTab === 'flota'}
              onClick={() => setTab('flota')}
            >
              Flota
            </button>
          </li>
        </ul>
      </div>

      <div
        className="tabs__panel is-active vehiculos-tab-panel"
        role="tabpanel"
      >
        {activeTab === 'registros' ? (
          <>
            <MetricStrip items={metrics} />

            <FiltersBar
              onClear={() => {
                setViewMode('individual')
                setSelectedVehiculoFilter('all')
                setYear(new Date().getFullYear())
                setCurrentPage(1)
              }}
              activeCount={
                (viewMode === 'general' || selectedVehiculoFilter !== 'all'
                  ? 1
                  : 0) + (year !== new Date().getFullYear() ? 1 : 0)
              }
              advanced={
                <Field label="Año" htmlFor="veh-anio">
                  <Select
                    id="veh-anio"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  >
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </Field>
              }
            >
              <Field label="Vista / vehículo" htmlFor="veh-vista">
                <Select
                  id="veh-vista"
                  value={vistaSelectValue}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === 'general') {
                      setViewMode('general')
                      setSelectedVehiculoFilter('all')
                    } else {
                      setViewMode('individual')
                      setSelectedVehiculoFilter(val)
                    }
                  }}
                >
                  <option value="general">General (flota completa)</option>
                  <option value="all">Todos (detallado)</option>
                  {flota.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.patente} — {v.marca} {v.modelo}
                    </option>
                  ))}
                </Select>
              </Field>
            </FiltersBar>

            <div className="vehiculos-main">
              <div className="vehiculos-charts">
                <Card className="vehiculos-charts__card">
                  <h3>Gasto mensual</h3>
                  <div className="vehiculos-charts__body">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 10, fill: 'var(--muted)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--muted)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(v) => `$${v / 1000}k`}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar
                          dataKey="gasto_bencina"
                          name="Bencina"
                          fill="#fbbf24"
                          stackId="a"
                        />
                        <Bar
                          dataKey="gasto_peajes"
                          name="Peajes"
                          fill="var(--primary)"
                          stackId="a"
                        />
                        <Bar
                          dataKey="gasto_seguros"
                          name="Seguros"
                          fill="var(--success, #10b981)"
                          stackId="a"
                          radius={[2, 2, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="vehiculos-charts__card">
                  <h3>Kilometraje</h3>
                  <div className="vehiculos-charts__body">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorKmsVeh" x1="0" y1="0" x2="0" y2="1">
                            <stop
                              offset="5%"
                              stopColor="var(--primary)"
                              stopOpacity={0.2}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--primary)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="var(--border)"
                        />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 10, fill: 'var(--muted)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--muted)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="kilometros"
                          name="Kms"
                          stroke="var(--primary)"
                          fill="url(#colorKmsVeh)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="vehiculos-table">
                <DataTable
                  columns={columns}
                  rows={pageRows}
                  loading={loading}
                  totalCount={displayRegistros.length}
                  emptyTitle="Sin registros"
                  emptyDescription="No hay registros para el año y filtros actuales."
                  emptyAction={
                    can('vehiculos.add_registromensual') ? (
                      <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
                        <Icon name="plus" size="sm" /> Nuevo registro
                      </Button>
                    ) : null
                  }
                  fillViewport={!isNarrow}
                  page={currentPage}
                  pageSize={pageSize}
                  pageSizeId="veh-registros-page-size"
                  pageSizeOptions={[12, 24, 50]}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(n) => {
                    setPageSize(n)
                    setCurrentPage(1)
                  }}
                  mobileCardActions={(item) => {
                    if (viewMode !== 'individual' || item.isSummary) return undefined
                    return {
                      primary: can('vehiculos.change_registromensual')
                        ? {
                            label: 'Editar',
                            onClick: () => handleOpenEditModal(item),
                          }
                        : undefined,
                      secondary: can('vehiculos.delete_registromensual')
                        ? {
                            label: 'Eliminar',
                            onClick: () =>
                              setPendingDelete({
                                type: 'registro',
                                id: item.id,
                                label: `registro de ${item.mes_nombre}`,
                              }),
                          }
                        : undefined,
                    }
                  }}
                  toolbar={
                    <div className="table-toolbar__left">
                      <span className="table-toolbar__title">Registros {year}</span>
                      <Badge variant="neutral">{displayRegistros.length}</Badge>
                      <Badge variant="accent">
                        {viewMode === 'general' ? 'Sumado' : 'Detallado'}
                      </Badge>
                    </div>
                  }
                />
              </div>
            </div>
          </>
        ) : (
          <div className="vehiculos-flota-grid">
            {loading ? (
              <p className="vehiculos-flota-empty">Cargando flota…</p>
            ) : flota.length === 0 ? (
              <div className="vehiculos-flota-empty">
                <p>No hay vehículos registrados.</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    flotaOverlay.reset()
                    setFlotaModalOpen(true)
                  }}
                >
                  <Icon name="plus" size="sm" /> Agregar vehículo
                </Button>
              </div>
            ) : (
              flota.map((v) => (
                <article
                  key={v.id}
                  className="vehiculos-flota-card"
                  onClick={() => setSelectedVehiculoForDetail(v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSelectedVehiculoForDetail(v)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="vehiculos-flota-card__media">
                    {v.imagen ? (
                      <img src={v.imagen} alt={v.patente} />
                    ) : (
                      <Icon name="rutas" size={28} />
                    )}
                    <Badge variant="neutral">{v.patente}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="vehiculos-flota-card__delete"
                      title="Eliminar"
                      onClick={(e) => {
                        e.stopPropagation()
                        setPendingDelete({
                          type: 'flota',
                          id: v.id,
                          label: 'vehículo de la flota',
                        })
                      }}
                    >
                      <Icon name="trash" size="sm" />
                    </Button>
                  </div>
                  <div className="vehiculos-flota-card__body">
                    <h3>
                      {v.marca} {v.modelo}
                    </h3>
                    <p>{v.tipo_combustible || 'Combustible sin definir'}</p>
                    <div className="vehiculos-flota-card__meta">
                      <span>{v.documentos?.length || 0} documentos</span>
                      {v.anio ? <span>Año {v.anio}</span> : <span>Ver ficha</span>}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>

      <Modal
        open={isFlotaModalOpen}
        onClose={closeFlotaModal}
        title="Agregar vehículo"
        {...flotaOverlay.modalProps}
        onOverlayDismiss={handleFlotaOverlayDismiss}
        footer={
          <>
            <Button
              variant="quiet"
              onClick={closeFlotaModal}
              disabled={flotaOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveFlota}
              loading={flotaOverlay.busy}
              disabled={flotaOverlay.busy || flotaOverlay.active}
            >
              Agregar
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveFlota} className="crud-form">
          <div className="form-grid">
            <Field label="Marca" htmlFor="flota-marca" required>
              <Input
                id="flota-marca"
                required
                placeholder="Ej: Toyota"
                value={flotaFormData.marca}
                onChange={(e) =>
                  setFlotaFormData({
                    ...flotaFormData,
                    marca: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Modelo" htmlFor="flota-modelo" required>
              <Input
                id="flota-modelo"
                required
                placeholder="Ej: Hilux"
                value={flotaFormData.modelo}
                onChange={(e) =>
                  setFlotaFormData({
                    ...flotaFormData,
                    modelo: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Patente" htmlFor="flota-patente" required>
              <Input
                id="flota-patente"
                required
                placeholder="ABCD12"
                value={flotaFormData.patente}
                onChange={(e) =>
                  setFlotaFormData({
                    ...flotaFormData,
                    patente: e.target.value.toUpperCase(),
                  })
                }
              />
            </Field>
          </div>
        </form>
      </Modal>

      <Modal
        open={isModalOpen}
        onClose={closeRegistroModal}
        title={editingRecord ? 'Editar registro' : 'Nuevo registro'}
        size="lg"
        subheader={`Vehículos · ${year}`}
        {...registroOverlay.modalProps}
        onOverlayDismiss={handleRegistroOverlayDismiss}
        footer={
          <>
            <Button
              variant="quiet"
              onClick={closeRegistroModal}
              disabled={registroOverlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={registroOverlay.busy}
              disabled={registroOverlay.busy || registroOverlay.active}
            >
              {editingRecord ? 'Actualizar' : 'Confirmar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="crud-form">
          <div className="form-grid">
            <Field label="Año fiscal" htmlFor="reg-anio">
              <Input
                id="reg-anio"
                name="anio"
                type="number"
                value={formData.anio}
                onChange={handleInputChange}
                disabled={!!editingRecord}
                required
              />
            </Field>
            <Field label="Mes" htmlFor="reg-mes">
              <Select
                id="reg-mes"
                name="mes"
                value={formData.mes}
                onChange={handleInputChange}
                disabled={!!editingRecord}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('es-ES', { month: 'long' })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vehículo" htmlFor="reg-veh" required>
              <Select
                id="reg-veh"
                name="vehiculo"
                value={formData.vehiculo}
                onChange={handleInputChange}
                required
                disabled={!!editingRecord}
              >
                <option value="">Seleccionar…</option>
                {flota.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.marca} {v.modelo} ({v.patente})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Km inicial" htmlFor="reg-kmi">
              <KmInput
                id="reg-kmi"
                name="km_inicial"
                value={formData.km_inicial === '' ? '' : String(formData.km_inicial)}
                onChange={(val) => handleKmChange('km_inicial', val)}
                placeholder="10.500"
              />
            </Field>
            <Field label="Km final" htmlFor="reg-kmf">
              <KmInput
                id="reg-kmf"
                name="km_final"
                value={formData.km_final === '' ? '' : String(formData.km_final)}
                onChange={(val) => handleKmChange('km_final', val)}
                placeholder="11.000"
              />
            </Field>
            <Field label="Odómetro mensual" htmlFor="reg-kms">
              <KmInput
                id="reg-kms"
                name="kilometros_recorridos"
                value={
                  formData.kilometros_recorridos === ''
                    ? ''
                    : String(formData.kilometros_recorridos)
                }
                readOnly
              />
            </Field>
          </div>

          <div className="form-grid">
            {gastoFields.map(({ key, label }) => (
              <Field key={key} label={label} htmlFor={`reg-${key}`}>
                <div className="vehiculos-gasto-field">
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    onClick={() => handleAddAmount(key)}
                  >
                    <Icon name="plus" size="sm" /> Sumar
                  </Button>
                  {history[key].length > 0 ? (
                    <div className="vehiculos-gasto-chips">
                      {history[key].map((val, idx) => (
                        <button
                          key={`${key}-${idx}`}
                          type="button"
                          className="vehiculos-gasto-chip"
                          onClick={() => removeAddition(key, idx)}
                          title="Quitar monto"
                        >
                          +{val.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <Input
                    id={`reg-${key}`}
                    name={key}
                    type="number"
                    value={formData[key]}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
              </Field>
            ))}
          </div>
        </form>
      </Modal>

      <Modal
        open={isAggregatorOpen}
        onClose={() => setAggregatorOpen(false)}
        title="Sumar monto"
        size="sm"
        footer={
          <>
            <Button variant="quiet" onClick={() => setAggregatorOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={confirmAddition}>
              Sumar
            </Button>
          </>
        }
      >
        <Field
          label={`Agregar a ${(aggregatorField || '').replace('gasto_', '')}`}
          htmlFor="agg-val"
        >
          <Input
            id="agg-val"
            autoFocus
            type="number"
            value={aggregatorValue}
            onChange={(e) => setAggregatorValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmAddition()}
            placeholder="0"
          />
        </Field>
        <p className="field__hint">
          Subtotal actual: {formatCurrency(formData[aggregatorField] || 0)}
        </p>
      </Modal>

      <Modal
        open={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Exportar reporte"
        subheader="Seleccione vehículos y formato"
        footer={
          <Button variant="quiet" onClick={() => setExportModalOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="vehiculos-export">
          <button
            type="button"
            className={`vehiculos-export__option${
              selectedVehicles.length === 0 ? ' is-active' : ''
            }`}
            onClick={() => setSelectedVehicles([])}
          >
            Todos los vehículos
          </button>
          {flota.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`vehiculos-export__option${
                selectedVehicles.includes(v.id) ? ' is-active' : ''
              }`}
              onClick={() => {
                setSelectedVehicles((prev) =>
                  prev.includes(v.id)
                    ? prev.filter((i) => i !== v.id)
                    : [...prev, v.id],
                )
              }}
            >
              {v.marca} {v.modelo}
              <span>{v.patente}</span>
            </button>
          ))}
          <div className="vehiculos-export__actions">
            <Button variant="secondary" onClick={() => handleExportExcel(false)}>
              Detallado
            </Button>
            <Button variant="primary" onClick={() => handleExportExcel(true)}>
              Sumado
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => {
          if (!isDeleting) setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
        title={
          pendingDelete?.type === 'registro'
            ? 'Eliminar registro'
            : 'Eliminar vehículo'
        }
        description={`¿Eliminar el ${pendingDelete?.label || ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />

      {selectedVehiculoForDetail ? (
        <VehiculoDetalle
          vehiculo={selectedVehiculoForDetail}
          onClose={() => setSelectedVehiculoForDetail(null)}
          onUpdate={handleUpdateVehiculoInList}
        />
      ) : null}

      <TipoDocumentoMantenedor
        isOpen={isTipoMantenedorOpen}
        onClose={() => setIsTipoMantenedorOpen(false)}
      />
    </div>
  )
}

export default VehiculosDashboard
