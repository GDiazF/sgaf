import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import ServiceModal from '../../components/services/ServiceModal'
import BulkUploadModal from '../../components/common/BulkUploadModal'
import ServiceDetailModal from '../../components/services/ServiceDetailModal'
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
  proveedor: '',
  establecimiento: '',
  numero_cliente: '',
  numero_servicio: '',
  tipo_documento: '',
  unidad_medida: '',
}

const ServicesDashboard = () => {
  const { can } = usePermission()

  const [services, setServices] = useState([])
  const [providers, setProviders] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [docTypes, setDocTypes] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [bulkErrors, setBulkErrors] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const [detailService, setDetailService] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('establecimiento__nombre')
  const [pageSize, setPageSize] = useState(10)
  const debouncedSearch = useDebouncedValue(searchQuery)

  const fetchLookups = async () => {
    try {
      const [provRes, estRes, docRes] = await Promise.all([
        api.get('proveedores/'),
        api.get('establecimientos/', { params: { page_size: 1000 } }),
        api.get('tipos-documentos/'),
      ])
      setProviders(provRes.data.results || provRes.data)
      setEstablishments(estRes.data.results || estRes.data)
      setDocTypes(docRes.data.results || docRes.data)
    } catch (error) {
      console.error(error)
    }
  }

  const fetchData = async (
    page = 1,
    size = pageSize,
    search = debouncedSearch,
    order = ordering,
  ) => {
    setLoading(true)
    try {
      const params = { page, search, ordering: order, page_size: size }
      const servRes = await api.get('servicios/', { params })
      const data = servRes.data.results || (Array.isArray(servRes.data) ? servRes.data : [])
      setServices(data)
      setTotalCount(servRes.data.count ?? data.length)
      setCurrentPage(page)
    } catch (error) {
      console.error(error)
      setServices([])
      notify({ variant: 'danger', text: 'No se pudieron cargar los servicios.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLookups()
  }, [])

  useEffect(() => {
    fetchData(1, pageSize, debouncedSearch, ordering)
  }, [debouncedSearch, ordering, pageSize])

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
      proveedor: item.proveedor,
      establecimiento: item.establecimiento,
      numero_cliente: item.numero_cliente,
      numero_servicio: item.numero_servicio || '',
      tipo_documento: item.tipo_documento || '',
      unidad_medida: item.unidad_medida || '',
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleSave = async (dataToSubmit) => {
    try {
      if (editingId) {
        await api.put(`servicios/${editingId}/`, dataToSubmit)
      } else {
        await api.post('servicios/', dataToSubmit)
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
      fetchData(currentPage, pageSize, debouncedSearch, ordering)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`servicios/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Servicio eliminado.' })
      await fetchData(currentPage, pageSize, debouncedSearch, ordering)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el servicio.' })
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formDataFile = new FormData()
    formDataFile.append('file', file)
    setUploading(true)
    setBulkErrors([])
    try {
      const res = await api.post('servicios/bulk_upload/', formDataFile, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      notify({
        variant: 'success',
        text: res.data.message || 'Carga masiva completada.',
      })
      setShowBulkForm(false)
      await fetchData(currentPage, pageSize, debouncedSearch, ordering)
    } catch (error) {
      console.error(error)
      if (error.response?.data?.errors) {
        setBulkErrors(error.response.data.errors)
      } else {
        notify({
          variant: 'danger',
          text: error.response?.data?.error || 'Error al subir el archivo.',
        })
      }
    } finally {
      setUploading(false)
      e.target.value = null
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('servicios/download_template/', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'plantilla_servicios.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al descargar la plantilla.' })
    }
  }

  const sortKeyMap = {
    establecimiento: 'establecimiento__nombre',
    proveedor: 'proveedor__nombre',
    cliente: 'numero_cliente',
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
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => (
          <div className="contracts-cat">
            <strong>{item.establecimiento_nombre || '—'}</strong>
            {item.establecimiento_rbd ? <span>RBD {item.establecimiento_rbd}</span> : null}
          </div>
        ),
      },
      {
        key: 'proveedor',
        header: 'Proveedor / Servicio',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
        sortable: true,
        render: (item) => (
          <button
            type="button"
            className="table-link"
            onClick={() => setDetailService(item)}
          >
            <strong>{item.proveedor_nombre || '—'}</strong>
            {item.numero_servicio ? <span>Medidor {item.numero_servicio}</span> : null}
          </button>
        ),
      },
      {
        key: 'cliente',
        header: 'Nº Cliente',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => <Badge variant="accent">#{item.numero_cliente}</Badge>,
      },
      {
        key: 'tipo',
        header: 'Tipo Doc.',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) =>
          item.tipo_documento_nombre ? (
            <Badge variant="neutral">{item.tipo_documento_nombre}</Badge>
          ) : (
            '—'
          ),
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
              onClick={() => setDetailService(item)}
              title="Ver detalle"
            >
              <Icon name="eye" size="sm" />
            </Button>
            {can('servicios.change_servicio') ? (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {can('servicios.delete_servicio') ? (
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
    <div className="page" data-od-id="servicios-basicos-page" data-fill-viewport>
      <PageHeader
        icon="servicios"
        title="Servicios básicos"
        description={`Consumos y números de cliente (${totalCount})`}
        breadcrumbs={[{ label: 'SSGG' }, { label: 'Servicios básicos' }]}
        linkComponent={Link}
        split
        actions={
          <>
            {can('servicios.add_servicio') ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setBulkErrors([])
                  setShowBulkForm(true)
                }}
              >
                <Icon name="upload" size="sm" /> Carga masiva
              </Button>
            ) : null}
            {can('servicios.add_servicio') ? (
              <Button variant="primary" size="sm" onClick={handleNew}>
                <Icon name="plus" size="sm" /> Nuevo servicio
              </Button>
            ) : null}
          </>
        }
      />

      

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="svc-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="svc-q"
              type="search"
              placeholder="Cliente, proveedor o establecimiento…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={services}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin servicios"
        emptyDescription="No hay servicios con la búsqueda actual."
        emptyAction={
          can('servicios.add_servicio') ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="plus" size="sm" /> Nuevo servicio
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
        pageSizeId="servicios-page-size"
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={(p) => fetchData(p, pageSize, debouncedSearch, ordering)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: { label: 'Detalle', onClick: () => setDetailService(item) },
          secondary: can('servicios.change_servicio')
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

      <ServiceModal
        open={showForm}
        onClose={handleFormClose}
        onSave={handleSave}
        editingId={editingId}
        initialData={formData}
        lookups={{
          providers,
          establishments,
          documentTypes: docTypes.map((d) => ({ value: d.id, label: d.nombre })),
        }}
      />

      <BulkUploadModal
        open={showBulkForm}
        onClose={() => {
          if (!uploading) setShowBulkForm(false)
        }}
        title="Carga masiva de servicios"
        description="Suba un Excel con servicios básicos (agua, luz, gas, etc.)."
        onUpload={handleBulkUpload}
        onDownloadTemplate={handleDownloadTemplate}
        uploading={uploading}
        errors={bulkErrors}
      />

      <ServiceDetailModal
        open={!!detailService}
        onClose={() => setDetailService(null)}
        service={detailService}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar servicio"
        description={
          deleteTarget
            ? `¿Eliminar el servicio #${deleteTarget.numero_cliente} de ${deleteTarget.establecimiento_nombre}?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default ServicesDashboard
