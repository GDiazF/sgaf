import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import AssetModal from '../../components/keys/AssetModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  ConfirmModal,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Icon
} from '@slep/ui'

const EMPTY_FORM = {
  tipo: '',
  nombre: '',
  codigo_inventario: '',
  establecimiento: '',
  ubicacion: '',
}

const Assets = () => {
  const { can } = usePermission()

  const [assets, setAssets] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [ordering, setOrdering] = useState('nombre')

  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const { notify } = useNotify()
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  const debouncedSearch = useDebouncedValue(searchQuery)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page: currentPage,
        search: debouncedSearch,
        ordering,
        page_size: pageSize,
      }

      if (availabilityFilter === 'available') {
        params.disponible = 'true'
      } else if (availabilityFilter === 'in_use') {
        params.disponible = 'false'
      }

      const [assetsRes, estRes] = await Promise.all([
        api.get('activos/', { params }),
        api.get('establecimientos/?page_size=1000'),
      ])

      setAssets(assetsRes.data.results || [])
      setTotalCount(assetsRes.data.count || 0)
      setEstablishments(estRes.data.results || estRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setAssets([])
      notify({ variant: 'danger', text: 'Error al cargar el inventario de activos.' })
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, ordering, availabilityFilter, pageSize])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, ordering, availabilityFilter, pageSize])

  const clearFilters = () => {
    setSearchQuery('')
    setAvailabilityFilter('all')
    setOrdering('nombre')
    setCurrentPage(1)
  }

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (availabilityFilter !== 'all' ? 1 : 0) +
    (ordering !== 'nombre' ? 1 : 0)

  const handleEdit = (asset) => {
    setFormData({
      tipo: asset.tipo ?? '',
      codigo_inventario: asset.codigo_inventario ?? '',
      nombre: asset.nombre ?? '',
      establecimiento: asset.establecimiento ?? '',
      ubicacion: asset.ubicacion ?? '',
    })
    setEditingId(asset.id)
    setShowForm(true)
  }

  const handleNew = () => {
    setFormData(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`activos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Activo eliminado.' })
      await fetchData()
    } catch (error) {
      console.error(error)
      notify({
        variant: 'danger',
        text: 'Error al eliminar. Puede que esté asociado a préstamos históricos.',
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleSave = async (dataToSubmit) => {
    try {
      if (editingId) {
        await api.put(`activos/${editingId}/`, dataToSubmit)
      } else {
        await api.post('activos/', dataToSubmit)
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
      fetchData()
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'tipo',
        header: 'Tipo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 3,
        render: (item) => (
          <Badge variant="neutral">{item.tipo_nombre || item.tipo || '—'}</Badge>
        ),
      },
      {
        key: 'identificacion',
        header: 'Identificación',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.nombre || '—'}</strong>
            {item.codigo_inventario ? (
              <span>S/N: {item.codigo_inventario}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => item.establecimiento_nombre || '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) =>
          !item.disponible ? (
            <div className="contracts-cat">
              <Badge variant="warning">En uso</Badge>
              {item.solicitante_actual ? (
                <span>{item.solicitante_actual}</span>
              ) : null}
            </div>
          ) : (
            <Badge variant="success">Disponible</Badge>
          ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
            {can('prestamo_llaves.change_activo') ? (
              <Button variant="ghost" size="sm" title="Editar" onClick={() => handleEdit(item)}>
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {can('prestamo_llaves.delete_activo') ? (
              <Button
                variant="ghost"
                size="sm"
                title="Eliminar"
                onClick={() =>
                  setDeleteTarget({
                    id: item.id,
                    label: item.nombre,
                  })
                }
              >
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
    <div
      className="page"
      data-od-id="activos-page"
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="key"
        title="Inventario de activos"
        description="Registro y configuración de activos institucionales"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Préstamos', to: '/loans' },
          { label: 'Inventario' },
        ]}
        linkComponent={Link}
        split
        actions={
          can('prestamo_llaves.add_activo') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo activo
            </Button>
          ) : null
        }
      />

      

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        activeCount={activeFilterCount}
        advanced={
          <>
            <Field label="Estado" htmlFor="assets-disponible">
              <Select
                id="assets-disponible"
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
              >
                <option value="all">Todas</option>
                <option value="available">Disponibles</option>
                <option value="in_use">En uso</option>
              </Select>
            </Field>
            <Field label="Orden" htmlFor="assets-order">
              <Select
                id="assets-order"
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
              >
                <option value="nombre">Nombre (A-Z)</option>
                <option value="-nombre">Nombre (Z-A)</option>
                <option value="establecimiento__nombre">Establecimiento</option>
              </Select>
            </Field>
          </>
        }
      >
        <Field label="Buscar" htmlFor="assets-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="assets-q"
              type="search"
              placeholder="Nombre, código o establecimiento…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={assets}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin activos"
        emptyDescription="No se encontraron activos con los filtros actuales."
        emptyAction={
          can('prestamo_llaves.add_activo') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo activo
            </Button>
          ) : (
            <Button variant="quiet" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )
        }
        fillViewport={!isNarrow}
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="activos-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => ({
          primary: can('prestamo_llaves.change_activo')
            ? { label: 'Editar', onClick: () => handleEdit(item) }
            : undefined,
          secondary: can('prestamo_llaves.delete_activo')
            ? {
                label: 'Eliminar',
                onClick: () =>
                  setDeleteTarget({
                    id: item.id,
                    label: item.nombre,
                  }),
              }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Activos</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <AssetModal
        open={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={{ establishments }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar activo"
        description={`¿Eliminar ${deleteTarget?.label || 'este activo'}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
      />
    </div>
  )
}

export default Assets
