import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useNotify } from '../../hooks/useNotify'
import DocumentViewerModal from '../../components/common/DocumentViewerModal'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Textarea,
  Modal,
  ConfirmModal,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const initialFormState = {
  nombre: '',
  anio: new Date().getFullYear(),
  descripcion: '',
  archivo: null,
}

const mediaUrl = (path) => {
  if (!path) return '#'
  if (path.startsWith('http')) return path
  return `${import.meta.env.VITE_API_URL || ''}${path}`
}

const previewPath = (path) => {
  if (!path) return null
  return path.replace(/^https?:\/\/[^/]+/, '')
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('es-CL')
}

const CDPManager = () => {
  const { can } = usePermission()
  const canAdd = can('servicios.add_cdp')
  const canDelete = can('servicios.delete_cdp')
  const canChange = can('servicios.change_cdp')

  const [cdps, setCdps] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [ordering, setOrdering] = useState('-anio,-fecha_subida')
  const debouncedSearch = useDebouncedValue(searchQuery)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialFormState)
  const formOverlay = useFormOverlay()

  const [previewUrl, setPreviewUrl] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const { notify } = useNotify()

  const fetchData = async (
    page = currentPage,
    size = pageSize,
    search = debouncedSearch,
    order = ordering,
  ) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: size,
        ...(search ? { search } : {}),
        ordering: order,
      }
      const response = await api.get('cdps/', { params })
      const data = response.data.results || response.data
      const count =
        response.data.count ?? (Array.isArray(response.data) ? response.data.length : 0)
      setCdps(Array.isArray(data) ? data : [])
      setTotalCount(count)
    } catch (error) {
      console.error('Error fetching CDPs:', error)
      setCdps([])
      notify({ variant: 'danger', text: 'No se pudieron cargar los CDPs.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (searchQuery !== debouncedSearch) return
    fetchData(currentPage, pageSize, debouncedSearch, ordering)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, ordering, debouncedSearch, searchQuery])

  const clearFilters = () => {
    setSearchQuery('')
    setCurrentPage(1)
  }

  const sortKeyMap = {
    nombre: 'nombre',
    anio: 'anio',
    fecha: 'fecha_subida',
  }

  const handleSort = (colKey) => {
    const apiKey = sortKeyMap[colKey]
    if (!apiKey) return
    const next =
      ordering === apiKey || ordering.startsWith(`${apiKey},`)
        ? `-${apiKey}`
        : ordering === `-${apiKey}` || ordering.startsWith(`-${apiKey},`)
          ? apiKey
          : apiKey
    setOrdering(next)
    setCurrentPage(1)
  }

  const activeSortKey = Object.entries(sortKeyMap).find(([, apiKey]) => {
    const parts = ordering.split(',')
    return parts.some((p) => p === apiKey || p === `-${apiKey}`)
  })?.[0]

  const handleNew = () => {
    formOverlay.reset()
    setFormData(initialFormState)
    setEditingId(null)
    setShowForm(true)
  }

  const handleEdit = (item) => {
    formOverlay.reset()
    setFormData({
      nombre: item.nombre || '',
      anio: item.anio || new Date().getFullYear(),
      descripcion: item.descripcion || '',
      archivo: null,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handlePreview = (item) => {
    setPreviewUrl(previewPath(item.archivo))
    setSelectedDoc(item)
  }

  const closeFormModal = () => {
    if (formOverlay.busy) return
    formOverlay.reset()
    setShowForm(false)
  }

  const handleFormOverlayDismiss = () => {
    if (formOverlay.status === 'success') {
      formOverlay.reset()
      setShowForm(false)
      fetchData(currentPage, pageSize, debouncedSearch, ordering)
      return
    }
    formOverlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    try {
      await formOverlay.run(
        async () => {
          const data = new FormData()
          data.append('nombre', formData.nombre)
          data.append('anio', formData.anio)
          data.append('descripcion', formData.descripcion || '')
          if (formData.archivo) {
            data.append('archivo', formData.archivo)
          }

          if (editingId) {
            await api.patch(`cdps/${editingId}/`, data, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } else {
            await api.post('cdps/', data, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          }
        },
        {
          successDescription: editingId ? 'CDP actualizado.' : 'CDP subido correctamente.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`cdps/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'CDP eliminado.' })
      await fetchData(currentPage, pageSize, debouncedSearch, ordering)
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar el CDP.' })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'nombre',
        header: 'Nombre',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        sortable: true,
        render: (item) => item.nombre || '—',
      },
      {
        key: 'anio',
        header: 'Año',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        sortable: true,
        render: (item) => (
          <Badge variant="accent">Año {item.anio || '—'}</Badge>
        ),
      },
      {
        key: 'descripcion',
        header: 'Descripción',
        className: 'col--secondary col--tablet-hide',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => item.descripcion || 'Sin descripción',
      },
      {
        key: 'fecha',
        header: 'Subida',
        cardRole: 'field',
        priority: 3,
        sortable: true,
        render: (item) => formatDate(item.fecha_subida),
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
              title="Previsualizar"
              onClick={() => handlePreview(item)}
            >
              <Icon name="eye" size="sm" />
            </Button>
            {item.archivo ? (
              <a
                href={mediaUrl(item.archivo)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost btn--sm"
                title="Descargar / abrir"
              >
                <Icon name="download" size="sm" />
              </a>
            ) : null}
            {canChange ? (
              <Button
                variant="ghost"
                size="sm"
                title="Editar"
                onClick={() => handleEdit(item)}
              >
                <Icon name="edit" size="sm" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                title="Eliminar"
                onClick={() => setDeleteTarget(item)}
              >
                <Icon name="trash" size="sm" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canChange, canDelete],
  )

  return (
    <div className="page" data-od-id="cdps-page" data-fill-viewport>
      <PageHeader
        icon="file-check"
        title="Repositorio CDPs"
        description={`Certificados de disponibilidad presupuestaria (${totalCount})`}
        breadcrumbs={[{ label: 'SSGG' }, { label: 'CDPs' }]}
        linkComponent={Link}
        split
        actions={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="upload" size="sm" /> Subir CDP
            </Button>
          ) : null
        }
      />

      

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="cdp-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="cdp-q"
              type="search"
              placeholder="Nombre o descripción…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={cdps}
        loading={loading}
        totalCount={totalCount}
        emptyTitle="Sin documentos"
        emptyDescription="No hay CDPs con la búsqueda actual."
        emptyAction={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={handleNew}>
              <Icon name="upload" size="sm" /> Subir CDP
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
        pageSizeId="cdp-page-size"
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        sortKey={activeSortKey}
        onSort={handleSort}
        mobileCardActions={(item) => ({
          primary: {
            label: 'Ver',
            onClick: () => handlePreview(item),
          },
          secondary: canChange
            ? {
                label: 'Editar',
                onClick: () => handleEdit(item),
              }
            : item.archivo
              ? {
                  label: 'Descargar',
                  onClick: () => window.open(mediaUrl(item.archivo), '_blank', 'noopener'),
                }
              : undefined,
        })}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalCount}</Badge>
          </div>
        }
      />

      <Modal
        open={showForm}
        onClose={closeFormModal}
        title={editingId ? 'Editar CDP' : 'Subir nuevo CDP'}
        subheader="Documentación presupuestaria"
        {...formOverlay.modalProps}
        onOverlayDismiss={handleFormOverlayDismiss}
        footer={
          <>
            <Button variant="quiet" onClick={closeFormModal} disabled={formOverlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="cdp-form"
              loading={formOverlay.busy}
              disabled={formOverlay.busy || formOverlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Subir documento'}
            </Button>
          </>
        }
      >
        <form id="cdp-form" onSubmit={handleSubmit} className="crud-form">
          <div className="form-grid">
            <Field label="Nombre" htmlFor="cdp-nombre" required>
              <Input
                id="cdp-nombre"
                required
                placeholder="Ej: CDP Agua"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
              />
            </Field>
            <Field label="Año" htmlFor="cdp-anio" required>
              <Input
                id="cdp-anio"
                type="number"
                required
                min={2020}
                max={2100}
                value={formData.anio}
                onChange={(e) =>
                  setFormData({ ...formData, anio: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Descripción" htmlFor="cdp-desc">
            <Textarea
              id="cdp-desc"
              rows={2}
              placeholder="Breve descripción del CDP (opcional)…"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
            />
          </Field>

          <Field
            label={editingId ? 'Reemplazar archivo (PDF)' : 'Archivo (PDF)'}
            htmlFor="cdp-file"
            required={!editingId}
            hint={
              editingId && !formData.archivo
                ? 'Si no sube un archivo nuevo, se mantendrá el original.'
                : undefined
            }
          >
            <Input
              id="cdp-file"
              type="file"
              required={!editingId}
              accept=".pdf,.doc,.docx"
              onChange={(e) =>
                setFormData({ ...formData, archivo: e.target.files?.[0] || null })
              }
            />
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar CDP"
        description={`¿Seguro que desea eliminar «${deleteTarget?.nombre || ''}»?`}
        confirmLabel="Eliminar"
        danger
      />

      <DocumentViewerModal
        isOpen={!!previewUrl}
        onClose={() => {
          setPreviewUrl(null)
          setSelectedDoc(null)
        }}
        fileUrl={previewUrl}
        title={selectedDoc?.nombre || 'Documento'}
        subtitle={selectedDoc ? `Año ${selectedDoc.anio}` : ''}
        documentType="CDP"
      />
    </div>
  )
}

export default CDPManager
