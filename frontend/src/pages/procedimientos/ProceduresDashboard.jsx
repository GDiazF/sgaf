import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission as usePerm } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import DocumentViewerModal from '../../components/common/DocumentViewerModal'
import ProcedureFormModal from './ProcedureFormModal'
import ProcedureTypesModal from './ProcedureTypesModal'
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
  Icon,
} from '@slep/ui'
import { useNotify } from '../../hooks/useNotify'

const ProceduresDashboard = () => {
  const { can } = usePerm()
  const { notify } = useNotify()
  const canAdd = can('procedimientos.add_procedimiento')
  const canDelete = can('procedimientos.delete_procedimiento')
  const canChange = can('procedimientos.change_procedimiento')
  const canManageTypes =
    can('procedimientos.add_tipoprocedimiento') ||
    can('procedimientos.change_tipoprocedimiento') ||
    can('procedimientos.delete_tipoprocedimiento')

  const [procedures, setProcedures] = useState([])
  const [types, setTypes] = useState([])
  const [subdirecciones, setSubdirecciones] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSubdireccion, setFilterSubdireccion] = useState('')
  const [filterDepartamento, setFilterDepartamento] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const [formOpen, setFormOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [typesOpen, setTypesOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebouncedValue(searchTerm)

  const fetchData = async () => {
    setLoading(true)
    try {
      const ts = Date.now()
      const [procRes, typeRes, subRes, depRes, uniRes] = await Promise.all([
        api.get(`procedimientos/procedimientos/?_ts=${ts}`),
        api.get(`procedimientos/tipos/?_ts=${ts}`),
        api.get(`subdirecciones/?_ts=${ts}`),
        api.get(`departamentos/?_ts=${ts}`),
        api.get(`unidades/?_ts=${ts}`),
      ])
      setProcedures(procRes.data.results || procRes.data || [])
      setTypes(typeRes.data.results || typeRes.data || [])
      setSubdirecciones(subRes.data.results || subRes.data || [])
      setDepartamentos(depRes.data.results || depRes.data || [])
      setUnidades(uniRes.data.results || uniRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setProcedures([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filterDeps = useMemo(
    () =>
      departamentos.filter(
        (d) =>
          !filterSubdireccion || String(d.subdireccion) === String(filterSubdireccion),
      ),
    [departamentos, filterSubdireccion],
  )

  const filteredProcedures = useMemo(() => {
    return procedures.filter((p) => {
      const q = debouncedSearch.toLowerCase()
      const matchesSearch =
        !q ||
        (p.titulo || '').toLowerCase().includes(q) ||
        (p.descripcion || '').toLowerCase().includes(q)
      const matchesType = !filterType || String(p.tipo) === String(filterType)
      const matchesSub =
        !filterSubdireccion || String(p.subdireccion) === String(filterSubdireccion)
      const matchesDep =
        !filterDepartamento || String(p.departamento) === String(filterDepartamento)
      let matchesStatus = true
      if (filterStatus === 'active') matchesStatus = p.activo === true
      if (filterStatus === 'inactive') matchesStatus = p.activo === false
      return matchesSearch && matchesType && matchesSub && matchesDep && matchesStatus
    })
  }, [
    procedures,
    debouncedSearch,
    filterType,
    filterSubdireccion,
    filterDepartamento,
    filterStatus,
  ])

  const totalResults = filteredProcedures.length
  const pageCount = Math.max(1, Math.ceil(totalResults / pageSize) || 1)
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProcedures.slice(start, start + pageSize)
  }, [filteredProcedures, currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterType, filterSubdireccion, filterDepartamento, filterStatus])

  useEffect(() => {
    if (currentPage > pageCount) setCurrentPage(pageCount)
  }, [currentPage, pageCount])

  const clearFilters = () => {
    setFilterType('')
    setFilterStatus('all')
    setFilterSubdireccion('')
    setFilterDepartamento('')
    setSearchTerm('')
    setCurrentPage(1)
  }

  const getFileUrl = (url) => {
    if (!url) return ''
    return url.replace(/^https?:\/\/[^/]+/, '')
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`procedimientos/procedimientos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Documento eliminado.' })
      await fetchData()
    } catch (error) {
      console.error('Error al eliminar', error)
      notify({ variant: 'danger', text: 'No se pudo eliminar el documento.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'activo',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant={item.activo ? 'success' : 'neutral'} dot>
            {item.activo ? 'Activo' : 'Borrador'}
          </Badge>
        ),
      },
      {
        key: 'titulo',
        header: 'Título',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <button
            type="button"
            className="table-link"
            onClick={() => {
              setSelectedDoc(item)
              setViewerOpen(true)
            }}
          >
            {item.titulo || '—'}
          </button>
        ),
      },
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) =>
          item.tipo_data?.nombre ? (
            <Badge variant="accent">{item.tipo_data.nombre}</Badge>
          ) : (
            '—'
          ),
      },
      {
        key: 'subdireccion_nombre',
        header: 'Subdirección',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.subdireccion_nombre || '—',
      },
      {
        key: 'departamento_nombre',
        header: 'Departamento',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.departamento_nombre || '—',
      },
      {
        key: 'created_at',
        header: 'Fecha',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) =>
          item.created_at
            ? new Date(item.created_at).toLocaleDateString('es-CL')
            : '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDoc(item)
                setViewerOpen(true)
              }}
            >
              Ver
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const url = getFileUrl(item.archivo)
                if (url) window.open(url, '_blank', 'noopener,noreferrer')
              }}
            >
              Descargar
            </Button>
            {canChange ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingDoc(item)
                  setFormOpen(true)
                }}
              >
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item)}>
                Eliminar
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  return (
    <div className="page" data-od-id="procedimientos-page">
      <PageHeader
        icon="procedimientos"
        title="Procedimientos"
        description="Gestor documental de procedimientos e instructivos"
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Procedimientos' }]}
        linkComponent={Link}
        split
        actions={
          <>
            {canManageTypes ? (
              <Button variant="secondary" size="sm" onClick={() => setTypesOpen(true)}>
                Tipos
              </Button>
            ) : null}
            {canAdd ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingDoc(null)
                  setFormOpen(true)
                }}
              >
                <Icon name="plus" size="sm" /> Nuevo documento
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        advanced={
          <>
            <Field label="Tipo" htmlFor="proc-filter-tipo">
              <Select
                id="proc-filter-tipo"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Subdirección" htmlFor="proc-filter-sub">
              <Select
                id="proc-filter-sub"
                value={filterSubdireccion}
                onChange={(e) => {
                  setFilterSubdireccion(e.target.value)
                  setFilterDepartamento('')
                }}
              >
                <option value="">Todas</option>
                {subdirecciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Departamento" htmlFor="proc-filter-dep">
              <Select
                id="proc-filter-dep"
                value={filterDepartamento}
                disabled={!filterSubdireccion}
                onChange={(e) => setFilterDepartamento(e.target.value)}
              >
                <option value="">Todos</option>
                {filterDeps.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            {(canChange || canAdd) && (
              <Field label="Estado" htmlFor="proc-filter-estado">
                <Select
                  id="proc-filter-estado"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Borrador</option>
                </Select>
              </Field>
            )}
          </>
        }
      >
        <Field label="Buscar" htmlFor="proc-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="proc-q"
              type="search"
              placeholder="Título o descripción…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={totalResults}
        emptyTitle="Sin documentos"
        emptyDescription="No hay procedimientos con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="proc-page-size"
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Ver',
            onClick: () => {
              setSelectedDoc(item)
              setViewerOpen(true)
            },
          },
          secondary: canChange
            ? {
                label: 'Editar',
                onClick: () => {
                  setEditingDoc(item)
                  setFormOpen(true)
                },
              }
            : canDelete
              ? { label: 'Eliminar', onClick: () => setDeleteTarget(item) }
              : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">
              {totalResults} de {procedures.length}
            </Badge>
          </div>
        }
      />

      <ProcedureFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingDoc(null)
        }}
        onSaved={fetchData}
        editingDoc={editingDoc}
        types={types}
        subdirecciones={subdirecciones}
        departamentos={departamentos}
        unidades={unidades}
      />

      <ProcedureTypesModal
        open={typesOpen}
        onClose={() => setTypesOpen(false)}
        onChanged={fetchData}
      />

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        title={selectedDoc?.titulo}
        subtitle={`${selectedDoc?.tipo_data?.nombre || 'DOCUMENTO'}${
          selectedDoc?.subdireccion_nombre ? ` · ${selectedDoc.subdireccion_nombre}` : ''
        }`}
        documentType="Procedimiento"
        fileUrl={selectedDoc ? getFileUrl(selectedDoc.archivo) : ''}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar documento"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.titulo}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este procedimiento?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default ProceduresDashboard
