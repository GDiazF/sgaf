import React, { useState, useEffect, useRef } from 'react'
import { formatRut, validateRut } from '../../utils/rutValidator'
import {
  Modal,
  Button,
  Field,
  Input,
  Alert,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const EMPTY_FORM = {
  rut: '',
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
}

const ApplicantModal = ({
  isOpen,
  open,
  onClose,
  onSave,
  editingId,
  initialData,
}) => {
  const modalOpen = open ?? isOpen ?? false
  const overlay = useFormOverlay()
  const savedResultRef = useRef(null)
  const isEditing = Boolean(editingId)

  const [formData, setFormData] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!modalOpen) return
    overlay.reset()
    savedResultRef.current = null
    setFormData(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM)
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [modalOpen, initialData])

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value)
    setFormData((prev) => ({ ...prev, rut: formatted }))
    if (formatted.length >= 3) {
      const validation = validateRut(formatted)
      if (!validation.valid) {
        setErrors((prev) => ({ ...prev, rut: validation.error }))
      } else {
        setErrors((prev) => {
          const next = { ...prev }
          delete next.rut
          return next
        })
      }
    } else {
      setErrors((prev) => {
        const next = { ...prev }
        delete next.rut
        return next
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const nextErrors = {}
    if (!formData.nombre.trim()) nextErrors.nombre = 'Ingrese los nombres.'
    if (!formData.apellido.trim()) nextErrors.apellido = 'Ingrese los apellidos.'

    const rutValidation = validateRut(formData.rut)
    if (!rutValidation.valid) {
      nextErrors.rut = rutValidation.error
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      ...formData,
      rut: rutValidation.formatted || formData.rut,
    }

    try {
      await overlay.run(
        async () => {
          const result = await onSave(payload)
          savedResultRef.current = result ?? payload
        },
        {
          successDescription: isEditing
            ? 'Solicitante actualizado.'
            : 'Solicitante registrado.',
          formatError: (err) =>
            formatApiFormError(err, 'Error al guardar solicitante. Verifique los datos.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose?.({ saved: true, data: savedResultRef.current })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose?.()
  }

  return (
    <Modal
      open={modalOpen}
      onClose={handleClose}
      title={isEditing ? 'Editar solicitante' : 'Registrar nuevo solicitante'}
      subheader="Gestione la información de las personas autorizadas para retirar llaves"
      size="lg"
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button
            variant="quiet"
            type="button"
            onClick={handleClose}
            disabled={overlay.busy}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="applicant-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {isEditing ? 'Actualizar datos' : 'Registrar solicitante'}
          </Button>
        </>
      }
    >
      <form id="applicant-form" className="crud-form" onSubmit={handleSubmit}>
        <p className="contracts-section-title">
          <Icon name="user" size="sm" /> Identificación personal
        </p>
        <div className="form-grid">
          <Field
            label="RUT"
            htmlFor="app-rut"
            required
            error={errors.rut}
            hint="Formato: 12345678-9"
            className="field--full"
          >
            <Input
              id="app-rut"
              required
              placeholder="Ej: 12345678-k"
              className="font-mono"
              value={formData.rut}
              onChange={handleRutChange}
              autoComplete="off"
            />
          </Field>
          <Field
            label="Nombres"
            htmlFor="app-nombre"
            required
            error={errors.nombre}
          >
            <Input
              id="app-nombre"
              required
              placeholder="Ej: Juan Andrés"
              value={formData.nombre}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, nombre: e.target.value }))
              }
            />
          </Field>
          <Field
            label="Apellidos"
            htmlFor="app-apellido"
            required
            error={errors.apellido}
          >
            <Input
              id="app-apellido"
              required
              placeholder="Ej: Pérez González"
              value={formData.apellido}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, apellido: e.target.value }))
              }
            />
          </Field>
        </div>

        <p className="contracts-section-title">
          <Icon name="info" size="sm" /> Información de contacto
        </p>
        <div className="form-grid">
          <Field label="Correo electrónico" htmlFor="app-email">
            <Input
              id="app-email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </Field>
          <Field label="Teléfono de contacto" htmlFor="app-telefono">
            <Input
              id="app-telefono"
              placeholder="Ej: +56 9 1234 5678"
              value={formData.telefono}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, telefono: e.target.value }))
              }
            />
          </Field>
        </div>

        <Alert variant="info">
          Asegúrese de validar el RUT para evitar duplicados. El correo y teléfono
          son vitales para notificaciones de llaves pendientes.
        </Alert>
      </form>
    </Modal>
  )
}

export default ApplicantModal
