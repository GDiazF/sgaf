import React, { useState, useEffect } from 'react'
import api from '../../api'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  FileInput,
  Switch,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  titulo: '',
  descripcion: '',
  tipo: '',
  subdireccion: '',
  departamento: '',
  unidad: '',
  archivo: null,
  activo: true,
})

const ProcedureFormModal = ({
  open,
  onClose,
  onSaved,
  editingDoc = null,
  types = [],
  subdirecciones = [],
  departamentos = [],
  unidades = [],
}) => {
  const [formData, setFormData] = useState(emptyForm())
  const overlay = useFormOverlay()
  const editingId = editingDoc?.id || null
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    if (!open) return
    setSavedOk(false)
    overlay.reset()
    if (editingDoc) {
      setFormData({
        titulo: editingDoc.titulo || '',
        descripcion: editingDoc.descripcion || '',
        tipo: editingDoc.tipo || '',
        subdireccion: editingDoc.subdireccion || '',
        departamento: editingDoc.departamento || '',
        unidad: editingDoc.unidad || '',
        archivo: null,
        activo: editingDoc.activo,
      })
    } else {
      setFormData(emptyForm())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingDoc])

  const filteredDeps = departamentos.filter(
    (d) => !formData.subdireccion || String(d.subdireccion) === String(formData.subdireccion),
  )
  const filteredUnis = unidades.filter(
    (u) => !formData.departamento || String(u.departamento) === String(formData.departamento),
  )

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose?.()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose?.()
      if (savedOk) onSaved?.()
      return
    }
    overlay.dismiss()
  }

  const showClientError = (msg) => {
    overlay.setTitle(undefined)
    overlay.setDescription(msg)
    overlay.setStatus('error')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editingId && !formData.archivo) {
      showClientError('Debes seleccionar un archivo.')
      return
    }
    if (formData.archivo && formData.archivo.type !== 'application/pdf') {
      showClientError('Solo se permiten archivos en formato PDF.')
      return
    }
    if (!formData.tipo) {
      showClientError('Debes seleccionar un tipo de documento.')
      return
    }

    const data = new FormData()
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== '') data.append(key, formData[key])
    })

    try {
      await overlay.run(
        async () => {
          if (editingId) {
            await api.patch(`procedimientos/procedimientos/${editingId}/`, data, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          } else {
            await api.post('procedimientos/procedimientos/', data, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
          }
          setSavedOk(true)
        },
        {
          successDescription: editingId
            ? 'Documento actualizado correctamente.'
            : 'Documento publicado correctamente.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al guardar el documento. Revisa los campos.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={editingId ? 'Editar documento' : 'Nuevo documento'}
      subheader="Procedimientos e instructivos institucionales"
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="procedure-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            <Icon name="plus" size="sm" />
            {overlay.busy ? 'Guardando…' : editingId ? 'Actualizar' : 'Publicar'}
          </Button>
        </>
      }
    >
      <form id="procedure-form" className="crud-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Título" required htmlFor="proc-titulo" className="field--full">
            <Input
              id="proc-titulo"
              required
              placeholder="Ej: Manual de operaciones"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            />
          </Field>

          <Field label="Tipo" required htmlFor="proc-tipo">
            <Select
              id="proc-tipo"
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
            >
              <option value="">Seleccionar…</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Descripción" htmlFor="proc-desc" className="field--full">
            <Textarea
              id="proc-desc"
              rows={2}
              placeholder="Resumen del contenido…"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </Field>

          <Field label="Subdirección" htmlFor="proc-sub">
            <Select
              id="proc-sub"
              value={formData.subdireccion}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  subdireccion: e.target.value,
                  departamento: '',
                  unidad: '',
                })
              }
            >
              <option value="">General</option>
              {subdirecciones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Departamento" htmlFor="proc-dep">
            <Select
              id="proc-dep"
              disabled={!formData.subdireccion}
              value={formData.departamento}
              onChange={(e) =>
                setFormData({ ...formData, departamento: e.target.value, unidad: '' })
              }
            >
              <option value="">Cualquiera</option>
              {filteredDeps.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Unidad" htmlFor="proc-uni" className="field--full">
            <Select
              id="proc-uni"
              disabled={!formData.departamento}
              value={formData.unidad}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
            >
              <option value="">Cualquiera</option>
              {filteredUnis.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Archivo PDF"
            required={!editingId}
            htmlFor="proc-file"
            className="field--full"
            hint={editingId ? 'Deja en blanco para mantener el archivo actual.' : undefined}
          >
            <FileInput
              id="proc-file"
              label="Seleccionar PDF"
              accept=".pdf,application/pdf"
              onChange={(e) =>
                setFormData({ ...formData, archivo: e.target.files?.[0] || null })
              }
            />
          </Field>

          <div className="field field--full">
            <Switch
              id="proc-activo"
              label="Documento público (activo)"
              checked={!!formData.activo}
              onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default ProcedureFormModal
