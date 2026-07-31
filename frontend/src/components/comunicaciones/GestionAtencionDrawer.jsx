import React, { useEffect, useState } from 'react'
import {
  Drawer,
  Field,
  Input,
  Select,
  Textarea,
  Button,
  Badge,
  Icon,
  IconButton,
} from '@slep/ui'

const EMPTY_PICKER = { subdireccion: '', departamento: '', unidad: '' }

export default function GestionAtencionDrawer({
  isOpen,
  onClose,
  editingId,
  establecimientoNombre,
  form,
  setForm,
  onSubmit,
  subdirecciones = [],
  departamentos = [],
  unidades = [],
  isSubmitting = false,
  overlayProps = {},
  onOverlayDismiss,
}) {
  const [picker, setPicker] = useState(EMPTY_PICKER)

  useEffect(() => {
    if (!isOpen) setPicker(EMPTY_PICKER)
  }, [isOpen])

  const depFiltrados = picker.subdireccion
    ? departamentos.filter((d) => String(d.subdireccion) === picker.subdireccion)
    : []
  const uniFiltradas = picker.departamento
    ? unidades.filter((u) => String(u.departamento) === picker.departamento)
    : []

  const handlePickerSub = (value) => {
    setPicker({ subdireccion: value, departamento: '', unidad: '' })
  }

  const handlePickerDep = (value) => {
    setPicker((prev) => ({ ...prev, departamento: value, unidad: '' }))
  }

  const handleAddDestinatario = () => {
    if (picker.unidad) {
      const id = Number(picker.unidad)
      if (!form.unidades_requeridas.includes(id)) {
        setForm({ ...form, unidades_requeridas: [...form.unidades_requeridas, id] })
      }
    } else if (picker.departamento) {
      const id = Number(picker.departamento)
      if (!form.departamentos_requeridos.includes(id)) {
        setForm({
          ...form,
          departamentos_requeridos: [...form.departamentos_requeridos, id],
        })
      }
    } else if (picker.subdireccion) {
      const id = Number(picker.subdireccion)
      if (!form.subdirecciones_requeridas.includes(id)) {
        setForm({
          ...form,
          subdirecciones_requeridas: [...form.subdirecciones_requeridas, id],
        })
      }
    }
    setPicker(EMPTY_PICKER)
  }

  const removeDestinatario = (type, id) => {
    if (type === 'sub') {
      setForm({
        ...form,
        subdirecciones_requeridas: form.subdirecciones_requeridas.filter((i) => i !== id),
      })
    } else if (type === 'dep') {
      setForm({
        ...form,
        departamentos_requeridos: form.departamentos_requeridos.filter((i) => i !== id),
      })
    } else if (type === 'uni') {
      setForm({
        ...form,
        unidades_requeridas: form.unidades_requeridas.filter((i) => i !== id),
      })
    }
  }

  const canAddDestinatario = picker.subdireccion || picker.departamento || picker.unidad
  const hasDestinatarios =
    form.subdirecciones_requeridas.length > 0 ||
    form.departamentos_requeridos.length > 0 ||
    form.unidades_requeridas.length > 0

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      title={editingId ? 'Editar atención' : 'Nueva atención'}
      {...overlayProps}
      onOverlayDismiss={onOverlayDismiss}
      footer={
        <>
          <Button type="button" variant="quiet" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="gestion-atencion-form"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <Icon name="check" size="sm" />
            {editingId ? 'Guardar cambios' : 'Registrar atención'}
          </Button>
        </>
      }
    >
      <form id="gestion-atencion-form" onSubmit={onSubmit} className="modal__form">
        {establecimientoNombre ? (
          <p className="comunicaciones-gestion-drawer__estab">{establecimientoNombre}</p>
        ) : null}

        <Field label="Requerimiento o asunto *" htmlFor="gat-req" className="field--full">
          <Input
            id="gat-req"
            required
            value={form.requerimiento}
            onChange={(e) => setForm({ ...form, requerimiento: e.target.value })}
            placeholder="Ej: Solicitud de personal"
          />
        </Field>

        <Field label="Descripción detallada" htmlFor="gat-desc" className="field--full">
          <Textarea
            id="gat-desc"
            rows={5}
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalle de la atención…"
          />
        </Field>

        {editingId ? (
          <>
            <Field label="Estado" htmlFor="gat-estado" className="field--full">
              <Select
                id="gat-estado"
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="RESPONDIDO">Respondido</option>
                <option value="CERRADO">Cerrado</option>
              </Select>
            </Field>
            <Field label="Respuesta" htmlFor="gat-resp" className="field--full">
              <Textarea
                id="gat-resp"
                rows={4}
                value={form.respuesta}
                onChange={(e) => setForm({ ...form, respuesta: e.target.value })}
                placeholder="Respuesta o avance…"
              />
            </Field>
          </>
        ) : null}

        <div className="comunicaciones-gestion-dest">
          <h3 className="comunicaciones-gestion-dest__title">Destinatarios (opcional)</h3>

          <Field label="Subdirección" htmlFor="gat-sub" className="field--full">
            <Select
              id="gat-sub"
              value={picker.subdireccion}
              onChange={(e) => handlePickerSub(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {subdirecciones.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Departamento" htmlFor="gat-dep" className="field--full">
            <Select
              id="gat-dep"
              value={picker.departamento}
              onChange={(e) => handlePickerDep(e.target.value)}
              disabled={!picker.subdireccion}
            >
              <option value="">Seleccionar…</option>
              {depFiltrados.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Unidad" htmlFor="gat-uni" className="field--full">
            <Select
              id="gat-uni"
              value={picker.unidad}
              onChange={(e) => setPicker((prev) => ({ ...prev, unidad: e.target.value }))}
              disabled={!picker.departamento}
            >
              <option value="">Seleccionar…</option>
              {uniFiltradas.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Button
            type="button"
            variant="secondary"
            className="btn--full"
            disabled={!canAddDestinatario}
            onClick={handleAddDestinatario}
          >
            <Icon name="plus" size="sm" />
            Añadir destinatario
          </Button>

          {hasDestinatarios ? (
            <ul className="comunicaciones-gestion-dest__list">
              {form.subdirecciones_requeridas.map((id) => {
                const s = subdirecciones.find((x) => x.id === id)
                if (!s) return null
                return (
                  <li key={`sub-${id}`} className="comunicaciones-gestion-dest__item">
                    <Badge variant="neutral">Subdirección</Badge>
                    <span>{s.nombre}</span>
                    <IconButton
                      type="button"
                      aria-label="Quitar"
                      danger
                      onClick={() => removeDestinatario('sub', id)}
                    >
                      <Icon name="trash" size={14} />
                    </IconButton>
                  </li>
                )
              })}
              {form.departamentos_requeridos.map((id) => {
                const d = departamentos.find((x) => x.id === id)
                if (!d) return null
                return (
                  <li key={`dep-${id}`} className="comunicaciones-gestion-dest__item">
                    <Badge variant="neutral">Depto.</Badge>
                    <span>{d.nombre}</span>
                    <IconButton
                      type="button"
                      aria-label="Quitar"
                      danger
                      onClick={() => removeDestinatario('dep', id)}
                    >
                      <Icon name="trash" size={14} />
                    </IconButton>
                  </li>
                )
              })}
              {form.unidades_requeridas.map((id) => {
                const u = unidades.find((x) => x.id === id)
                if (!u) return null
                return (
                  <li key={`uni-${id}`} className="comunicaciones-gestion-dest__item">
                    <Badge variant="accent">{u.nombre}</Badge>
                    <IconButton
                      type="button"
                      aria-label="Quitar"
                      danger
                      onClick={() => removeDestinatario('uni', id)}
                    >
                      <Icon name="trash" size={14} />
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </form>
    </Drawer>
  )
}
