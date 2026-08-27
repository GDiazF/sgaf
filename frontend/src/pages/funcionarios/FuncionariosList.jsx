import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import FuncionarioModal from '../../components/funcionarios/FuncionarioModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Icon,
  ConfirmModal,
  MetricStrip,
} from '@slep/ui'

const ORG_LINKS = [
  { to: '/funcionarios/subdirecciones', label: 'Subdirecciones' },
  { to: '/funcionarios/departamentos', label: 'Departamentos' },
  { to: '/funcionarios/unidades', label: 'Unidades' },
  { to: '/funcionarios/grupos', label: 'Grupos' },
]

const FuncionariosList = () => {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canAdd = can('funcionarios.add_funcionario')
  const canChange = can('funcionarios.change_funcionario')
  const canDelete = can('funcionarios.delete_funcionario')
  const { notify } = useNotify()

  const [funcionarios, setFuncionarios] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterSubdireccion, setFilterSubdireccion] = useState('')
  const [subdirecciones, setSubdirecciones] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)
  const orgMenuRef = useRef(null)

  const debouncedSearch = useDebouncedValue(searchTerm)

  useEffect(() => {
    fetchSubdirecciones()
    fetchStats()
  }, [])

  useEffect(() => {
    if (!orgMenuOpen) return undefined
    const onDocClick = (e) => {
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target)) {
        setOrgMenuOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOrgMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [orgMenuOpen])

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterEstado, filterSubdireccion, pageSize])

  const fetchStats = async () => {
    try {
      const response = await api.get('funcionarios/estadisticas/')
      setStats(response.data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchSubdirecciones = async () => {
    try {
      const response = await api.get('subdirecciones/', { params: { nopaginate: true } })
      setSubdirecciones(
        Array.isArray(response.data) ? response.data : response.data.results || [],
      )
    } catch (error) {
      console.error('Error fetching subdirecciones:', error)
    }
  }

  const fetchData = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        ordering: 'nombre_funcionario',
      }
      if (debouncedSearch) params.search = debouncedSearch
      if (filterEstado !== 'all') params.estado = filterEstado === 'activo'
      if (filterSubdireccion) params.subdireccion = filterSubdireccion

      const response = await api.get('funcionarios/', { params })
      if (response.data.results) {
        setFuncionarios(response.data.results)
        setTotalResults(response.data.count || 0)
      } else {
        setFuncionarios(response.data || [])
        setTotalResults(response.data?.length || 0)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching data:', error)
      setFuncionarios([])
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterEstado('all')
    setFilterSubdireccion('')
    setCurrentPage(1)
  }

  const handleCreate = () => {
    setSelectedId(null)
    setIsModalOpen(true)
  }

  const handleEdit = (id) => {
    setSelectedId(id)
    setIsModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`funcionarios/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Funcionario eliminado.' })
      await fetchData(currentPage)
      fetchStats()
    } catch (error) {
      console.error('Error deleting funcionario:', error)
      notify({ variant: 'danger', text: 'Error al eliminar el funcionario.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleEstado = async (id) => {
    try {
      await api.post(`funcionarios/${id}/toggle_estado/`)
      fetchData(currentPage)
      fetchStats()
    } catch (error) {
      console.error('Error toggling estado:', error)
    }
  }

  const metrics = [
    { label: 'Nómina total', value: stats?.total ?? totalResults ?? 0 },
    { label: 'Activos', value: stats?.activos ?? '—' },
    { label: 'Inactivos', value: stats?.inactivos ?? '—' },
    { label: 'Subdirecciones', value: stats?.subdirecciones ?? '—' },
  ]

  const columns = useMemo(
    () => [
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) =>
          canChange ? (
            <button
              type="button"
              className="badge-toggle"
              aria-label={item.estado ? 'Marcar inactivo' : 'Marcar activo'}
              onClick={() => handleToggleEstado(item.id)}
            >
              <Badge variant={item.estado ? 'success' : 'neutral'} dot>
                {item.estado ? 'Activo' : 'Inactivo'}
              </Badge>
            </button>
          ) : (
            <Badge variant={item.estado ? 'success' : 'neutral'} dot>
              {item.estado ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
      },
      {
        key: 'nombre_funcionario',
        header: 'Nombre',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'rut',
        header: 'RUT',
        className: 'col--secondary mono',
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => <span className="mono">{item.rut || '—'}</span>,
      },
      {
        key: 'anexo',
        header: 'Anexo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.anexo || '—',
      },
      {
        key: 'numero_publico',
        header: 'Tel. público',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.numero_publico || '—',
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
        key: 'cargo',
        header: 'Cargo',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.cargo || '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            {canChange ? (
              <Button variant="outline" size="sm" onClick={() => handleEdit(item.id)}>
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
    <div className="page" data-od-id="funcionarios-list-page">
      <PageHeader
        icon="funcionarios"
        title="Funcionarios"
        description="Directorio de personal del servicio"
        breadcrumbs={[{ label: 'Operaciones' }, { label: 'Funcionarios' }]}
        linkComponent={Link}
        split
        actions={
          <>
            <div
              ref={orgMenuRef}
              className={`dropdown${orgMenuOpen ? ' is-open' : ''}`}
            >
              <Button
                variant="secondary"
                size="sm"
                type="button"
                aria-expanded={orgMenuOpen}
                aria-haspopup="menu"
                onClick={() => setOrgMenuOpen((v) => !v)}
              >
                Organización
                <Icon name="chevron" size={14} />
              </Button>
              <div className="dropdown__menu" role="menu" aria-label="Mantenedores de organización">
                {ORG_LINKS.map((item) => (
                  <button
                    key={item.to}
                    type="button"
                    role="menuitem"
                    className="dropdown__item"
                    onClick={() => {
                      setOrgMenuOpen(false)
                      navigate(item.to)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => navigate('/funcionarios/sellos')}
            >
              <Icon name="file-check" size="sm" /> Sellos de firma
            </Button>
            {canAdd ? (
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Icon name="plus" size="sm" /> Nuevo funcionario
              </Button>
            ) : null}
          </>
        }
      />

      <MetricStrip items={metrics} />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        advanced={
          <>
            <Field label="Estado" htmlFor="func-estado">
              <Select
                id="func-estado"
                value={filterEstado}
                onChange={(e) => {
                  setFilterEstado(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="inactivo">Inactivos</option>
              </Select>
            </Field>
            <Field label="Subdirección" htmlFor="func-sub">
              <Select
                id="func-sub"
                value={filterSubdireccion}
                onChange={(e) => {
                  setFilterSubdireccion(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="">Todas las subdirecciones</option>
                {subdirecciones.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nombre}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        }
      >
        <Field label="Buscar" htmlFor="func-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="func-q"
              type="search"
              placeholder="Nombre, RUT o cargo…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={funcionarios}
        loading={loading}
        totalCount={totalResults}
        emptyTitle="Sin funcionarios"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="func-page-size"
        onPageChange={(page) => fetchData(page)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: canChange
            ? { label: 'Editar', onClick: () => handleEdit(item.id) }
            : undefined,
          secondary: canDelete
            ? { label: 'Eliminar', onClick: () => setDeleteTarget(item) }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalResults} registros</Badge>
          </div>
        }
      />

      <FuncionarioModal
        isOpen={isModalOpen}
        onClose={(result) => {
          setIsModalOpen(false)
          if (result?.saved) {
            fetchData(currentPage)
            fetchStats()
          }
        }}
        funcionarioId={selectedId}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar funcionario"
        description={
          deleteTarget
            ? `¿Eliminar a «${deleteTarget.nombre_funcionario}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este funcionario?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default FuncionariosList
