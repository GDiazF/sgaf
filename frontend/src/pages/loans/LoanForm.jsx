import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import ApplicantModal from '../../components/applicants/ApplicantModal'
import MultiSearchableSelect from '../../components/common/MultiSearchableSelect'
import SearchableSelect from '../../components/common/SearchableSelect'
import {
  PageHeader,
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Icon,
  Badge,
  FormOverlay,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const RECIPIENT_TYPES = [
  { value: 'funcionario', label: 'Personal SLEP' },
  { value: 'externo', label: 'Externo / registrado' },
  { value: 'director', label: 'Director de establecimiento' },
]

const LoanForm = () => {
  const navigate = useNavigate()

  const [tiposActivo, setTiposActivo] = useState([])
  const [selectedTipoId, setSelectedTipoId] = useState('')
  const [allActivos, setAllActivos] = useState([])
  const [establishments, setEstablishments] = useState([])
  const [selectedEsts, setSelectedEsts] = useState([])
  const [activoSearchTerm, setActivoSearchTerm] = useState('')
  const [foundActivos, setFoundActivos] = useState([])
  const [selectedActivos, setSelectedActivos] = useState([])

  const [applicants, setApplicants] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [recipientType, setRecipientType] = useState('funcionario')
  const [selectedApplicantId, setSelectedApplicantId] = useState('')
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState('')
  const [selectedDirectorEstId, setSelectedDirectorEstId] = useState('')
  const [showApplicantForm, setShowApplicantForm] = useState(false)
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const [observacion, setObservacion] = useState('')

  /** Establecimientos recién agregados → auto-marcar activos disponibles */
  const pendingAutoSelectEsts = useRef([])

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [estRes, appRes, funcRes, allActivosRes, tiposRes] = await Promise.all([
          api.get('establecimientos/?page_size=1000'),
          api.get('solicitantes/?page_size=1000'),
          api.get('funcionarios/?page_size=1000'),
          api.get('activos/?page_size=1000'),
          api.get('tipo-activos/?page_size=1000'),
        ])

        setAllActivos(allActivosRes.data.results || allActivosRes.data || [])
        setEstablishments(estRes.data.results || estRes.data || [])
        setTiposActivo(tiposRes.data.results || tiposRes.data || [])

        const allApplicants = appRes.data.results || appRes.data
        setApplicants(allApplicants.filter((a) => !a.funcionario))
        setFuncionarios(funcRes.data.results || funcRes.data || [])
      } catch (error) {
        console.error('Error loading lookups:', error)
        notify({ variant: 'danger', text: 'Error al cargar datos del formulario.' })
      }
    }
    loadLookups()
  }, [])

  const establishmentsForTipo = useMemo(() => {
    if (!selectedTipoId) return []
    const tipoId = Number(selectedTipoId)
    return establishments
      .map((est) => {
        const ofTipo = allActivos.filter(
          (a) => a.establecimiento === est.id && Number(a.tipo) === tipoId,
        )
        if (ofTipo.length === 0) return null
        const anyAvailable = ofTipo.some((a) => a.disponible)
        return {
          ...est,
          hasAvailableActivos: anyAvailable,
          countOfTipo: ofTipo.length,
        }
      })
      .filter(Boolean)
  }, [establishments, allActivos, selectedTipoId])

  useEffect(() => {
    if (!selectedTipoId) {
      setFoundActivos([])
      return
    }

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams()
      params.set('tipo', selectedTipoId)
      params.set('page_size', '1000')
      if (selectedEsts.length > 0) {
        params.set('establecimiento__in', selectedEsts.join(','))
      }
      if (activoSearchTerm.length > 0) {
        params.set('search', activoSearchTerm)
      }

      if (selectedEsts.length === 0 && activoSearchTerm.length < 2) {
        setFoundActivos([])
        return
      }

      api
        .get(`activos/?${params.toString()}`)
        .then((res) => setFoundActivos(res.data.results || res.data || []))
        .catch(console.error)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [selectedTipoId, activoSearchTerm, selectedEsts])

  /* Al agregar establecimientos: marcar disponibles de ese tipo */
  useEffect(() => {
    const pending = pendingAutoSelectEsts.current
    if (!pending.length || foundActivos.length === 0) return

    const toAdd = foundActivos.filter(
      (a) => a.disponible && pending.includes(a.establecimiento),
    )
    if (toAdd.length === 0) {
      pendingAutoSelectEsts.current = []
      return
    }

    setSelectedActivos((prev) => {
      const next = [...prev]
      toAdd.forEach((activo) => {
        if (!next.find((item) => item.id === activo.id)) next.push(activo)
      })
      return next
    })
    pendingAutoSelectEsts.current = []
  }, [foundActivos])

  const handleTipoChange = (tipoId) => {
    setSelectedTipoId(tipoId)
    setSelectedEsts([])
    setSelectedActivos([])
    setFoundActivos([])
    setActivoSearchTerm('')
    pendingAutoSelectEsts.current = []
  }

  const handleEstsChange = (nextEsts) => {
    const added = nextEsts.filter((id) => !selectedEsts.includes(id))
    const removed = selectedEsts.filter((id) => !nextEsts.includes(id))

    if (added.length) {
      pendingAutoSelectEsts.current = [
        ...new Set([...pendingAutoSelectEsts.current, ...added]),
      ]
    }

    if (removed.length) {
      setSelectedActivos((prev) =>
        prev.filter((a) => !removed.includes(a.establecimiento)),
      )
    }

    setSelectedEsts(nextEsts)
  }

  const handleToggleActivo = (activo) => {
    if (!activo.disponible && !selectedActivos.some((s) => s.id === activo.id)) return
    setSelectedActivos((prev) => {
      if (prev.find((a) => a.id === activo.id)) {
        return prev.filter((a) => a.id !== activo.id)
      }
      return [...prev, activo]
    })
  }

  const handleRemoveActivo = (id) => {
    setSelectedActivos((prev) => prev.filter((a) => a.id !== id))
  }

  const handleAddAllAvailable = () => {
    const available = foundActivos.filter((a) => a.disponible)
    setSelectedActivos((prev) => {
      const next = [...prev]
      available.forEach((activo) => {
        if (!next.find((item) => item.id === activo.id)) next.push(activo)
      })
      return next
    })
  }

  const handleRecipientTypeChange = (type) => {
    setRecipientType(type)
    setSelectedApplicantId('')
    setSelectedFuncionarioId('')
    setSelectedDirectorEstId('')
  }

  const handleSaveApplicant = async (data) => {
    const res = await api.post('solicitantes/', data)
    return res.data
  }

  const handleApplicantClose = (result) => {
    setShowApplicantForm(false)
    if (result?.saved && result?.data) {
      setApplicants((prev) => [...prev, result.data])
      setRecipientType('externo')
      setSelectedApplicantId(result.data.id)
      setSelectedFuncionarioId('')
      setSelectedDirectorEstId('')
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      navigate('/loans')
      return
    }
    overlay.dismiss()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedActivos.length === 0) {
      overlay.setTitle(undefined)
      overlay.setDescription('Debe seleccionar al menos un activo.')
      overlay.setStatus('error')
      return
    }
    if (!selectedApplicantId && !selectedFuncionarioId && !selectedDirectorEstId) {
      overlay.setTitle(undefined)
      overlay.setDescription('Debe seleccionar un solicitante.')
      overlay.setStatus('error')
      return
    }

    const payload = {
      solicitante: selectedApplicantId || null,
      funcionario: selectedFuncionarioId || null,
      director_establecimiento_id: selectedDirectorEstId || null,
      activos: selectedActivos.map((a) => a.id),
      observacion,
    }

    try {
      await overlay.run(
        async () => {
          await api.post('prestamos/', payload)
        },
        {
          successDescription: 'Préstamo registrado correctamente.',
          formatError: (err) => formatApiFormError(err, 'Error al crear el préstamo.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const hasResponsible =
    Boolean(selectedApplicantId) ||
    Boolean(selectedFuncionarioId) ||
    Boolean(selectedDirectorEstId)

  const canSubmit = hasResponsible && selectedActivos.length > 0 && !overlay.busy && !overlay.active

  const selectedTipoNombre =
    tiposActivo.find((t) => String(t.id) === String(selectedTipoId))?.nombre || ''

  return (
    <div className="page" data-od-id="loan-form-page">
      <PageHeader
        icon="key"
        title="Nuevo préstamo"
        description="Registre la entrega de activos a funcionarios o externos."
        breadcrumbs={[
          { label: 'Operaciones' },
          { label: 'Préstamos', to: '/loans' },
          { label: 'Nuevo préstamo' },
        ]}
        linkComponent={Link}
        split
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/loans')}>
            Volver al panel
          </Button>
        }
      />

      

      <FormOverlay
        className="form-overlay-host--page"
        status={overlay.status}
        title={overlay.title}
        description={overlay.description}
        onDismiss={handleOverlayDismiss}
      >
      <form className="crud-form" onSubmit={handleSubmit}>
        <div className="loan-form-grid">
          {/* 1. Activos */}
          <section className="form-section loan-form-col">
            <header className="form-section__header">
              <div className="loan-form-col__head">
                <div>
                  <h2 className="form-section__title">1. Activos</h2>
                  <p className="form-section__desc">
                    Tipo → establecimiento. Los disponibles se marcan solos.
                  </p>
                </div>
                <div className="loan-form-col__head-actions">
                  {foundActivos.some((a) => a.disponible) ? (
                    <Button type="button" variant="ghost" size="sm" onClick={handleAddAllAvailable}>
                      Todas disponibles
                    </Button>
                  ) : null}
                  {selectedActivos.length > 0 ? (
                    <Badge variant="accent">{selectedActivos.length}</Badge>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="form-section__body loan-form-col__body">
              <Field label="Tipo de activo" htmlFor="loan-tipo" required>
                <Select
                  id="loan-tipo"
                  value={selectedTipoId}
                  onChange={(e) => handleTipoChange(e.target.value)}
                >
                  <option value="">Seleccione tipo (llaves, notebook…)</option>
                  {tiposActivo.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </Select>
              </Field>

              <MultiSearchableSelect
                label="Establecimientos"
                placeholder={
                  selectedTipoId
                    ? `Colegios con ${selectedTipoNombre || 'este tipo'}…`
                    : 'Primero elija el tipo de activo'
                }
                options={establishmentsForTipo.map((est) => ({
                  value: est.id,
                  label: est.hasAvailableActivos
                    ? est.nombre
                    : `${est.nombre} (sin disponibles)`,
                  disabled: !est.hasAvailableActivos,
                }))}
                value={selectedEsts}
                onChange={handleEstsChange}
                disabled={!selectedTipoId}
              />

              <Field label="Buscar en resultados" htmlFor="loan-activo-search">
                <div className="input-wrap">
                  <Icon name="search" className="input-wrap__icon" size="sm" />
                  <Input
                    id="loan-activo-search"
                    type="search"
                    placeholder="Filtrar por nombre o código…"
                    value={activoSearchTerm}
                    onChange={(e) => setActivoSearchTerm(e.target.value)}
                    disabled={!selectedTipoId}
                  />
                </div>
              </Field>

              <div
                className="combo__options loan-form-picklist"
                role="listbox"
                aria-label="Activos encontrados"
                aria-multiselectable="true"
              >
                {!selectedTipoId ? (
                  <div className="combo__empty loan-form-picklist__empty">
                    <p>Elija el tipo de activo para comenzar</p>
                  </div>
                ) : foundActivos.length === 0 ? (
                  <div className="combo__empty loan-form-picklist__empty">
                    <p>
                      {selectedEsts.length > 0 || activoSearchTerm.length > 1
                        ? 'No se encontraron activos'
                        : 'Seleccione uno o más establecimientos'}
                    </p>
                  </div>
                ) : (
                  foundActivos.map((activo) => {
                    const isSelected = selectedActivos.some((s) => s.id === activo.id)
                    const canToggle = activo.disponible || isSelected
                    return (
                      <button
                        key={activo.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={!canToggle}
                        onClick={() => canToggle && handleToggleActivo(activo)}
                        className={`combo__option${isSelected ? ' is-selected' : ''}`}
                      >
                        <span className="combo__option-check" aria-hidden="true">
                          {isSelected ? (
                            <Icon name="check" size="sm" />
                          ) : (
                            <Icon name="box" size="sm" />
                          )}
                        </span>
                        <span className="combo__option-label">
                          <span className="loan-form-picklist__name">{activo.nombre}</span>
                          <span className="loan-form-picklist__meta">
                            {activo.establecimiento_nombre}
                          </span>
                        </span>
                        {!activo.disponible && !isSelected ? (
                          <Badge variant="danger">Ocupado</Badge>
                        ) : isSelected ? (
                          <Badge variant="accent">Seleccionado</Badge>
                        ) : null}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          {/* 2. Solicitante */}
          <section className="form-section loan-form-col">
            <header className="form-section__header">
              <div className="loan-form-col__head">
                <div>
                  <h2 className="form-section__title">2. Solicitante</h2>
                  <p className="form-section__desc">Elija un solo tipo de responsable.</p>
                </div>
                {recipientType === 'externo' ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowApplicantForm(true)}
                  >
                    <Icon name="plus" size="sm" /> Nuevo
                  </Button>
                ) : null}
              </div>
            </header>

            <div className="form-section__body loan-form-col__body">
              <ApplicantModal
                isOpen={showApplicantForm}
                onClose={handleApplicantClose}
                onSave={handleSaveApplicant}
              />

              <fieldset className="loan-form-recipient">
                <legend className="loan-form-recipient__legend">Tipo de responsable</legend>
                <div
                  className="loan-form-recipient__radios"
                  role="radiogroup"
                  aria-label="Tipo de responsable"
                >
                  {RECIPIENT_TYPES.map((opt) => (
                    <label key={opt.value} className="radio">
                      <input
                        type="radio"
                        name="loan-recipient-type"
                        className="no-global"
                        value={opt.value}
                        checked={recipientType === opt.value}
                        onChange={() => handleRecipientTypeChange(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {recipientType === 'funcionario' ? (
                <SearchableSelect
                  label="Buscar personal SLEP"
                  placeholder="Nombre o cargo…"
                  options={funcionarios.map((f) => ({
                    value: f.id,
                    label: `${f.nombre_funcionario} (${f.cargo || 'Funcionario'})`,
                  }))}
                  value={selectedFuncionarioId}
                  onChange={setSelectedFuncionarioId}
                />
              ) : null}

              {recipientType === 'externo' ? (
                <SearchableSelect
                  label="Buscar externo o registrado"
                  placeholder="RUT o nombre…"
                  options={applicants.map((a) => ({
                    value: a.id,
                    label: `${a.nombre} ${a.apellido} (${a.rut})`,
                  }))}
                  value={selectedApplicantId}
                  onChange={setSelectedApplicantId}
                />
              ) : null}

              {recipientType === 'director' ? (
                <SearchableSelect
                  label="Establecimiento (director)"
                  placeholder="Seleccionar escuela…"
                  options={establishments.map((e) => ({
                    value: e.id,
                    label: `${e.nombre} (${e.rbd})`,
                  }))}
                  value={selectedDirectorEstId}
                  onChange={setSelectedDirectorEstId}
                />
              ) : null}
            </div>
          </section>

          {/* 3. Resumen */}
          <section className="form-section loan-form-col">
            <header className="form-section__header">
              <h2 className="form-section__title">3. Resumen</h2>
              <p className="form-section__desc">
                Revise la selección y agregue observaciones opcionales.
              </p>
            </header>

            <div className="form-section__body loan-form-col__body">
              <Field label="Observaciones" htmlFor="loan-observacion">
                <Textarea
                  id="loan-observacion"
                  rows={3}
                  placeholder="Observaciones del préstamo…"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                />
              </Field>

              <div className="loan-form-selected">
                <div className="loan-form-selected__head">
                  <span>Activos seleccionados</span>
                  <Badge variant={selectedActivos.length > 0 ? 'accent' : 'neutral'}>
                    {selectedActivos.length}
                  </Badge>
                </div>

                <ul className="loan-form-selected__list">
                  {selectedActivos.length === 0 ? (
                    <li className="loan-form-selected__empty">Ningún activo seleccionado</li>
                  ) : (
                    selectedActivos.map((activo) => (
                      <li key={activo.id} className="loan-form-selected__item">
                        <span title={activo.nombre}>
                          {activo.nombre}
                          {activo.establecimiento_nombre
                            ? ` · ${activo.establecimiento_nombre}`
                            : ''}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Quitar ${activo.nombre}`}
                          onClick={() => handleRemoveActivo(activo.id)}
                        >
                          <Icon name="close" size="sm" />
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>

            <div className="form-actions form-actions--crud">
              <div className="form-actions__end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/loans')}
                  disabled={overlay.busy}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={!canSubmit} loading={overlay.busy}>
                  {overlay.busy ? 'Registrando…' : 'Registrar préstamo'}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </form>
      </FormOverlay>
    </div>
  )
}

export default LoanForm
