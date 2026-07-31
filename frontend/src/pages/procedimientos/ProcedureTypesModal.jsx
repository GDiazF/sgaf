import React, { useState, useEffect } from 'react'
import api from '../../api'
import {
  Modal,
  ConfirmModal,
  Button,
  Field,
  Input,
  EmptyState,
  FormStatus,
  Badge,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import { useNotify } from '../../hooks/useNotify'

const ProcedureTypesModal = ({ open, onClose, onChanged }) => {
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [listError, setListError] = useState(null)
  const overlay = useFormOverlay()
  const { notify } = useNotify()

  const fetchTypes = async () => {
    setLoading(true)
    setListError(null)
    try {
      const typeRes = await api.get(`procedimientos/tipos/?_ts=${Date.now()}`)
      setTypes(typeRes.data.results || typeRes.data || [])
    } catch (err) {
      console.error('Error fetching types:', err)
      setListError('No se pudieron cargar los tipos.')
      setTypes([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setEditingId(null)
  }

  useEffect(() => {
    if (!open) return
    resetForm()
    setDeleteTarget(null)
    overlay.reset()
    fetchTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => {
    if (overlay.busy || deleting) return
    overlay.reset()
    onClose?.()
  }

  const startEdit = (t) => {
    if (overlay.busy) return
    overlay.reset()
    setEditingId(t.id)
    setName(t.nombre || '')
    setListError(null)
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      resetForm()
      fetchTypes()
      onChanged?.()
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      await overlay.run(
        async () => {
          const payload = { nombre: name.trim() }
          if (editingId) {
            await api.patch(`procedimientos/tipos/${editingId}/`, payload)
          } else {
            await api.post('procedimientos/tipos/', payload)
          }
        },
        {
          successDescription: editingId ? 'Tipo actualizado.' : 'Tipo agregado.',
          formatError: (err) =>
            formatApiFormError(
              err,
              editingId ? 'No se pudo actualizar el tipo.' : 'No se pudo agregar el tipo.',
            ),
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
      await api.delete(`procedimientos/tipos/${deleteTarget.id}/`)
      if (editingId === deleteTarget.id) resetForm()
      setDeleteTarget(null)
      notify({ variant: 'success', text: 'Tipo eliminado.' })
      await fetchTypes()
      onChanged?.()
    } catch (err) {
      console.error('Error deleting type:', err)
      notify({
        variant: 'danger',
        text: 'No se pudo eliminar. Es posible que esté en uso por algún procedimiento.',
      })
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
        title="Tipos de procedimiento"
        subheader="Clasificación de documentos del gestor"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
            Cerrar
          </Button>
        }
      >
        <div className="proc-types">
          {listError ? (
            <FormStatus variant="error" title="Error" description={listError} />
          ) : null}

          <form className="proc-types__form" onSubmit={handleSubmit}>
            <Field
              label={editingId ? 'Editar tipo' : 'Nuevo tipo'}
              htmlFor="proc-type-name"
              className="field--full"
            >
              <div className="proc-types__add-row">
                <Input
                  id="proc-type-name"
                  placeholder="Nombre del tipo…"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  disabled={overlay.busy}
                />
                {editingId ? (
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    onClick={() => {
                      resetForm()
                      overlay.reset()
                    }}
                    disabled={overlay.busy}
                  >
                    Cancelar
                  </Button>
                ) : null}
                <Button
                  variant="primary"
                  type="submit"
                  size="sm"
                  loading={overlay.busy}
                  disabled={!name.trim() || overlay.busy || overlay.active}
                >
                  {editingId ? (
                    'Guardar'
                  ) : (
                    <>
                      <Icon name="plus" size="sm" /> Añadir
                    </>
                  )}
                </Button>
              </div>
            </Field>
            {editingId ? (
              <p className="proc-types__hint">
                Editando tipo seleccionado. Guardá los cambios o cancelá.
              </p>
            ) : null}
          </form>

          <div className="proc-types__list-head">
            <span className="proc-types__list-title">Registrados</span>
            <Badge variant="neutral">{types.length}</Badge>
          </div>

          {loading ? (
            <EmptyState title="Cargando…" description="Obteniendo tipos." />
          ) : types.length === 0 ? (
            <EmptyState
              title="Sin tipos"
              description="Añadí el primero para clasificar documentos."
            />
          ) : (
            <ul className="proc-types__list">
              {types.map((t) => {
                const isEditing = editingId === t.id
                return (
                  <li
                    key={t.id}
                    className={`proc-types__item${isEditing ? ' is-editing' : ''}`}
                  >
                    <span className="proc-types__name">{t.nombre}</span>
                    <div className="proc-types__actions">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled={overlay.busy}
                        onClick={() => startEdit(t)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        disabled={overlay.busy}
                        onClick={() => setDeleteTarget(t)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar tipo"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.nombre}»? Si hay documentos asociados, la eliminación puede fallar.`
            : '¿Eliminar este tipo?'
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </>
  )
}

export default ProcedureTypesModal
