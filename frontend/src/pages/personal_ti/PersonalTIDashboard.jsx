import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
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
  Modal,
  ConfirmModal,
  MetricStrip,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return 'rgba(0,0,0,0.08)'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const ColorBadge = ({ color, children }) => (
  <span
    className="badge"
    style={{
      backgroundColor: hexToRgba(color, 0.12),
      color: color || 'var(--fg)',
      borderColor: hexToRgba(color, 0.28),
    }}
  >
    {children}
  </span>
)

const EMPTY_FORM = {
        establecimiento: '',
        funcion: '',
        rut: '',
        nombre_completo: '',
        tipo_contrato: '',
        telefono: '',
        correo: '',
        activo: true,
        observaciones: '',
}

const PersonalTIDashboard = () => {
  const [activeTab, setActiveTab] = useState('personal')
  const [records, setRecords] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [establecimientos, setEstablecimientos] = useState([])
  const [funciones, setFunciones] = useState([])
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedOk, setSavedOk] = useState(false)
  const overlay = useFormOverlay()
  const [search, setSearch] = useState('')
  const [filterFuncion, setFilterFuncion] = useState('')
  const [filterEstab, setFilterEstab] = useState('')
  const [filterContrato, setFilterContrato] = useState('')
  const { notify } = useNotify()
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [cobertura, setCobertura] = useState([])
  const [coberturaLoading, setCoberturaLoading] = useState(false)
  const [coberturaFiltro, setCoberturaFiltro] = useState('todos')
  const [coberturaSearch, setCoberturaSearch] = useState('')
  const [coberturaPage, setCoberturaPage] = useState(1)
  const [coberturaPageSize, setCoberturaPageSize] = useState(25)

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  const debouncedSearch = useDebouncedValue(search)
  const debouncedCoberturaSearch = useDebouncedValue(coberturaSearch)

    useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
      }
      if (filterFuncion) params.funcion = filterFuncion
      if (filterEstab) params.establecimiento = filterEstab
      if (filterContrato) params.tipo_contrato = filterContrato
      if (debouncedSearch) params.search = debouncedSearch
      const res = await api.get('personal-ti/', { params })
      const data = Array.isArray(res.data) ? res.data : res.data?.results || []
      setRecords(data)
      setTotalCount(
        Array.isArray(res.data)
          ? data.length
          : res.data?.count ?? data.length,
      )
    } catch (err) {
      console.error(err)
      notify({ variant: 'danger', text: 'Error al cargar el personal TI.' })
    } finally {
      setLoading(false)
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    filterFuncion,
    filterEstab,
    filterContrato,
  ])

  const fetchCobertura = useCallback(async () => {
    setCoberturaLoading(true)
    try {
      const res = await api.get('personal-ti/cobertura/')
      setCobertura(Array.isArray(res.data) ? res.data : res.data?.results || [])
    } catch (err) {
      console.error(err)
      notify({ variant: 'danger', text: 'Error al cargar cobertura.' })
    } finally {
      setCoberturaLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    if (activeTab === 'cobertura' && cobertura.length === 0) {
      fetchCobertura()
    }
  }, [activeTab, cobertura.length, fetchCobertura])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterFuncion, filterEstab, filterContrato, pageSize])

  useEffect(() => {
    setCoberturaPage(1)
  }, [debouncedCoberturaSearch, coberturaFiltro, coberturaPageSize])

  useEffect(() => {
    api
      .get('establecimientos/', { params: { page_size: 1000 } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.results || []
        setEstablecimientos(data)
      })
      .catch(console.error)
    api
      .get('funciones-ti/')
      .then((res) => setFunciones(res.data.results || res.data))
      .catch(console.error)
    api
      .get('contratos-ti/')
      .then((res) => setContratos(res.data.results || res.data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!modalOpen) return
    if (selectedRecord?.id) {
            setForm({
        establecimiento: selectedRecord.establecimiento ?? '',
        funcion: selectedRecord.funcion ?? '',
        rut: selectedRecord.rut ?? '',
        nombre_completo: selectedRecord.nombre_completo ?? '',
        tipo_contrato: selectedRecord.tipo_contrato ?? '',
        telefono: selectedRecord.telefono ?? '',
        correo: selectedRecord.correo ?? '',
        activo: selectedRecord.activo ?? true,
        observaciones: selectedRecord.observaciones ?? '',
      })
    } else if (selectedRecord?._preloaded) {
      setForm({
        ...EMPTY_FORM,
        establecimiento: selectedRecord.establecimiento ?? '',
      })
        } else {
      setForm(EMPTY_FORM)
    }
  }, [modalOpen, selectedRecord])

  const openCreate = () => {
    setSelectedRecord(null)
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setSelectedRecord(record)
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setModalOpen(false)
    setSelectedRecord(null)
    setSavedOk(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setModalOpen(false)
      setSelectedRecord(null)
      if (savedOk) {
        fetchRecords()
        if (cobertura.length > 0) fetchCobertura()
      }
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSave = async (e) => {
    e?.preventDefault?.()
    const wasEdit = Boolean(selectedRecord?.id)
    try {
      await overlay.run(
        async () => {
          if (wasEdit) {
            await api.patch(`personal-ti/${selectedRecord.id}/`, form)
          } else {
            await api.post('personal-ti/', form)
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit ? 'Registro actualizado.' : 'Registro creado.',
          formatError: (err) => formatApiFormError(err, 'Error al guardar el registro.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setIsDeleting(true)
    try {
      await api.delete(`personal-ti/${pendingDelete.id}/`)
      setPendingDelete(null)
      notify({ variant: 'success', text: 'Registro eliminado.' })
      await fetchRecords()
      if (cobertura.length > 0) await fetchCobertura()
    } catch (err) {
      console.error(err)
      notify({ variant: 'danger', text: 'Error al eliminar el registro.' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAsignarDesdeCobertura = (establecimiento) => {
    setActiveTab('personal')
    setSelectedRecord({
      establecimiento: establecimiento.id,
      _preloaded: true,
    })
    setSavedOk(false)
    overlay.reset()
    setModalOpen(true)
  }

  const clearPersonalFilters = () => {
    setSearch('')
    setFilterFuncion('')
    setFilterEstab('')
    setFilterContrato('')
    setCurrentPage(1)
  }

  const personalActiveCount =
    (search ? 1 : 0) +
    (filterFuncion ? 1 : 0) +
    (filterEstab ? 1 : 0) +
    (filterContrato ? 1 : 0)

  const totalActivos = records.filter((r) => r.activo).length
  const totalCoords = records.filter((r) =>
    String(r.funcion_display || '')
      .toUpperCase()
      .includes('COORDINADOR'),
  ).length
  const establsUnicos = new Set(records.map((r) => r.establecimiento)).size

  const personalMetrics = [
    { label: 'En página', value: records.length },
    { label: 'Activos', value: totalActivos },
    { label: 'Coordinadores', value: totalCoords },
    { label: 'Establecimientos', value: establsUnicos },
  ]

  const coberturaFiltrada = useMemo(() => {
    return cobertura.filter((e) => {
      const matchFiltro =
        coberturaFiltro === 'todos'
          ? true
          : coberturaFiltro === 'sin'
            ? !e.tiene_personal
            : coberturaFiltro === 'con'
              ? e.tiene_personal
              : coberturaFiltro === 'sin_tecnico'
                ? e.tecnicos === 0
                : true
      const matchBusqueda =
        !debouncedCoberturaSearch ||
        e.nombre
          ?.toLowerCase()
          .includes(debouncedCoberturaSearch.toLowerCase())
      return matchFiltro && matchBusqueda
    })
  }, [cobertura, coberturaFiltro, debouncedCoberturaSearch])

  const coberturaPageRows = useMemo(() => {
    const start = (coberturaPage - 1) * coberturaPageSize
    return coberturaFiltrada.slice(start, start + coberturaPageSize)
  }, [coberturaFiltrada, coberturaPage, coberturaPageSize])

  const sinPersonal = cobertura.filter((e) => !e.tiene_personal).length
  const conPersonal = cobertura.filter((e) => e.tiene_personal).length
  const sinTecnico = cobertura.filter((e) => e.tecnicos === 0).length

  const coberturaMetrics = [
    {
      label: 'Establecimientos',
      value: cobertura.length,
      active: coberturaFiltro === 'todos',
      onClick: () => setCoberturaFiltro('todos'),
    },
    {
      label: 'Con Personal TI',
      value: conPersonal,
      active: coberturaFiltro === 'con',
      onClick: () => setCoberturaFiltro('con'),
    },
    {
      label: 'Sin técnico',
      value: sinTecnico,
      active: coberturaFiltro === 'sin_tecnico',
      onClick: () => setCoberturaFiltro('sin_tecnico'),
    },
    {
      label: 'Sin Personal TI',
      value: sinPersonal,
      active: coberturaFiltro === 'sin',
      onClick: () => setCoberturaFiltro('sin'),
    },
  ]

  const personalColumns = useMemo(
    () => [
      {
        key: 'rbd',
        header: 'RBD',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (item) => item.establecimiento_detalle?.rbd || '—',
      },
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => item.establecimiento_detalle?.nombre || '—',
      },
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => item.nombre_completo || '—',
      },
      {
        key: 'funcion',
        header: 'Función',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <ColorBadge color={item.funcion_color}>
            {item.funcion_display || '—'}
          </ColorBadge>
        ),
      },
      {
        key: 'rut',
        header: 'RUT',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (item) => item.rut || '—',
      },
      {
        key: 'contrato',
        header: 'Contrato',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (item) => (
          <ColorBadge color={item.tipo_contrato_color}>
            {item.tipo_contrato_display || '—'}
          </ColorBadge>
        ),
      },
      {
        key: 'telefono',
        header: 'Teléfono',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 5,
        render: (item) =>
          item.telefono ? (
            <a href={`tel:${item.telefono}`}>{item.telefono}</a>
          ) : (
            '—'
          ),
      },
      {
        key: 'correo',
        header: 'Correo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 5,
        render: (item) =>
          item.correo ? (
            <a href={`mailto:${item.correo}`}>{item.correo}</a>
          ) : (
            '—'
          ),
      },
      {
        key: 'activo',
        header: 'Estado',
        cardRole: 'field',
        priority: 3,
        render: (item) => (
          <Badge variant={item.activo ? 'success' : 'neutral'}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div
            className="data-table__actions"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="sm"
              title="Editar"
              onClick={() => openEdit(item)}
            >
              <Icon name="edit" size="sm" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Eliminar"
              onClick={() =>
                setPendingDelete({
                  id: item.id,
                  label: item.nombre_completo,
                })
              }
            >
              <Icon name="trash" size="sm" />
            </Button>
            </div>
        ),
      },
    ],
    [],
  )

  const coberturaColumns = useMemo(
    () => [
      {
        key: 'rbd',
        header: 'RBD',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (item) => item.rbd || '—',
      },
      {
        key: 'nombre',
        header: 'Establecimiento',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => item.nombre || '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => {
          if (!item.tiene_personal) {
            return <Badge variant="danger">Sin cobertura</Badge>
          }
          if (item.tecnicos === 0) {
            return <Badge variant="warning">Sin técnico</Badge>
          }
          return <Badge variant="success">Cubierto</Badge>
        },
      },
      {
        key: 'coordinadores',
        header: 'Coordinadores',
        cardRole: 'field',
        priority: 3,
        render: (item) => item.coordinadores ?? 0,
      },
      {
        key: 'tecnicos',
        header: 'Técnicos',
        cardRole: 'field',
        priority: 3,
        render: (item) => item.tecnicos ?? 0,
      },
      {
        key: 'total',
        header: 'Total',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        render: (item) =>
          item.total_personal > 0
            ? `${item.total_personal} persona${item.total_personal > 1 ? 's' : ''}`
            : 'Sin asignar',
      },
      {
        key: 'actions',
        header: 'Acción',
        className: 'col--actions',
        render: (item) => (
          <div
            className="data-table__actions"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAsignarDesdeCobertura(item)}
            >
              <Icon name="plus" size="sm" /> Asignar
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  const isEditing = Boolean(selectedRecord?.id)

  return (
    <div
      className="page"
      data-od-id="personal-ti-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="user-cog"
        title="Personal TI"
        description="Control de personal TI de establecimientos SLEP Iquique"
        breadcrumbs={[{ label: 'Soporte TI' }, { label: 'Personal TI' }]}
        linkComponent={Link}
        split
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Icon name="plus" size="sm" /> Nuevo registro
          </Button>
        }
      />

      

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Secciones Personal TI">
          <li>
                    <button
              type="button"
              role="tab"
              className={`tabs__btn${activeTab === 'personal' ? ' is-active' : ''}`}
              aria-selected={activeTab === 'personal'}
              onClick={() => setActiveTab('personal')}
            >
              Personal TI
                    </button>
          </li>
          <li>
                            <button
              type="button"
              role="tab"
              className={`tabs__btn${activeTab === 'cobertura' ? ' is-active' : ''}`}
              aria-selected={activeTab === 'cobertura'}
              onClick={() => setActiveTab('cobertura')}
            >
              Cobertura
                            </button>
          </li>
        </ul>
                </div>

      <div className="tabs__panel is-active personal-ti-tab-panel" role="tabpanel">
        {activeTab === 'personal' ? (
          <>
            <MetricStrip items={personalMetrics} />

            <FiltersBar
              onSearch={() => setCurrentPage(1)}
              onClear={clearPersonalFilters}
              activeCount={personalActiveCount}
              advanced={
                <>
                  <Field label="Función" htmlFor="pti-funcion">
                    <Select
                      id="pti-funcion"
                      value={filterFuncion}
                      onChange={(e) => setFilterFuncion(e.target.value)}
                    >
                      <option value="">Todas las funciones</option>
                      {funciones.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Establecimiento" htmlFor="pti-estab">
                    <Select
                      id="pti-estab"
                      value={filterEstab}
                      onChange={(e) => setFilterEstab(e.target.value)}
                    >
                      <option value="">Todos los establecimientos</option>
                      {establecimientos.map((e) => (
                        <option key={e.id} value={e.id}>
                                                        {e.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Contrato" htmlFor="pti-contrato">
                    <Select
                      id="pti-contrato"
                      value={filterContrato}
                      onChange={(e) => setFilterContrato(e.target.value)}
                    >
                      <option value="">Todos los contratos</option>
                      {contratos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              }
            >
              <Field label="Buscar" htmlFor="pti-q">
                <div className="input-wrap">
                  <Icon name="search" className="input-wrap__icon" size="sm" />
                  <Input
                    id="pti-q"
                    type="search"
                    placeholder="Nombre, RUT o establecimiento…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </Field>
            </FiltersBar>

            <DataTable
              columns={personalColumns}
              rows={records}
              loading={loading}
              totalCount={totalCount}
              emptyTitle="Sin registros"
              emptyDescription="No hay personal TI con los filtros actuales."
              emptyAction={
                <Button variant="primary" size="sm" onClick={openCreate}>
                  <Icon name="plus" size="sm" /> Nuevo registro
                </Button>
              }
              fillViewport={!isNarrow}
              page={currentPage}
              pageSize={pageSize}
              pageSizeId="personal-ti-page-size"
              pageSizeOptions={[12, 25, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(n) => {
                setPageSize(n)
                setCurrentPage(1)
              }}
              mobileCardActions={(item) => ({
                primary: {
                  label: 'Editar',
                  onClick: () => openEdit(item),
                },
                secondary: {
                  label: 'Eliminar',
                  onClick: () =>
                    setPendingDelete({
                      id: item.id,
                      label: item.nombre_completo,
                    }),
                },
              })}
              toolbar={
                <div className="table-toolbar__left">
                  <span className="table-toolbar__title">Personal</span>
                  <Badge variant="neutral">{totalCount}</Badge>
                    </div>
              }
            />
          </>
        ) : (
          <>
            <MetricStrip items={coberturaMetrics} />

            <FiltersBar
              onClear={() => {
                setCoberturaSearch('')
                setCoberturaFiltro('todos')
                setCoberturaPage(1)
              }}
              activeCount={
                (coberturaSearch ? 1 : 0) +
                (coberturaFiltro !== 'todos' ? 1 : 0)
              }
            >
              <Field label="Buscar" htmlFor="pti-cob-q">
                <div className="input-wrap">
                  <Icon name="search" className="input-wrap__icon" size="sm" />
                  <Input
                    id="pti-cob-q"
                    type="search"
                    placeholder="Buscar establecimiento…"
                    value={coberturaSearch}
                    onChange={(e) => setCoberturaSearch(e.target.value)}
                  />
                </div>
              </Field>
            </FiltersBar>

            <DataTable
              columns={coberturaColumns}
              rows={coberturaPageRows}
              loading={coberturaLoading}
              totalCount={coberturaFiltrada.length}
              emptyTitle="Sin establecimientos"
              emptyDescription="No hay resultados para el filtro actual."
              emptyAction={
                <Button
                  variant="quiet"
                  onClick={() => {
                    setCoberturaSearch('')
                    setCoberturaFiltro('todos')
                  }}
                >
                  Limpiar filtros
                </Button>
              }
              fillViewport={!isNarrow}
              page={coberturaPage}
              pageSize={coberturaPageSize}
              pageSizeId="personal-ti-cob-page-size"
              pageSizeOptions={[12, 25, 50]}
              onPageChange={setCoberturaPage}
              onPageSizeChange={(n) => {
                setCoberturaPageSize(n)
                setCoberturaPage(1)
              }}
              mobileCardActions={(item) => ({
                primary: {
                  label: 'Asignar',
                  onClick: () => handleAsignarDesdeCobertura(item),
                },
              })}
              toolbar={
                <div className="table-toolbar__left">
                  <span className="table-toolbar__title">Cobertura</span>
                  <Badge variant="neutral">{coberturaFiltrada.length}</Badge>
                </div>
              }
            />
          </>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={isEditing ? 'Editar Personal TI' : 'Nuevo Personal TI'}
        subheader="Datos de soporte y redes del establecimiento"
        size="lg"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button
              variant="quiet"
              onClick={closeModal}
              disabled={overlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="personal-ti-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {overlay.busy
                ? 'Guardando…'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Registrar'}
            </Button>
          </>
        }
      >
        <form id="personal-ti-form" onSubmit={handleSave} className="crud-form">
          <div className="form-grid">
            <Field label="Establecimiento" htmlFor="pti-form-estab" required>
              <Select
                id="pti-form-estab"
                name="establecimiento"
                required
                value={form.establecimiento}
                onChange={handleFormChange}
              >
                <option value="">Seleccionar…</option>
                {establecimientos.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.rbd ? `[${e.rbd}] ` : ''}
                    {e.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Función" htmlFor="pti-form-funcion" required>
              <Select
                id="pti-form-funcion"
                name="funcion"
                required
                value={form.funcion}
                onChange={handleFormChange}
              >
                <option value="">Seleccionar…</option>
                {funciones.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Nombre completo"
              htmlFor="pti-form-nombre"
              required
              className="field--full"
            >
              <Input
                id="pti-form-nombre"
                name="nombre_completo"
                required
                value={form.nombre_completo}
                onChange={handleFormChange}
                placeholder="Nombre y apellidos"
              />
            </Field>
            <Field label="RUT" htmlFor="pti-form-rut" required>
              <Input
                id="pti-form-rut"
                name="rut"
                required
                value={form.rut}
                onChange={handleFormChange}
                placeholder="12345678-9"
              />
            </Field>
            <Field label="Tipo de contrato" htmlFor="pti-form-contrato" required>
              <Select
                id="pti-form-contrato"
                name="tipo_contrato"
                required
                value={form.tipo_contrato}
                onChange={handleFormChange}
              >
                <option value="">Seleccionar…</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} · {c.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Teléfono" htmlFor="pti-form-tel">
              <Input
                id="pti-form-tel"
                name="telefono"
                value={form.telefono}
                onChange={handleFormChange}
                placeholder="+56 9 …"
              />
            </Field>
            <Field label="Correo" htmlFor="pti-form-mail">
              <Input
                id="pti-form-mail"
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleFormChange}
                placeholder="usuario@slep.cl"
              />
            </Field>
            <Field
              label="Observaciones"
              htmlFor="pti-form-obs"
              className="field--full"
            >
              <Input
                id="pti-form-obs"
                name="observaciones"
                value={form.observaciones}
                onChange={handleFormChange}
                placeholder="Notas adicionales…"
              />
            </Field>
                    </div>
          <label className="personal-ti-activo">
            <input
              type="checkbox"
              name="activo"
              checked={form.activo}
              onChange={handleFormChange}
            />
            <span>Registro activo</span>
          </label>
        </form>
      </Modal>

      <ConfirmModal
        open={!!pendingDelete}
        onClose={() => {
          if (!isDeleting) setPendingDelete(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar registro"
        description={`¿Eliminar a ${pendingDelete?.label || 'este registro'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
            />
        </div>
  )
}

export default PersonalTIDashboard
