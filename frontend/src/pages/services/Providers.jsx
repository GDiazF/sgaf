import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import ProviderModal from '../../components/services/ProviderModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  ConfirmModal,
  Icon
} from '@slep/ui'

const emptyForm = {
  nombre: '',
  rut: '',
  acronimo: '',
  contacto: '',
  tipo_proveedor: '',
}

const Providers = () => {
  const { can } = usePermission()

  const [providers, setProviders] = useState([])
  const [providerTypes, setProviderTypes] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('nombre')

  const debouncedSearch = useDebouncedValue(searchQuery)

  // El endpoint desactiva paginación (selectores); acá se pagina en cliente.
  const fetchData = async (search = debouncedSearch, order = ordering) => {
    setLoading(true)
    try {
      const params = {
        ...(search ? { search } : {}),
        ordering: order,
      }

      const [provRes, typesRes] = await Promise.all([
        api.get('proveedores/', { params }),
        api.get('tipos-proveedores/'),
      ])

      const provData = provRes.data.results || (Array.isArray(provRes.data) ? provRes.data : [])
      setProviders(provData)
      setProviderTypes(typesRes.data.results || typesRes.data)
    } catch (error) {
      console.error(error)
      setProviders([])
      notify({ variant: 'danger', text: 'No se pudieron cargar los proveedores.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(debouncedSearch, ordering)
  }, [ordering, debouncedSearch])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, ordering, pageSize])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return providers.slice(start, start + pageSize)
  }, [providers, currentPage, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (item) => {
    setFormData({
      nombre: item.nombre || '',
      rut: item.rut || '',
      acronimo: item.acronimo || '',
      contacto: item.contacto || '',
      tipo_proveedor: item.tipo_proveedor || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSave = async (dataToSubmit) => {
    try {
      if (editingId) {
        await api.put(`proveedores/${editingId}/`, dataToSubmit)
      } else {
        await api.post('proveedores/', dataToSubmit)
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
      fetchData(debouncedSearch, ordering)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`proveedores/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Proveedor eliminado.' })
      await fetchData(debouncedSearch, ordering)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el proveedor.' })
    } finally {
      setDeleting(false)
    }
  }

  const sortKeyMap = {
    nombre: 'nombre',
    tipo: 'tipo_proveedor__nombre',
    rut: 'rut',
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

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Proveedor',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.nombre}</strong>
            {item.acronimo ? <span>{item.acronimo}</span> : null}
          </div>
        ),
      },
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) =>
          item.tipo_proveedor_nombre ? (
            <Badge variant="neutral">{item.tipo_proveedor_nombre}</Badge>
          ) : (
            '—'
          ),
      },
      {
        key: 'rut',
        header: 'RUT',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        sortable: true,
        render: (item) => item.rut || '—',
      },
      {
        key: 'contacto',
        header: 'Contacto',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => (
          <span title={item.contacto || ''}>{item.contacto || '—'}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            {can('servicios.change_proveedor') ? (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {can('servicios.delete_proveedor') ? (
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)}>
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [can],
  )

  return (
    <div className="page" data-od-id="proveedores-page" data-fill-viewport>
      <PageHeader
        icon="proveedores"
        title="Proveedores"
        description={`Empresas prestadoras de servicios (${providers.length})`}
        breadcrumbs={[{ label: 'SSGG' }, { label: 'Proveedores' }]}
        linkComponent={Link}
        split
        actions={
          can('servicios.add_proveedor') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo proveedor
            </Button>
          ) : null
        }
      />

      

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
      >
        <Field label="Buscar" htmlFor="prov-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="prov-q"
              type="search"
              placeholder="Nombre, RUT o tipo…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={providers.length}
        emptyTitle="Sin proveedores"
        emptyDescription="No hay proveedores con la búsqueda actual."
        emptyAction={
          can('servicios.add_proveedor') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo proveedor
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
        pageSizeId="proveedores-page-size"
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: can('servicios.change_proveedor')
            ? { label: 'Editar', onClick: () => handleEdit(item) }
            : undefined,
          secondary: can('servicios.delete_proveedor')
            ? { label: 'Eliminar', onClick: () => setDeleteTarget(item) }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{providers.length}</Badge>
          </div>
        }
      />

      <ProviderModal
        open={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={{ providerTypes }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar proveedor"
        description={
          deleteTarget ? `¿Eliminar a ${deleteTarget.nombre}?` : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default Providers
