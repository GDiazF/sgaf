import React, { useState, useEffect, useMemo, useCallback } from 'react'
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

const AnexosDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortKey, setSortKey] = useState('nombre')
  const [sortDir, setSortDir] = useState('asc')

  const [showAsignarModal, setShowAsignarModal] = useState(false)
  const [selectedAnexoNum, setSelectedAnexoNum] = useState('')
  const [funcionarioSearch, setFuncionarioSearch] = useState('')
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('')
  const [confirmLiberarAnexo, setConfirmLiberarAnexo] = useState(null)
  const [liberating, setLiberating] = useState(false)
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const debouncedSearch = useDebouncedValue(searchQuery)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get('control-anexos/')
      setData(response.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      notify({ variant: 'danger', text: 'Error al cargar datos de anexos.' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, activeSection, pageSize])

  const statsByGroup = useMemo(() => {
    if (!data?.anexos_ocupados) return {}
    const stats = {}
    data.anexos_ocupados.forEach((item) => {
      const key = item.funcionario.subdireccion || 'Dirección / Otros'
      stats[key] = (stats[key] || 0) + 1
    })
    return stats
  }, [data])

  const subdireccionesList = useMemo(
    () => Object.keys(statsByGroup).sort(),
    [statsByGroup],
  )

  const flatRows = useMemo(() => {
    if (!data?.anexos_ocupados) return []
    let rows = data.anexos_ocupados.map((item) => ({
      ...item,
      id: item.anexo,
      subdireccion: item.funcionario.subdireccion || 'Dirección / Otros',
      nombre: item.funcionario.nombre || '',
      departamento: item.funcionario.departamento || '',
      rut: item.funcionario.rut || '',
    }))

    if (activeSection !== 'all') {
      rows = rows.filter((r) => r.subdireccion === activeSection)
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      rows = rows.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          String(r.anexo).includes(q) ||
          r.rut.includes(q) ||
          r.departamento.toLowerCase().includes(q) ||
          r.subdireccion.toLowerCase().includes(q),
      )
    }

    rows.sort((a, b) => {
      let aValue
      let bValue
      switch (sortKey) {
        case 'anexo':
          aValue = Number(a.anexo) || 0
          bValue = Number(b.anexo) || 0
          break
        case 'rut':
          aValue = a.rut
          bValue = b.rut
          break
        case 'departamento':
          aValue = a.departamento
          bValue = b.departamento
          break
        case 'subdireccion':
          aValue = a.subdireccion
          bValue = b.subdireccion
          break
        default:
          aValue = a.nombre
          bValue = b.nombre
      }
      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [data, activeSection, debouncedSearch, sortKey, sortDir])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return flatRows.slice(start, start + pageSize)
  }, [flatRows, currentPage, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setActiveSection('all')
    setCurrentPage(1)
  }

  const handleSort = (colKey) => {
    if (sortKey === colKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(colKey)
      setSortDir('asc')
    }
  }

  const resetAsignarForm = () => {
    setSelectedAnexoNum('')
    setSelectedFuncionarioId('')
    setFuncionarioSearch('')
  }

  const closeAsignarModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setShowAsignarModal(false)
    resetAsignarForm()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setShowAsignarModal(false)
      resetAsignarForm()
      fetchData()
      return
    }
    overlay.dismiss()
  }

  const handleAsignar = async () => {
    if (!selectedFuncionarioId || !selectedAnexoNum) {
      overlay.setTitle(undefined)
      overlay.setDescription('Debe seleccionar funcionario y anexo.')
      overlay.setStatus('error')
      return
    }
    try {
      await overlay.run(
        async () => {
          await api.post('control-anexos/asignar/', {
            anexo: selectedAnexoNum,
            funcionario_id: selectedFuncionarioId,
          })
        },
        {
          successDescription: 'Vínculo establecido con éxito.',
          formatError: (err) =>
            err.response?.data?.error || formatApiFormError(err, 'Error al vincular.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleLiberar = async () => {
    if (!confirmLiberarAnexo) return
    setLiberating(true)
    try {
      await api.post('control-anexos/liberar/', { anexo: confirmLiberarAnexo })
      notify({
        variant: 'success',
        text: `Anexo ${confirmLiberarAnexo} ahora disponible.`,
      })
      setConfirmLiberarAnexo(null)
      await fetchData()
    } catch (error) {
      console.error('Error freeing extension:', error)
      notify({ variant: 'danger', text: 'Error al liberar el anexo.' })
    } finally {
      setLiberating(false)
    }
  }

  const funcionariosFiltrados = useMemo(() => {
    const list = data?.funcionarios_activos || []
    if (!funcionarioSearch) return list
    const q = funcionarioSearch.toLowerCase()
    return list.filter(
      (f) =>
        f.nombre_funcionario.toLowerCase().includes(q) ||
        (f.rut || '').includes(funcionarioSearch),
    )
  }, [data, funcionarioSearch])

  const metrics = useMemo(
    () => [
      {
        label: 'Asignados',
        value: data?.anexos_ocupados?.length || 0,
      },
      {
        label: 'Disponibles',
        value: data?.anexos_disponibles?.length || 0,
      },
      {
        label: 'Subdirecciones',
        value: subdireccionesList.length,
      },
      {
        label: 'En vista',
        value: flatRows.length,
      },
    ],
    [data, subdireccionesList.length, flatRows.length],
  )

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Funcionario',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => item.nombre || '—',
      },
      {
        key: 'anexo',
        header: 'Anexo',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => <Badge variant="accent">{item.anexo}</Badge>,
      },
      {
        key: 'departamento',
        header: 'Departamento',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        sortable: true,
        render: (item) => item.departamento || '—',
      },
      {
        key: 'subdireccion',
        header: 'Subdirección',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        sortable: true,
        render: (item) => item.subdireccion,
      },
      {
        key: 'rut',
        header: 'RUT',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 4,
        sortable: true,
        render: (item) => item.rut || '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              title="Liberar anexo"
              onClick={() => setConfirmLiberarAnexo(item.anexo)}
            >
              <Icon name="trash" size="sm" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  return (
    <div className="page" data-od-id="telefonos-anexos-page" data-fill-viewport>
      <PageHeader
        icon="telefonos"
        title="Teléfonos"
        description="Control y vinculación de anexos telefónicos institucionales"
        breadcrumbs={[{ label: 'Operaciones' }, { label: 'Teléfonos' }]}
        linkComponent={Link}
        split
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              overlay.reset()
              resetAsignarForm()
              setShowAsignarModal(true)
            }}
          >
            <Icon name="plus" size="sm" /> Vincular anexo
          </Button>
        }
      />

      

      <MetricStrip items={metrics} />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={activeSection !== 'all' ? 1 : 0}
        advanced={
          <Field label="Subdirección" htmlFor="anexo-sub">
            <Select
              id="anexo-sub"
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
            >
              <option value="all">
                Todas ({data?.anexos_ocupados?.length || 0})
              </option>
              {subdireccionesList.map((name) => (
                <option key={name} value={name}>
                  {name} ({statsByGroup[name]})
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="anexo-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="anexo-q"
              type="search"
              placeholder="Nombre, RUT, anexo o departamento…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading && !data}
        totalCount={flatRows.length}
        emptyTitle="Sin resultados"
        emptyDescription="No hay anexos asignados con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="anexos-page-size"
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={sortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Liberar',
            onClick: () => setConfirmLiberarAnexo(item.anexo),
          },
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Directorio</span>
            <Badge variant="neutral">{flatRows.length}</Badge>
            {(data?.anexos_disponibles?.length || 0) > 0 ? (
              <Badge variant="success">
                {data.anexos_disponibles.length} libres
              </Badge>
            ) : null}
          </div>
        }
      />

      <Modal
        open={showAsignarModal}
        onClose={closeAsignarModal}
        title="Vincular anexo"
        subheader="Asignar extensión a un funcionario"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button
              variant="quiet"
              onClick={closeAsignarModal}
              disabled={overlay.busy}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAsignar}
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active || !selectedFuncionarioId || !selectedAnexoNum}
            >
              {overlay.busy ? 'Vinculando…' : 'Establecer vínculo'}
            </Button>
          </>
        }
      >
        <div className="crud-form">
          <Field label="Anexo libre" htmlFor="anexo-libre" required>
            <Select
              id="anexo-libre"
              value={selectedAnexoNum}
              onChange={(e) => setSelectedAnexoNum(e.target.value)}
              required
            >
              <option value="">Seleccionar anexo…</option>
              {(data?.anexos_disponibles || []).map((num) => (
                <option key={num} value={num}>
                  Anexo #{num}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Buscar funcionario" htmlFor="anexo-func-q">
            <div className="input-wrap">
              <Icon name="search" className="input-wrap__icon" size="sm" />
              <Input
                id="anexo-func-q"
                type="search"
                placeholder="Nombre o RUT…"
                value={funcionarioSearch}
                onChange={(e) => setFuncionarioSearch(e.target.value)}
              />
            </div>
          </Field>

          <Field label="Funcionario" htmlFor="anexo-func" required>
            <Select
              id="anexo-func"
              value={selectedFuncionarioId}
              onChange={(e) => setSelectedFuncionarioId(e.target.value)}
              required
            >
              <option value="">Seleccionar de la lista…</option>
              {funcionariosFiltrados.map((func) => (
                <option key={func.id} value={func.id}>
                  {func.nombre_funcionario} ({func.rut})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmLiberarAnexo}
        onClose={() => {
          if (!liberating) setConfirmLiberarAnexo(null)
        }}
        onConfirm={handleLiberar}
        title="Liberar anexo"
        description={`¿Liberar el anexo ${confirmLiberarAnexo}? Quedará disponible para una nueva vinculación.`}
        confirmLabel="Liberar"
        danger
      />
    </div>
  )
}

export default AnexosDashboard
