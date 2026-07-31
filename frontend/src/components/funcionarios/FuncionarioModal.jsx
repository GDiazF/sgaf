import React, { useState, useEffect } from 'react'
import api from '../../api'
import { validateRut, formatRut } from '../../utils/rutValidator'
import {
  Modal,
  Button,
  Field,
  Input,
  Select,
  Switch,
  Badge,
  EmptyState,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const emptyForm = () => ({
  rut: '',
  nombre_funcionario: '',
  anexo: '',
  subdireccion: '',
  departamento: '',
  unidad: '',
  cargo: '',
  estado: true,
  grupos: [],
})

const FuncionarioModal = ({ isOpen, onClose, funcionarioId = null }) => {
  const [errors, setErrors] = useState({})
  const [subdirecciones, setSubdirecciones] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [unidades, setUnidades] = useState([])
  const [grupos, setGrupos] = useState([])
  const [formData, setFormData] = useState(emptyForm())
  const overlay = useFormOverlay()

  useEffect(() => {
    if (!isOpen) return
    overlay.reset()
    fetchSubdirecciones()
    fetchGrupos()
    if (funcionarioId) {
      fetchFuncionario()
    } else {
      setFormData(emptyForm())
      setErrors({})
      setDepartamentos([])
      setUnidades([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [isOpen, funcionarioId])

  const fetchSubdirecciones = async () => {
    try {
      const response = await api.get('subdirecciones/')
      setSubdirecciones(
        Array.isArray(response.data) ? response.data : response.data.results || [],
      )
    } catch (error) {
      console.error('Error fetching subdirecciones:', error)
    }
  }

  const fetchGrupos = async () => {
    try {
      const response = await api.get('grupos/', { params: { page_size: 1000 } })
      setGrupos(Array.isArray(response.data) ? response.data : response.data.results || [])
    } catch (error) {
      console.error('Error fetching grupos:', error)
    }
  }

  const fetchFuncionario = async () => {
    try {
      const response = await api.get(`funcionarios/${funcionarioId}/`)
      setFormData({
        ...emptyForm(),
        ...response.data,
        grupos: response.data.grupos || [],
      })
      if (response.data.subdireccion) {
        await fetchDepartamentos(response.data.subdireccion)
      }
      if (response.data.departamento) {
        await fetchUnidades(response.data.departamento)
      }
    } catch (error) {
      console.error('Error fetching funcionario:', error)
    }
  }

  const fetchDepartamentos = async (subdireccionId) => {
    try {
      const response = await api.get(`departamentos/?subdireccion=${subdireccionId}`)
      setDepartamentos(
        Array.isArray(response.data) ? response.data : response.data.results || [],
      )
    } catch (error) {
      console.error('Error fetching departamentos:', error)
    }
  }

  const fetchUnidades = async (departamentoId) => {
    try {
      const response = await api.get(`unidades/?departamento=${departamentoId}`)
      setUnidades(Array.isArray(response.data) ? response.data : response.data.results || [])
    } catch (error) {
      console.error('Error fetching unidades:', error)
    }
  }

  const handleSubdireccionChange = async (e) => {
    const subdireccionId = e.target.value
    setFormData({
      ...formData,
      subdireccion: subdireccionId,
      departamento: '',
      unidad: '',
    })
    setDepartamentos([])
    setUnidades([])
    if (subdireccionId) await fetchDepartamentos(subdireccionId)
  }

  const handleDepartamentoChange = async (e) => {
    const departamentoId = e.target.value
    setFormData({
      ...formData,
      departamento: departamentoId,
      unidad: '',
    })
    setUnidades([])
    if (departamentoId) await fetchUnidades(departamentoId)
  }

  const handleRutChange = (e) => {
    const formatted = formatRut(e.target.value)
    setFormData({ ...formData, rut: formatted })
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
    }
  }

  const handleGrupoToggle = (grupoId) => {
    const current = [...formData.grupos]
    const index = current.indexOf(grupoId)
    if (index === -1) current.push(grupoId)
    else current.splice(index, 1)
    setFormData({ ...formData, grupos: current })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    const rutValidation = validateRut(formData.rut)
    if (!rutValidation.valid) {
      setErrors({ rut: rutValidation.error })
      return
    }

    try {
      await overlay.run(
        async () => {
          const dataToSend = {
            ...formData,
            subdireccion: formData.subdireccion || null,
            departamento: formData.departamento || null,
            unidad: formData.unidad || null,
            grupos: formData.grupos,
          }
          if (funcionarioId) {
            await api.put(`funcionarios/${funcionarioId}/`, dataToSend)
          } else {
            await api.post('funcionarios/', dataToSend)
          }
        },
        {
          successDescription: funcionarioId
            ? 'Funcionario actualizado.'
            : 'Funcionario creado.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      size="lg"
      title={funcionarioId ? 'Editar funcionario' : 'Nuevo funcionario'}
      subheader="Información del personal del SLEP"
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
            form="funcionario-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active}
          >
            {funcionarioId ? 'Guardar cambios' : 'Crear funcionario'}
          </Button>
        </>
      }
    >
      <form id="funcionario-form" className="crud-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field
            label="RUT"
            required
            htmlFor="func-rut"
            error={errors.rut ? String(Array.isArray(errors.rut) ? errors.rut[0] : errors.rut) : undefined}
          >
            <Input
              id="func-rut"
              required
              value={formData.rut}
              onChange={handleRutChange}
              placeholder="12.345.678-9"
              className={errors.rut ? 'input--error' : undefined}
            />
          </Field>

          <Field label="Nombre completo" required htmlFor="func-nombre">
            <Input
              id="func-nombre"
              required
              value={formData.nombre_funcionario}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  nombre_funcionario: e.target.value.toUpperCase(),
                })
              }
              placeholder="EJ: JUAN PÉREZ"
            />
          </Field>

          <Field label="Subdirección" htmlFor="func-subdireccion">
            <Select
              id="func-subdireccion"
              value={formData.subdireccion || ''}
              onChange={handleSubdireccionChange}
            >
              <option value="">Seleccionar…</option>
              {subdirecciones.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Departamento" htmlFor="func-depto">
            <Select
              id="func-depto"
              value={formData.departamento || ''}
              onChange={handleDepartamentoChange}
              disabled={!formData.subdireccion}
            >
              <option value="">Seleccionar…</option>
              {departamentos.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Unidad" htmlFor="func-unidad">
            <Select
              id="func-unidad"
              value={formData.unidad || ''}
              onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
              disabled={!formData.departamento}
            >
              <option value="">Seleccionar…</option>
              {unidades.map((unid) => (
                <option key={unid.id} value={unid.id}>
                  {unid.nombre}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Cargo" htmlFor="func-cargo">
            <Input
              id="func-cargo"
              value={formData.cargo || ''}
              onChange={(e) =>
                setFormData({ ...formData, cargo: e.target.value.toUpperCase() })
              }
              placeholder="EJ: PROFESIONAL"
            />
          </Field>

          <Field
            label="Anexo"
            htmlFor="func-anexo"
            hint={
              formData.anexo
                ? `Número público: 227263${formData.anexo}`
                : 'Número público: sin anexo'
            }
          >
            <Input
              id="func-anexo"
              value={formData.anexo || ''}
              onChange={(e) => setFormData({ ...formData, anexo: e.target.value })}
              placeholder="123"
            />
          </Field>

          <div className="field field--full">
            <Switch
              id="func-estado"
              label="Funcionario activo"
              checked={!!formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.checked })}
            />
          </div>

          <div className="field field--full">
            <span className="field__label">Asignación de grupos</span>
            {grupos.length === 0 ? (
              <EmptyState title="Sin grupos" description="No hay grupos disponibles." />
            ) : (
              <ul className="func-grupos">
                {grupos.map((grupo) => {
                  const checked = formData.grupos.includes(grupo.id)
                  return (
                    <li key={grupo.id}>
                      <label
                        className={`func-grupos__item${checked ? ' is-selected' : ''}`}
                        htmlFor={`grupo-${grupo.id}`}
                      >
                        <input
                          id={`grupo-${grupo.id}`}
                          type="checkbox"
                          className="no-global"
                          checked={checked}
                          onChange={() => handleGrupoToggle(grupo.id)}
                        />
                        <span>{grupo.nombre}</span>
                        {grupo.jefe === formData.id ? (
                          <Badge variant="warning">Jefe</Badge>
                        ) : null}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default FuncionarioModal
