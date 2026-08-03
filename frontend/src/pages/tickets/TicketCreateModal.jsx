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
  Badge,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const PRIORITIES = ['BAJA', 'MEDIA', 'ALTA']

const emptyForm = () => ({
  titulo: '',
  descripcion: '',
  area_destino: null,
  categoria: '',
  prioridad: 'BAJA',
})

const TicketCreateModal = ({ open, onClose, onCreated }) => {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState(emptyForm())
  const [files, setFiles] = useState([])
  const [createdTicket, setCreatedTicket] = useState(null)
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!open) return
    setFormData(emptyForm())
    setFiles([])
    setCreatedTicket(null)
    overlay.reset()
    const fetchCategories = async () => {
      try {
        const catsRes = await api.get('tickets/categorias/')
        setCategories(catsRes.data.results || catsRes.data || [])
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
    fetchCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose?.()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      const ticket = createdTicket
      overlay.reset()
      onClose?.()
      if (ticket) onCreated?.(ticket)
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await overlay.run(
        async () => {
          const res = await api.post('tickets/tickets/', formData)
          setCreatedTicket(res.data)
          return res.data
        },
        {
          successDescription: 'Solicitud creada correctamente.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al crear el ticket. Revisa los campos.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title="Nueva solicitud"
      subheader="Describe el problema con el mayor detalle posible"
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
            form="ticket-create-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            <Icon name="plus" size="sm" />
            {overlay.busy ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </>
      }
    >
      <form id="ticket-create-form" className="crud-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Asunto / título" required htmlFor="ticket-titulo" className="field--full">
            <Input
              id="ticket-titulo"
              required
              placeholder="Ej: No puedo acceder al sistema de remuneraciones"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              disabled={overlay.busy}
            />
          </Field>

          <Field label="Categoría" required htmlFor="ticket-categoria">
            <Select
              id="ticket-categoria"
              required
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              disabled={overlay.busy}
            >
              <option value="">Seleccionar…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioridad inicial" htmlFor="ticket-prioridad">
            <div className="ticket-priority" role="group" aria-label="Prioridad">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={overlay.busy}
                  className={`ticket-priority__btn${formData.prioridad === p ? ' is-selected' : ''}`}
                  data-priority={p}
                  onClick={() => setFormData({ ...formData, prioridad: p })}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Descripción del problema"
            required
            htmlFor="ticket-desc"
            className="field--full"
          >
            <Textarea
              id="ticket-desc"
              required
              rows={5}
              placeholder="Escribe aquí los detalles…"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              disabled={overlay.busy}
            />
          </Field>

          <Field label="Adjuntos (opcional)" htmlFor="ticket-files" className="field--full">
            <FileInput
              id="ticket-files"
              label="Adjuntar archivo"
              multiple
              onChange={handleFileChange}
              disabled={overlay.busy}
            />
            {files.length > 0 ? (
              <ul className="ticket-file-list">
                {files.map((file, i) => (
                  <li key={`${file.name}-${i}`}>
                    <Badge variant="accent">{file.name}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      aria-label={`Quitar ${file.name}`}
                      onClick={() => removeFile(i)}
                      disabled={overlay.busy}
                    >
                      <Icon name="close" size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>
        </div>
      </form>
    </Modal>
  )
}

export default TicketCreateModal
