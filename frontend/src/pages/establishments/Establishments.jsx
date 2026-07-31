import React, { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import EstablishmentModal from '../../components/establishments/EstablishmentModal'
import EstablishmentPhonesModal from '../../components/establishments/EstablishmentPhonesModal'
import EstablishmentCardsView from '../../components/establishments/EstablishmentCardsView'
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal'
import EstablishmentDetailModal from '../../components/establishments/EstablishmentDetailModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  IconButton,
  Field,
  Input,
  Select,
  Icon,
  ConfirmModal,
} from '@slep/ui'
import { Link } from 'react-router-dom'

const Establishments = () => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const canAdd = can('establecimientos.add_establecimiento')
  const canChange = can('establecimientos.change_establecimiento')
  const canDelete = can('establecimientos.delete_establecimiento')

  const [establishments, setEstablishments] = useState([])
  const [establishmentTypes, setEstablishmentTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingDirectory, setLoadingDirectory] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isPhonesModalOpen, setIsPhonesModalOpen] = useState(false)
  const [selectedEstForPhones, setSelectedEstForPhones] = useState(null)
  const [allEstablishments, setAllEstablishments] = useState([])

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('nombre')
  const [pageSize, setPageSize] = useState(10)
  const debouncedSearchQuery = useDebouncedValue(searchQuery)

  const [editingId, setEditingId] = useState(null)
  const [isCardsViewOpen, setIsCardsViewOpen] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [selectedEstForMap, setSelectedEstForMap] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedEstForDetail, setSelectedEstForDetail] = useState(null)
  const [filterType, setFilterType] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [formData, setFormData] = useState({
    rbd: '',
    nombre: '',
    tipo: '',
    director: '',
    direccion: '',
    email: '',
    url_web: '',
    latitud: '',
    longitud: '',
    activo: true,
  })

  const fetchData = async (page = 1, search = '', type = '', order = ordering) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        search,
        ...(type && { tipo: type }),
        ordering: order,
      }
      const response = await api.get('establecimientos/', { params })
      setEstablishments(response.data.results || [])
      setTotalCount(response.data.count || 0)
    } catch (error) {
      console.error('Error fetching establishments:', error)
      setEstablishments([])
      notify({ variant: 'danger', text: 'Error al cargar establecimientos.' })
    } finally {
      setLoading(false)
    }
  }

  const fetchTypes = async () => {
    try {
      const response = await api.get('tipos-establecimiento/')
      setEstablishmentTypes(response.data.results || response.data)
      if ((response.data.results || response.data).length > 0) {
        setFormData((prev) => ({ ...prev, tipo: (response.data.results || response.data)[0].id }))
      }
    } catch (error) {
      console.error('Error fetching types:', error)
    }
  }

  const fetchAllForDirectory = () => {
    if (allEstablishments.length === 0) {
      const loadData = async () => {
        setLoadingDirectory(true)
        try {
          const response = await api.get('establecimientos/', { params: { page_size: 1000 } })
          setAllEstablishments(response.data.results || response.data)
          setIsCardsViewOpen(true)
        } catch (error) {
          console.error('Error fetching all establishments:', error)
          notify({ variant: 'danger', text: 'Error al cargar el directorio completo.' })
        } finally {
          setLoadingDirectory(false)
        }
      }
      loadData()
    } else {
      setIsCardsViewOpen(true)
    }
  }

  useEffect(() => {
    fetchTypes()
    const loadAllData = async () => {
      try {
        const response = await api.get('establecimientos/', { params: { page_size: 1000 } })
        setAllEstablishments(response.data.results || response.data)
      } catch (error) {
        console.error('Error fetching all establishments for map:', error)
      }
    }
    loadAllData()
  }, [])

  useEffect(() => {
    fetchData(currentPage, debouncedSearchQuery, filterType, ordering)
  }, [currentPage, debouncedSearchQuery, filterType, ordering, pageSize])

  const handleSearch = (query) => {
    setSearchQuery(query)
    setCurrentPage(1)
  }

  const handleFilterChange = (e) => {
    setFilterType(e.target.value)
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setFilterType('')
    setCurrentPage(1)
  }

  const handlePageChange = (page) => setCurrentPage(page)

  const handleSort = (newOrdering) => {
    setOrdering(newOrdering)
    setCurrentPage(1)
  }

  const handleEdit = (item) => {
    setFormData(item)
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleOpenPhones = (item) => {
    setSelectedEstForPhones(item)
    setIsPhonesModalOpen(true)
  }

  const handleOpenMap = (item) => {
    setSelectedEstForMap(item || null)
    setIsMapModalOpen(true)
  }

  const handleOpenDetail = (item) => {
    setSelectedEstForDetail(item)
    setIsDetailModalOpen(true)
  }

  const handleExportExcel = () => {
    if (allEstablishments.length === 0) {
      notify({ variant: 'warning', text: 'No hay datos para exportar.' })
      return
    }
    try {
      const exportData = allEstablishments.map((est) => ({
        RBD: est.rbd,
        Nombre: est.nombre,
        Tipo: est.tipo_nombre,
        'Director/a': est.director || 'No asignado',
        Email: est.email || 'Sin email',
        Dirección: est.direccion || 'Sin dirección',
        Teléfonos: (est.telefonos || []).map((t) => t.numero).join(', '),
        Latitud: est.latitud || '',
        Longitud: est.longitud || '',
        Estado: est.activo ? 'Activo' : 'Inactivo',
      }))
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Establecimientos')
      XLSX.writeFile(wb, `Establecimientos_SLEP_${new Date().getFullYear()}.xlsx`)
      notify({ variant: 'success', text: 'Excel exportado correctamente.' })
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al exportar el Excel.' })
    }
  }

  const handleNew = () => {
    setFormData({
      rbd: '',
      nombre: '',
      tipo: establishmentTypes.length > 0 ? establishmentTypes[0].id : '',
      director: '',
      direccion: '',
      email: '',
      url_web: '',
      latitud: '',
      longitud: '',
      activo: true,
    })
    setEditingId(null)
    setShowForm(true)
  }

  const handleDelete = (item) => {
    setDeleteTarget(item)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`establecimientos/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Establecimiento eliminado.' })
      await fetchData(currentPage, debouncedSearchQuery, filterType, ordering)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el establecimiento.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      await api.patch(`establecimientos/${id}/`, { activo: !currentStatus })
      notify({
        variant: 'success',
        text: currentStatus ? 'Establecimiento marcado como inactivo.' : 'Establecimiento marcado como activo.',
      })
      fetchData(currentPage, searchQuery, filterType, ordering)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al actualizar el estado.' })
    }
  }

  const handleSave = async (dataToSubmit) => {
    const formDataToSend = new FormData()
    Object.keys(dataToSubmit).forEach((key) => {
      const value = dataToSubmit[key]
      if (key === 'logo') {
        if (value instanceof File) formDataToSend.append(key, value)
      } else if (['latitud', 'longitud', 'rbd'].includes(key)) {
        if (value !== '' && value !== null && value !== undefined) {
          formDataToSend.append(key, value)
        }
      } else if (key !== 'telefonos' && key !== 'telefonos_detalle') {
        formDataToSend.append(key, value === null ? '' : value)
      }
    })

    try {
      if (editingId) {
        await api.patch(`establecimientos/${editingId}/`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } else {
        await api.post('establecimientos/', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
    } catch (error) {
      console.error('Error saving establishment:', error.response?.data || error)
      throw error
    }
  }

  const handleFormClose = (result) => {
    setShowForm(false)
    if (result?.saved) {
      fetchData(currentPage, searchQuery, filterType, ordering)
    }
  }

  const filteredData = establishments
  const sortKey = ordering.replace(/^-/, '')

  const columns = useMemo(
    () => [
      {
        key: 'activo',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) =>
          canChange ? (
            <button
              type="button"
              className="badge-toggle"
              aria-label={item.activo ? 'Marcar inactivo' : 'Marcar activo'}
              onClick={() => handleStatusToggle(item.id, item.activo)}
            >
              <Badge variant={item.activo ? 'success' : 'neutral'} dot>
                {item.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </button>
          ) : (
            <Badge variant={item.activo ? 'success' : 'neutral'} dot>
              {item.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
      },
      {
        key: 'rbd',
        header: 'RBD',
        className: 'col--secondary mono',
        sortable: true,
        cardRole: 'subtitle',
        priority: 1,
        render: (item) => <span className="mono">{item.rbd}</span>,
      },
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--primary',
        sortable: true,
        cardRole: 'title',
        priority: 1,
        render: (item) => (
          <button
            type="button"
            className="table-link est-name-cell"
            onClick={() => handleOpenDetail(item)}
          >
            {item.logo ? (
              <img src={item.logo} alt="" className="avatar avatar--sm est-name-cell__logo" />
            ) : (
              <span className="avatar avatar--sm est-name-cell__logo" aria-hidden>
                <Icon name="establecimientos" size={14} />
              </span>
            )}
            <span className="est-name-cell__label">{item.nombre}</span>
          </button>
        ),
      },
      {
        key: 'tipo_nombre',
        header: 'Tipo',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => <Badge variant="accent">{item.tipo_nombre}</Badge>,
      },
      {
        key: 'director',
        header: 'Director',
        sortable: true,
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => item.director || '—',
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            <IconButton aria-label="Teléfonos" onClick={() => handleOpenPhones(item)}>
              <Icon name="telefonos" size="sm" />
            </IconButton>
            <IconButton aria-label="Mapa" onClick={() => handleOpenMap(item)}>
              <Icon name="establecimientos" size="sm" />
            </IconButton>
            {canChange ? (
              <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" size="sm" onClick={() => handleDelete(item)}>
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
    <div className="page" data-od-id="establecimientos-page">
      <PageHeader
        icon="establecimientos"
        title="Establecimientos"
        description="Gestión institucional de escuelas, liceos y jardines"
        breadcrumbs={[{ label: 'Inicio', to: '/' }, { label: 'Establecimientos' }]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={fetchAllForDirectory} disabled={loadingDirectory}>
              Directorio
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleOpenMap(null)}>
              Mapa
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportExcel}>
              <Icon name="download" size="sm" /> Excel
            </Button>
            {canAdd ? (
              <Button variant="primary" size="sm" onClick={handleNew}>
                <Icon name="plus" size="sm" /> Nuevo
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar
        onSearch={() => setCurrentPage(1)}
        onClear={clearFilters}
        advanced={
          <Field label="Tipo" htmlFor="est-tipo">
            <Select id="est-tipo" value={filterType} onChange={handleFilterChange}>
              <option value="">Todos los tipos</option>
              {establishmentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>
        }
      >
        <Field label="Buscar" htmlFor="est-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="est-q"
              type="search"
              placeholder="Nombre o RBD…"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={filteredData}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin establecimientos"
        emptyDescription="No hay registros con los filtros actuales."
        emptyAction={
          <Button variant="quiet" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="est-page-size"
        onPageChange={handlePageChange}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={sortKey}
        onSort={(key) => {
          const next = ordering === key ? `-${key}` : ordering === `-${key}` ? key : key
          handleSort(next)
        }}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Ver detalle',
            onClick: () => handleOpenDetail(item),
          },
          secondary: canChange
            ? {
                label: 'Editar',
                onClick: () => handleEdit(item),
              }
            : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount} registros</Badge>
          </div>
        }
      />

      <EstablishmentModal
        isOpen={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        establishmentTypes={establishmentTypes}
      />
      <EstablishmentPhonesModal
        isOpen={isPhonesModalOpen}
        onClose={() => {
          setIsPhonesModalOpen(false)
          fetchData(currentPage, searchQuery, filterType, ordering)
        }}
        establishment={selectedEstForPhones}
      />
      <EstablishmentCardsView
        isOpen={isCardsViewOpen}
        onClose={() => setIsCardsViewOpen(false)}
        data={allEstablishments}
        establishmentTypes={establishmentTypes}
      />
      <EstablishmentMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        establishment={selectedEstForMap}
        allEstablishments={allEstablishments}
      />
      <EstablishmentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        establishment={selectedEstForDetail}
      />
      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar establecimiento"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}» (RBD ${deleteTarget.rbd})? Esta acción no se puede deshacer.`
            : '¿Eliminar este establecimiento?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default Establishments
