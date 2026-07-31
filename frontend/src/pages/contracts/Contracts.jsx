import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import ContractModal from '../../components/contracts/ContractModal'
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

const emptyForm = (lookups = {}) => ({
  codigo_mercado_publico: '',
  descripcion: '',
  proceso: lookups.procesos?.[0]?.id || '',
  estado: lookups.estados?.[0]?.id || '',
  categoria: lookups.categorias?.[0]?.id || '',
  orientacion: '',
  proveedor: '',
  fecha_adjudicacion: '',
  fecha_inicio: '',
  fecha_termino: '',
  tipo_oc: 'UNICA',
  nro_oc: '',
  cdp: '',
  proveedores_asociados: [],
  establecimientos: [],
})

const estadoVariant = (nombre) => {
  const n = (nombre || '').toLowerCase()
  if (n.includes('activo') || n.includes('vigente')) return 'success'
  if (n.includes('pendiente')) return 'warning'
  if (n.includes('caducado') || n.includes('anul')) return 'danger'
  return 'neutral'
}

const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-CL')
}

const providersLabel = (item) => {
  const list = item.proveedores_asociados || []
  if (!list.length) return 'S/A'
  return list.map((p) => p.proveedor_nombre).join(', ')
}

const Contracts = () => {
  const navigate = useNavigate()
  const { can } = usePermission()

  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [procesos, setProcesos] = useState([])
  const [estados, setEstados] = useState([])
  const [categorias, setCategorias] = useState([])
  const [orientaciones, setOrientaciones] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [tiposEstablecimiento, setTiposEstablecimiento] = useState([])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('vigente_first')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterOrientacion, setFilterOrientacion] = useState('')

  const debouncedSearch = useDebouncedValue(searchQuery)

  const lookups = useMemo(
    () => ({
      procesos,
      estados,
      categorias,
      orientaciones,
      proveedores,
      establecimientos,
      tiposEstablecimiento,
    }),
    [
      procesos,
      estados,
      categorias,
      orientaciones,
      proveedores,
      establecimientos,
      tiposEstablecimiento,
    ],
  )

  const fetchData = async (page = 1, size = pageSize, search = debouncedSearch) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: size,
        search,
        ordering:
          ordering === 'vigente_first' ? '-estado__nombre, -fecha_inicio' : ordering,
        ...(filterCategoria && { categoria: filterCategoria }),
        ...(filterOrientacion && { orientacion: filterOrientacion }),
      }
      const response = await api.get('contratos/contratos/', { params })
      const data = response.data.results || (Array.isArray(response.data) ? response.data : [])
      setContracts(data)
      setTotalCount(response.data.count || data.length)
      setCurrentPage(page)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'No se pudieron cargar los contratos.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchLookups = async () => {
    try {
      const [procRes, estRes, catRes, oriRes, provRes, setupsRes, typesRes] = await Promise.all([
        api.get('contratos/procesos/'),
        api.get('contratos/estados/'),
        api.get('contratos/categorias/'),
        api.get('contratos/orientaciones/'),
        api.get('proveedores/'),
        api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
        api.get('tipos-establecimiento/'),
      ])
      setProcesos(procRes.data.results || procRes.data)
      setEstados(estRes.data.results || estRes.data)
      setCategorias(catRes.data.results || catRes.data)
      setOrientaciones(oriRes.data.results || oriRes.data)
      setProveedores(provRes.data.results || provRes.data)
      setEstablecimientos(setupsRes.data.results || setupsRes.data)
      setTiposEstablecimiento(typesRes.data.results || typesRes.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchData(1, pageSize, debouncedSearch)
  }, [ordering, filterCategoria, filterOrientacion, pageSize, debouncedSearch])

  useEffect(() => {
    fetchLookups()
  }, [])

  const clearFilters = () => {
    setSearchQuery('')
    setFilterCategoria('')
    setFilterOrientacion('')
    setCurrentPage(1)
  }

  const handleNew = () => {
    setFormData(emptyForm(lookups))
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (item) => {
    setFormData({
      codigo_mercado_publico: item.codigo_mercado_publico,
      descripcion: item.descripcion,
      proceso: item.proceso,
      estado: item.estado,
      categoria: item.categoria,
      orientacion: item.orientacion || '',
      proveedor: item.proveedor || '',
      fecha_adjudicacion: item.fecha_adjudicacion,
      fecha_inicio: item.fecha_inicio,
      fecha_termino: item.fecha_termino,
      tipo_oc: item.tipo_oc || 'UNICA',
      nro_oc: item.nro_oc || '',
      cdp: item.cdp || '',
      proveedores_asociados: item.proveedores_asociados || [],
      establecimientos: item.establecimientos || [],
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSave = async (dataToSubmit) => {
    const finalData = { ...dataToSubmit }
    if (finalData.orientacion === '') delete finalData.orientacion

    try {
      if (editingId) {
        await api.put(`contratos/contratos/${editingId}/`, finalData)
      } else {
        await api.post('contratos/contratos/', finalData)
      }
    } catch (error) {
      console.error(error)
      throw error
    }
  }

  const handleFormClose = (result) => {
    setShowForm(false)
    if (result?.saved) {
      fetchData(currentPage, pageSize, debouncedSearch)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/contratos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Contrato eliminado.' })
      await fetchData(currentPage, pageSize, searchQuery)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el contrato.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'codigo',
        header: 'Código / Referencia',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => (
          <button
            type="button"
            className="table-link"
            onClick={() => navigate(`/contracts/${item.id}`)}
          >
            <span className="contracts-code">{item.codigo_mercado_publico}</span>
            <span className="contracts-desc">{item.descripcion}</span>
          </button>
        ),
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => (
          <Badge variant={estadoVariant(item.estado_nombre)} dot>
            {item.estado_nombre || 'N/A'}
          </Badge>
        ),
      },
      {
        key: 'categoria',
        header: 'Categoría',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        sortable: true,
        render: (item) => (
          <Badge variant="accent">{item.categoria_nombre || '—'}</Badge>
        ),
      },
      {
        key: 'proceso',
        header: 'Proceso',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        sortable: true,
        render: (item) => item.proceso_nombre || '—',
      },
      {
        key: 'proveedores',
        header: 'Proveedores',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <span className="contracts-providers" title={providersLabel(item)}>
            {providersLabel(item)}
          </span>
        ),
      },
      {
        key: 'fecha_termino',
        header: 'Vencimiento',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        sortable: true,
        render: (item) => formatDate(item.fecha_termino),
      },
      {
        key: 'plazo',
        header: 'Plazo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (item.plazo_meses != null ? `${item.plazo_meses} meses` : '—'),
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
              onClick={() => navigate(`/contracts/${item.id}`)}
            >
              Ver
            </Button>
            {can('contratos.change_contrato') ? (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {can('contratos.delete_contrato') ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(item)}
              >
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [can, navigate],
  )

  const sortKeyMap = {
    codigo: 'codigo_mercado_publico',
    estado: 'estado__nombre',
    categoria: 'categoria__nombre',
    proceso: 'proceso__nombre',
    fecha_termino: 'fecha_termino',
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

  return (
    <div className="page" data-od-id="contracts-page" data-fill-viewport>
      <PageHeader
        icon="contratos"
        title="Contratos"
        description={`Gestión de convenios y compras (${totalCount})`}
        breadcrumbs={[{ label: 'SSGG' }, { label: 'Contratos' }]}
        linkComponent={Link}
        split
        actions={
          can('contratos.add_contrato') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo contrato
            </Button>
          ) : null
        }
      />

      

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters} advanced={
        <>
          <Field label="Orientación" htmlFor="c-ori">
            <Select
              id="c-ori"
              value={filterOrientacion}
              onChange={(e) => {
                setFilterOrientacion(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Todas</option>
              {orientaciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría" htmlFor="c-cat">
            <Select
              id="c-cat"
              value={filterCategoria}
              onChange={(e) => {
                setFilterCategoria(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </>
      }>
        <Field label="Buscar" htmlFor="c-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="c-q"
              type="search"
              placeholder="Código o descripción…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={contracts}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin contratos"
        emptyDescription="No hay contratos con los filtros actuales."
        emptyAction={
          can('contratos.add_contrato') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo contrato
            </Button>
          ) : (
            <Button variant="quiet" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="contracts-page-size"
        onPageChange={(p) => fetchData(p, pageSize, debouncedSearch)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: { label: 'Ver', onClick: () => navigate(`/contracts/${item.id}`) },
          secondary: can('contratos.change_contrato')
            ? { label: 'Editar', onClick: () => handleEdit(item) }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <ContractModal
        open={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={lookups}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar contrato"
        description={
          deleteTarget
            ? `¿Eliminar el contrato ${deleteTarget.codigo_mercado_publico}?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default Contracts
