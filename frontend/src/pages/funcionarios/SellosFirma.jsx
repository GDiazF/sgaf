import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import {
  PageHeader,
  FiltersBar,
  DataTable,
  Badge,
  Button,
  Field,
  Input,
  Select,
  FileInput,
  Modal,
  ConfirmModal,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  nombre: '',
  nivel: 'departamento',
  subdireccion: '',
  departamento: '',
  unidad: '',
  activo: true,
  imagenFile: null,
})

const NIVEL_OPTIONS = [
  { value: 'subdireccion', label: 'Subdirección' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'unidad', label: 'Unidad' },
]

const SellosFirma = () => {
  const navigate = useNavigate()
  const { can } = usePermission()
  const canManage =
    can('firma_digital.add_sellofirma')
    || can('firma_digital.change_sellofirma')
    || can('funcionarios.change_funcionario')
    || can('funcionarios.add_funcionario')
  const canAdd = canManage
  const canChange = canManage
  const canDelete =
    can('firma_digital.delete_sellofirma') || can('funcionarios.change_funcionario')
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalResults, setTotalResults] = useState(0)

  const [subdirecciones, setSubdirecciones] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [unidades, setUnidades] = useState([])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [fileKey, setFileKey] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const debouncedSearch = useDebouncedValue(searchTerm)

  useEffect(() => {
    fetchOrg()
  }, [])

  useEffect(() => {
    fetchData(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, pageSize])

  useEffect(() => {
    if (formData.nivel === 'departamento' && formData.subdireccion) {
      api
        .get('departamentos/', {
          params: { nopaginate: true, subdireccion: formData.subdireccion },
        })
        .then((res) => setDepartamentos(res.data.results || res.data || []))
        .catch(() => setDepartamentos([]))
    }
  }, [formData.nivel, formData.subdireccion])

  useEffect(() => {
    if (formData.nivel === 'unidad' && formData.departamento) {
      api
        .get('unidades/', {
          params: { nopaginate: true, departamento: formData.departamento },
        })
        .then((res) => setUnidades(res.data.results || res.data || []))
        .catch(() => setUnidades([]))
    }
  }, [formData.nivel, formData.departamento])

  const fetchOrg = async () => {
    try {
      const [subRes, depRes, uniRes] = await Promise.all([
        api.get('subdirecciones/', { params: { nopaginate: true } }),
        api.get('departamentos/', { params: { nopaginate: true } }),
        api.get('unidades/', { params: { nopaginate: true } }),
      ])
      setSubdirecciones(subRes.data.results || subRes.data || [])
      setDepartamentos(depRes.data.results || depRes.data || [])
      setUnidades(uniRes.data.results || uniRes.data || [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchData = async (page = currentPage) => {
    setLoading(true)
    try {
      const params = {
        page,
        page_size: pageSize,
        ordering: 'nombre',
      }
      if (debouncedSearch) params.search = debouncedSearch
      const response = await api.get('firma-digital/sellos/', { params })
      if (response.data.results) {
        setItems(response.data.results)
        setTotalResults(response.data.count || 0)
      } else {
        setItems(response.data || [])
        setTotalResults(response.data?.length || 0)
      }
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching sellos:', error)
      setItems([])
      notify({ variant: 'danger', text: 'No se pudieron cargar los sellos.' })
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm())
    setPreviewUrl(null)
    setFileKey((k) => k + 1)
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({
      nombre: item.nombre || '',
      nivel: item.nivel || 'departamento',
      subdireccion: item.subdireccion ? String(item.subdireccion) : '',
      departamento: item.departamento ? String(item.departamento) : '',
      unidad: item.unidad ? String(item.unidad) : '',
      activo: item.activo !== false,
      imagenFile: null,
    })
    setPreviewUrl(item.imagen_url || null)
    setFileKey((k) => k + 1)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    setModalOpen(false)
  }

  const handleOverlayDismiss = () => {
    overlay.dismiss()
    setModalOpen(false)
    fetchData(currentPage)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nombre.trim()) {
      notify({ variant: 'warning', text: 'Ingrese un nombre para el sello.' })
      return
    }
    if (!editingId && !formData.imagenFile) {
      notify({ variant: 'warning', text: 'Debe subir una imagen del sello.' })
      return
    }
    if (formData.nivel === 'subdireccion' && !formData.subdireccion) {
      notify({ variant: 'warning', text: 'Seleccione la subdirección.' })
      return
    }
    if (formData.nivel === 'departamento' && !formData.departamento) {
      notify({ variant: 'warning', text: 'Seleccione el departamento.' })
      return
    }
    if (formData.nivel === 'unidad' && !formData.unidad) {
      notify({ variant: 'warning', text: 'Seleccione la unidad.' })
      return
    }

    const fd = new FormData()
    fd.append('nombre', formData.nombre.trim())
    fd.append('activo', formData.activo ? 'true' : 'false')
    if (formData.nivel === 'subdireccion') {
      fd.append('subdireccion', formData.subdireccion)
      fd.append('departamento', '')
      fd.append('unidad', '')
    } else if (formData.nivel === 'departamento') {
      fd.append('departamento', formData.departamento)
      fd.append('subdireccion', '')
      fd.append('unidad', '')
    } else {
      fd.append('unidad', formData.unidad)
      fd.append('subdireccion', '')
      fd.append('departamento', '')
    }
    if (formData.imagenFile) fd.append('imagen', formData.imagenFile)

    await overlay.run(
      async () => {
        if (editingId) {
          await api.patch(`firma-digital/sellos/${editingId}/`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } else {
          await api.post('firma-digital/sellos/', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      },
      {
        loadingTitle: editingId ? 'Guardando sello…' : 'Creando sello…',
        successTitle: editingId ? 'Sello actualizado' : 'Sello creado',
        errorTitle: 'No se pudo guardar',
        mapError: formatApiFormError,
      },
    )
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`firma-digital/sellos/${deleteTarget.id}/`)
      notify({ variant: 'success', text: 'Sello eliminado.' })
      setDeleteTarget(null)
      fetchData(currentPage)
    } catch (error) {
      notify({
        variant: 'danger',
        text: error?.response?.data?.detail || 'Error al eliminar el sello.',
      })
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'imagen',
        header: 'Sello',
        render: (item) =>
          item.imagen_url ? (
            <img
              className="sello-firma-thumb"
              src={item.imagen_url}
              alt={item.nombre}
            />
          ) : (
            '—'
          ),
      },
      { key: 'nombre', header: 'Nombre', sortable: false },
      {
        key: 'nivel',
        header: 'Nivel',
        render: (item) => <Badge variant="neutral">{item.nivel_label}</Badge>,
      },
      { key: 'organo_nombre', header: 'Órgano' },
      {
        key: 'activo',
        header: 'Estado',
        render: (item) => (
          <Badge variant={item.activo ? 'success' : 'neutral'}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        render: (item) => (
          <div className="table-row-actions">
            {canChange ? (
              <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger-outline" size="sm" onClick={() => setDeleteTarget(item)}>
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
    <div className="page" data-od-id="sellos-firma-page">
      <PageHeader
        icon="file-check"
        title="Sellos de firma"
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Funcionarios', to: '/funcionarios' },
          { label: 'Sellos de firma' },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/funcionarios')}
            >
              Volver al directorio
            </Button>
            {canAdd ? (
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Icon name="plus" size="sm" /> Nuevo sello
              </Button>
            ) : null}
          </>
        }
      />

      <FiltersBar onSearch={() => setCurrentPage(1)} onClear={clearFilters}>
        <Field label="Buscar" htmlFor="sello-q">
          <div className="input-wrap">
            <Icon name="search" className="input-wrap__icon" size="sm" />
            <Input
              id="sello-q"
              type="search"
              placeholder="Buscar por nombre…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </Field>
      </FiltersBar>

      <DataTable
        columns={columns}
        rows={items}
        loading={loading}
        totalCount={totalResults}
        emptyTitle="Sin sellos"
        emptyDescription="Cree un sello y asígnelo a un órgano del organigrama."
        emptyAction={
          canAdd ? (
            <Button variant="primary" onClick={openCreate}>
              Nuevo sello
            </Button>
          ) : null
        }
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="sello-page-size"
        onPageChange={(page) => fetchData(page)}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Listado</span>
            <Badge variant="neutral">{totalResults} registros</Badge>
          </div>
        }
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar sello' : 'Nuevo sello'}
        subheader="Asigne la imagen a un único nivel del organigrama"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeModal} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="sello-firma-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="sello-firma-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="sello-nombre" className="field--full">
              <Input
                id="sello-nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </Field>

            <Field label="Nivel" required htmlFor="sello-nivel">
              <Select
                id="sello-nivel"
                value={formData.nivel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nivel: e.target.value,
                    subdireccion: '',
                    departamento: '',
                    unidad: '',
                  })
                }
              >
                {NIVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>

            {formData.nivel === 'subdireccion' ? (
              <Field label="Subdirección" required htmlFor="sello-sub">
                <Select
                  id="sello-sub"
                  value={formData.subdireccion}
                  onChange={(e) =>
                    setFormData({ ...formData, subdireccion: e.target.value })
                  }
                >
                  <option value="">Seleccione…</option>
                  {subdirecciones.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {formData.nivel === 'departamento' ? (
              <>
                <Field label="Subdirección (filtro)" htmlFor="sello-sub-f">
                  <Select
                    id="sello-sub-f"
                    value={formData.subdireccion}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subdireccion: e.target.value,
                        departamento: '',
                      })
                    }
                  >
                    <option value="">Todas</option>
                    {subdirecciones.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Departamento" required htmlFor="sello-dep" className="field--full">
                  <Select
                    id="sello-dep"
                    value={formData.departamento}
                    onChange={(e) =>
                      setFormData({ ...formData, departamento: e.target.value })
                    }
                  >
                    <option value="">Seleccione…</option>
                    {departamentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {formData.nivel === 'unidad' ? (
              <>
                <Field label="Departamento (filtro)" htmlFor="sello-dep-f">
                  <Select
                    id="sello-dep-f"
                    value={formData.departamento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        departamento: e.target.value,
                        unidad: '',
                      })
                    }
                  >
                    <option value="">Seleccione departamento…</option>
                    {departamentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Unidad" required htmlFor="sello-uni" className="field--full">
                  <Select
                    id="sello-uni"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  >
                    <option value="">Seleccione…</option>
                    {unidades.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            <Field
              label={editingId ? 'Imagen (opcional al editar)' : 'Imagen del sello'}
              required={!editingId}
              hint="PNG o JPG. Varias personas del mismo órgano usarán esta imagen."
              className="field--full"
            >
              <FileInput
                key={fileKey}
                label="Adjuntar imagen"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  setFormData({ ...formData, imagenFile: f })
                  if (f) setPreviewUrl(URL.createObjectURL(f))
                }}
              />
              {previewUrl ? (
                <img
                  className="sello-firma-preview"
                  src={previewUrl}
                  alt="Vista previa sello"
                />
              ) : null}
            </Field>

            <Field label="Estado" htmlFor="sello-activo">
              <Select
                id="sello-activo"
                value={formData.activo ? '1' : '0'}
                onChange={(e) =>
                  setFormData({ ...formData, activo: e.target.value === '1' })
                }
              >
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </Select>
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleDelete}
        title="Eliminar sello"
        description={
          deleteTarget
            ? `¿Eliminar el sello «${deleteTarget.nombre}»? Esta acción no se puede deshacer.`
            : '¿Eliminar este sello?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default SellosFirma
