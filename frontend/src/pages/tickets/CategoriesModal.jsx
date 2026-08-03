import React, { useState, useEffect } from 'react'
import api from '../../api'
import {
  Modal,
  ConfirmModal,
  Badge,
  Button,
  Field,
  Input,
  Textarea,
  FormStatus,
  Switch,
  Alert,
  EmptyState,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({ nombre: '', descripcion: '', activo: true })

/**
 * Mantenedor liviano de categorías — modal desde el listado de tickets.
 */
const CategoriesModal = ({ open, onClose }) => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [listError, setListError] = useState(null)
  const overlay = useFormOverlay()

  const fetchCategories = async () => {
    setLoading(true)
    setListError(null)
    try {
      const res = await api.get('tickets/categorias/')
      setCategories(res.data.results || res.data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([])
      setListError('No se pudieron cargar las categorías.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setFormOpen(false)
    setEditingId(null)
    setFormData(emptyForm())
    setDeleteTarget(null)
    overlay.reset()
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => {
    if (overlay.busy || deleting) return
    onClose?.()
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm())
    overlay.reset()
    setFormOpen(true)
  }

  const openEdit = (cat) => {
    setEditingId(cat.id)
    setFormData({
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      activo: cat.activo,
    })
    overlay.reset()
    setFormOpen(true)
  }

  const closeForm = () => {
    if (overlay.busy) return
    overlay.reset()
    setFormOpen(false)
    setEditingId(null)
    setFormData(emptyForm())
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      setFormOpen(false)
      setEditingId(null)
      setFormData(emptyForm())
      fetchCategories()
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          if (editingId) {
            await api.put(`tickets/categorias/${editingId}/`, formData)
          } else {
            await api.post('tickets/categorias/', formData)
          }
        },
        {
          successDescription: editingId
            ? 'Categoría actualizada.'
            : 'Categoría creada.',
          formatError: (err) =>
            formatApiFormError(err, 'No se pudo guardar la categoría.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setListError(null)
    try {
      await api.delete(`tickets/categorias/${deleteTarget.id}/`)
      setDeleteTarget(null)
      await fetchCategories()
    } catch (error) {
      console.error('Error deleting:', error)
      setListError(
        'No se pudo eliminar. Probablemente existan tickets vinculados; conviene desactivarla.',
      )
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        size="lg"
        title="Categorías de tickets"
        subheader="Clasificación de solicitudes en mesa de ayuda"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={handleClose}>
              Cerrar
            </Button>
            <Button variant="primary" type="button" onClick={openCreate}>
              <Icon name="plus" size="sm" /> Nueva categoría
            </Button>
          </>
        }
      >
        <Alert variant="info" title="Nota">
          Estas categorías aparecen al crear un ticket. Usá nombres claros (p. ej. Soporte
          software, Infraestructura).
        </Alert>

        {listError ? (
          <FormStatus variant="error" title="Error" description={listError} />
        ) : null}

        {loading ? (
          <EmptyState title="Cargando…" description="Obteniendo categorías." />
        ) : categories.length === 0 ? (
          <EmptyState
            title="Sin categorías"
            description="Creá la primera para clasificar solicitudes."
            action={
              <Button variant="primary" size="sm" onClick={openCreate}>
                Nueva categoría
              </Button>
            }
          />
        ) : (
          <ul className="ticket-cats">
            {categories.map((cat) => (
              <li key={cat.id} className="ticket-cats__item">
                <div className="ticket-cats__main">
                  <div className="ticket-cats__title-row">
                    <span className="ticket-cats__name">{cat.nombre}</span>
                    <Badge variant={cat.activo ? 'success' : 'neutral'} dot>
                      {cat.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {cat.descripcion ? (
                    <p className="ticket-cats__desc">{cat.descripcion}</p>
                  ) : null}
                </div>
                <div className="ticket-cats__actions">
                  <Button variant="outline" size="sm" onClick={() => openEdit(cat)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(cat)}>
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editingId ? 'Editar categoría' : 'Nueva categoría'}
        subheader="Datos de clasificación"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" type="button" onClick={closeForm} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="ticket-category-form"
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active}
            >
              {editingId ? 'Guardar cambios' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="ticket-category-form" className="crud-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <Field label="Nombre" required htmlFor="cat-nombre" className="field--full">
              <Input
                id="cat-nombre"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                disabled={overlay.busy}
              />
            </Field>
            <Field label="Descripción" htmlFor="cat-desc" className="field--full">
              <Textarea
                id="cat-desc"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                disabled={overlay.busy}
              />
            </Field>
            <div className="field field--full">
              <Switch
                id="cat-activo"
                label="Categoría activa"
                checked={!!formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                disabled={overlay.busy}
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
        title="Eliminar categoría"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Si tiene tickets asociados, conviene desactivarla en su lugar.`
            : '¿Eliminar esta categoría?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </>
  )
}

export default CategoriesModal
