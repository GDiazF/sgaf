import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  Card,
  CardHeader,
  DataTable,
  Modal,
  Field,
  Input,
  Select,
  Switch,
  FileInput,
  Button,
  Icon,
  IconButton,
  Alert,
  Badge,
  ConfirmModal,
  PermissionBlock,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = {
  titulo: '',
  imagen: null,
  activa: true,
  orden: 0,
  establecimiento: '',
  fecha_inicio: '',
  fecha_fin: '',
}

const LoginBackgroundsAdmin = () => {
  const { can } = usePermission()
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const [items, setItems] = useState([])
  const [establecimientos, setEstablecimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [savedOk, setSavedOk] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [useVigencia, setUseVigencia] = useState(false)
  const [rotationSeconds, setRotationSeconds] = useState(8)
  const [savingRotation, setSavingRotation] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)

  const canView = can('personalizacion_sistema.view_loginbackgroundimage')
  const canEdit = can('personalizacion_sistema.change_loginbackgroundimage')
  const canAdd = can('personalizacion_sistema.add_loginbackgroundimage')
  const canDelete = can('personalizacion_sistema.delete_loginbackgroundimage')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [imagesRes, estRes] = await Promise.all([
        api.get('personalizacion/login/backgrounds/'),
        api.get('personalizacion/login/backgrounds/establecimientos/'),
      ])
      setItems(imagesRes.data.results || imagesRes.data || [])
      setEstablecimientos(Array.isArray(estRes.data) ? estRes.data : [])
      try {
        const configRes = await api.get('personalizacion/login/backgrounds/config/')
        setRotationSeconds(Number(configRes.data?.rotation_seconds || 8))
      } catch {
        setRotationSeconds(8)
      }
    } catch {
      notify({ variant: 'danger', text: 'No se pudo cargar la información de personalización.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) fetchData()
  }, [canView])

  const ordered = useMemo(
    () => [...items].sort((a, b) => a.orden - b.orden || a.id - b.id),
    [items],
  )

  const openCreate = () => {
    setSelected(null)
    setSavedOk(false)
    setUseVigencia(false)
    setForm({ ...emptyForm, orden: items.length })
    setFileInputKey((k) => k + 1)
    overlay.reset()
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setSelected(item)
    setSavedOk(false)
    const fechaInicio = item.fecha_inicio ? item.fecha_inicio.slice(0, 16) : ''
    const fechaFin = item.fecha_fin ? item.fecha_fin.slice(0, 16) : ''
    setUseVigencia(!!(fechaInicio || fechaFin))
    setForm({
      titulo: item.titulo || '',
      imagen: null,
      activa: !!item.activa,
      orden: item.orden ?? 0,
      establecimiento: item.establecimiento || '',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    })
    setFileInputKey((k) => k + 1)
    overlay.reset()
    setIsModalOpen(true)
  }

  const closeModal = () => {
    if (overlay.busy) return
    overlay.reset()
    setIsModalOpen(false)
    setSelected(null)
    setForm(emptyForm)
    setUseVigencia(false)
    setSavedOk(false)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setIsModalOpen(false)
      setSelected(null)
      setForm(emptyForm)
      setUseVigencia(false)
      if (savedOk) fetchData()
      setSavedOk(false)
      return
    }
    overlay.dismiss()
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (!selected?.id && !form.imagen) {
      notify({ variant: 'danger', text: 'Debes seleccionar una imagen para crear el registro.' })
      return
    }

    if (useVigencia && form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin) {
      notify({
        variant: 'danger',
        text: 'La fecha de inicio no puede ser mayor a la fecha de término.',
      })
      return
    }

    const wasEdit = Boolean(selected?.id)
    try {
      await overlay.run(
        async () => {
          const payload = new FormData()
          payload.append('titulo', form.titulo)
          payload.append('activa', form.activa ? 'true' : 'false')
          payload.append('orden', String(form.orden))

          if (form.establecimiento) {
            payload.append('establecimiento', String(form.establecimiento))
          }
          if (useVigencia) {
            if (form.fecha_inicio) payload.append('fecha_inicio', form.fecha_inicio)
            if (form.fecha_fin) payload.append('fecha_fin', form.fecha_fin)
          }
          if (form.imagen) {
            payload.append('imagen', form.imagen)
          }

          if (wasEdit) {
            await api.patch(`personalizacion/login/backgrounds/${selected.id}/`, payload, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } else {
            await api.post('personalizacion/login/backgrounds/', payload, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          }
          setSavedOk(true)
        },
        {
          successDescription: wasEdit
            ? 'Imagen actualizada correctamente.'
            : 'Imagen guardada correctamente.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar la imagen.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`personalizacion/login/backgrounds/${deleteTarget.id}/`)
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Imagen eliminada.' })
      await fetchData()
    } catch {
      notify({ variant: 'danger', text: 'No se pudo eliminar la imagen.' })
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = async (id) => {
    try {
      await api.post(`personalizacion/login/backgrounds/${id}/toggle-active/`)
      notify({ variant: 'success', text: 'Estado actualizado.' })
      await fetchData()
    } catch {
      notify({ variant: 'danger', text: 'No se pudo cambiar el estado de la imagen.' })
    }
  }

  const moveOrder = (id, direction) => {
    const current = [...ordered]
    const index = current.findIndex((x) => x.id === id)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return
    ;[current[index], current[targetIndex]] = [current[targetIndex], current[index]]
    setItems(current.map((it, idx) => ({ ...it, orden: idx })))
  }

  const saveOrder = async () => {
    try {
      const orders = items.map((item) => ({ id: item.id, orden: item.orden }))
      await api.patch('personalizacion/login/backgrounds/reorder/', { orders })
      notify({ variant: 'success', text: 'Orden actualizado.' })
      await fetchData()
    } catch {
      notify({ variant: 'danger', text: 'No se pudo guardar el orden.' })
    }
  }

  const saveRotationConfig = async () => {
    setSavingRotation(true)
    try {
      await api.patch('personalizacion/login/backgrounds/config/', {
        rotation_seconds: Number(rotationSeconds),
      })
      notify({ variant: 'success', text: 'Tiempo de rotación actualizado.' })
    } catch (err) {
      notify({
        variant: 'danger',
        text: formatApiFormError(err, 'No se pudo guardar el tiempo de rotación.'),
      })
    } finally {
      setSavingRotation(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'preview',
        header: 'Preview',
        className: 'col--compact',
        render: (item) => (
          <img
            src={item.imagen}
            alt={item.titulo}
            className="login-bg-thumb"
          />
        ),
      },
      {
        key: 'titulo',
        header: 'Título',
        cardRole: 'title',
        render: (item) => item.titulo,
      },
      {
        key: 'activa',
        header: 'Estado',
        cardRole: 'status',
        render: (item) => (
          <Button
            variant="quiet"
            size="sm"
            disabled={!canEdit}
            onClick={() => toggleActive(item.id)}
          >
            <Badge variant={item.activa ? 'success' : 'neutral'}>
              {item.activa ? 'ACTIVA' : 'INACTIVA'}
            </Badge>
          </Button>
        ),
      },
      {
        key: 'orden',
        header: 'Orden',
        className: 'col--compact',
        render: (item) => item.orden,
      },
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--tablet-hide',
        render: (item) => item.establecimiento_nombre || 'Global',
      },
      {
        key: 'vigencia',
        header: 'Vigencia',
        className: 'col--tablet-hide',
        render: (item) =>
          `${item.fecha_inicio ? new Date(item.fecha_inicio).toLocaleDateString() : '-'} / ${item.fecha_fin ? new Date(item.fecha_fin).toLocaleDateString() : '-'}`,
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => (
          <div className="data-table__actions">
            {canEdit ? (
              <>
                <IconButton
                  aria-label="Subir orden"
                  onClick={() => moveOrder(item.id, 'up')}
                >
                  <Icon name="chevron" size={14} className="icon--chevron-up" />
                </IconButton>
                <IconButton
                  aria-label="Bajar orden"
                  onClick={() => moveOrder(item.id, 'down')}
                >
                  <Icon name="chevron" size={14} className="icon--chevron-down" />
                </IconButton>
                <IconButton aria-label="Editar" onClick={() => openEdit(item)}>
                  <Icon name="edit" size={14} />
                </IconButton>
              </>
            ) : null}
            {canDelete ? (
              <IconButton
                danger
                aria-label="Eliminar"
                onClick={() => setDeleteTarget(item)}
              >
                <Icon name="trash" size={14} />
              </IconButton>
            ) : null}
          </div>
        ),
      },
    ],
    [canEdit, canDelete, items],
  )

  if (!canView) {
    return (
      <div className="page" data-od-id="login-backgrounds-page">
        <PermissionBlock title="Acceso denegado" description="No tiene permiso para ver esta sección." />
      </div>
    )
  }

  return (
    <div className="page" data-od-id="login-backgrounds-page">
      <PageHeader
        icon="design-system"
        title="Personalización"
        description="Login / Imágenes de fondo"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Administración' },
          { label: 'Personalización' },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            {canEdit ? (
              <Button variant="primary" size="sm" onClick={saveOrder}>
                <Icon name="check" size="sm" /> Guardar orden
              </Button>
            ) : null}
            {canAdd ? (
              <Button variant="secondary" size="sm" onClick={openCreate}>
                <Icon name="plus" size="sm" /> Nueva imagen
              </Button>
            ) : null}
          </>
        }
      />

      <Alert variant="info" title="Orden del carrusel">
        El orden define la posición del carrusel: <strong>0</strong> aparece primero, luego 1, 2, 3…
      </Alert>

      <Card className="login-bg-rotation-card">
        <CardHeader title="Tiempo de rotación" subtitle="Segundos entre cambios de imagen en el login" />
        <div className="login-bg-rotation-card__body">
          <Field label="Segundos" htmlFor="rotation-seconds">
            <Input
              id="rotation-seconds"
              type="number"
              min="2"
              max="120"
              value={rotationSeconds}
              onChange={(e) => setRotationSeconds(e.target.value)}
            />
          </Field>
          <Button
            variant="primary"
            size="sm"
            onClick={saveRotationConfig}
            loading={savingRotation}
            disabled={savingRotation}
          >
            Guardar tiempo
          </Button>
        </div>
      </Card>

      <DataTable
        compact
        columns={columns}
        rows={ordered}
        loading={loading}
        fillViewport={false}
        showFooter={false}
        emptyTitle="Sin imágenes"
        emptyDescription="No hay fondos de login configurados."
        emptyAction={
          canAdd ? (
            <Button variant="primary" size="sm" onClick={openCreate}>
              Nueva imagen
            </Button>
          ) : null
        }
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Imágenes de fondo</span>
            <Badge variant="neutral">{ordered.length} registros</Badge>
          </div>
        }
        mobileCardActions={(item) => ({
          primary: canEdit ? { label: 'Editar', onClick: () => openEdit(item) } : undefined,
          secondary: canDelete
            ? { label: 'Eliminar', onClick: () => setDeleteTarget(item) }
            : undefined,
        })}
      />

      <Modal
        open={isModalOpen}
        onClose={closeModal}
        size="lg"
        title={selected ? 'Editar imagen' : 'Nueva imagen'}
        subheader="Personalización de fondo del login"
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
              form="login-bg-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              Guardar imagen
            </Button>
          </>
        }
      >
        <form id="login-bg-form" className="crud-form" onSubmit={handleSave}>
          <div className="form-grid">
            <Field label="Título" required htmlFor="bg-titulo">
              <Input
                id="bg-titulo"
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Fondo principal invierno"
              />
            </Field>
            <Field label="Orden" htmlFor="bg-orden">
              <Input
                id="bg-orden"
                type="number"
                min="0"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
                placeholder="0"
              />
            </Field>
            <Field label="Establecimiento" htmlFor="bg-est" className="field--full">
              <Select
                id="bg-est"
                value={form.establecimiento}
                onChange={(e) => setForm({ ...form, establecimiento: e.target.value })}
              >
                <option value="">Global (sin establecimiento)</option>
                {establecimientos.map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="field field--full">
              <span className="field__label">Imagen</span>
              <FileInput
                key={fileInputKey}
                accept="image/*"
                onChange={(e) =>
                  setForm({ ...form, imagen: e.target.files?.[0] || null })
                }
              />
              <p className="field__hint">
                {form.imagen
                  ? `Archivo seleccionado: ${form.imagen.name}`
                  : selected
                    ? 'Si no subes una nueva imagen, se conserva la actual.'
                    : 'Selecciona una imagen para el fondo de login.'}
              </p>
            </div>
            <div className="field field--full login-bg-vigencia">
              <Switch
                checked={useVigencia}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUseVigencia(checked)
                  if (!checked) setForm((prev) => ({ ...prev, fecha_inicio: '', fecha_fin: '' }))
                }}
                label="Definir vigencia por fecha (opcional)"
              />
              {useVigencia ? (
                <div className="form-grid login-bg-vigencia__dates">
                  <Field label="Fecha inicio" htmlFor="bg-inicio">
                    <Input
                      id="bg-inicio"
                      type="datetime-local"
                      value={form.fecha_inicio}
                      onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                    />
                  </Field>
                  <Field label="Fecha término" htmlFor="bg-fin">
                    <Input
                      id="bg-fin"
                      type="datetime-local"
                      value={form.fecha_fin}
                      onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
            <div className="field field--full">
              <Switch
                checked={form.activa}
                onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                label="Activa"
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar imagen"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.titulo || 'esta imagen'}»?`
            : '¿Eliminar imagen?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default LoginBackgroundsAdmin
