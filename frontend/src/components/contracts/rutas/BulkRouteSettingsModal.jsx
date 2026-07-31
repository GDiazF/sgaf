import React, { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  Field,
  Input,
  ConfirmModal,
  Icon,
  CurrencyInput,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import api from '../../../api'

function TriToggle({ value, onChange, yesVariant = 'primary' }) {
  return (
    <div className="rutas-detail-tri-toggle">
      <button
        type="button"
        className={`${value === true ? 'is-on' : ''} ${yesVariant === 'warn' ? 'is-warn' : ''}`}
        onClick={() => onChange(true)}
      >
        Sí
      </button>
      <button
        type="button"
        className={value === false ? 'is-on' : ''}
        onClick={() => onChange(false)}
      >
        No
      </button>
      <button
        type="button"
        className={value === null ? 'is-on' : ''}
        onClick={() => onChange(null)}
      >
        —
      </button>
    </div>
  )
}

export default function BulkRouteSettingsModal({ open, onClose, rutas }) {
  const { can } = usePermission()
  const [selectedIds, setSelectedIds] = useState([])
  const [confirmApply, setConfirmApply] = useState(false)
  const { notify } = useNotify()
  const overlay = useFormOverlay()
  const [fields, setFields] = useState({
    incluir_fines_semana: null,
    excluir_feriados: null,
    dia_inicio_periodo: '',
    dia_fin_periodo: '',
    valor_diario: '',
  })

  useEffect(() => {
    if (open) {
      overlay.reset()
      setSelectedIds(rutas.map((r) => r.id))
      setFields({
        incluir_fines_semana: null,
        excluir_feriados: null,
        dia_inicio_periodo: '',
        dia_fin_periodo: '',
        valor_diario: '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, rutas])

  const buildPayload = () => {
    const dataToUpdate = {}
    if (fields.incluir_fines_semana !== null) {
      dataToUpdate.incluir_fines_semana = !fields.incluir_fines_semana
    }
    if (fields.excluir_feriados !== null) dataToUpdate.excluir_feriados = fields.excluir_feriados
    if (fields.dia_inicio_periodo !== '') {
      dataToUpdate.dia_inicio_periodo = parseInt(fields.dia_inicio_periodo, 10)
    }
    if (fields.dia_fin_periodo !== '') {
      dataToUpdate.dia_fin_periodo = parseInt(fields.dia_fin_periodo, 10)
    }
    if (fields.valor_diario !== '') {
      dataToUpdate.valor_diario = parseFloat(fields.valor_diario)
    }
    return dataToUpdate
  }

  const requestApply = () => {
    if (!can('contratos.change_rutatransporte')) return
    if (selectedIds.length === 0) {
      notify({ variant: 'warning', text: 'Seleccione al menos una ruta.' })
      return
    }
    const dataToUpdate = buildPayload()
    if (Object.keys(dataToUpdate).length === 0) {
      notify({
        variant: 'warning',
        text: 'No ha seleccionado ningún cambio para aplicar.',
      })
      return
    }
    setConfirmApply(true)
  }

  const handleApply = async () => {
    setConfirmApply(false)
    const dataToUpdate = buildPayload()
    try {
      await overlay.run(
        async () => {
          await api.post('contratos/rutas/bulk-update/', {
            ruta_ids: selectedIds,
            fields: dataToUpdate,
          })
        },
        {
          successDescription: `Configuración aplicada a ${selectedIds.length} ruta${selectedIds.length === 1 ? '' : 's'}.`,
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Configuración masiva de rutas"
        subheader="Afecta a múltiples rutas operativas de forma simultánea"
        size="lg"
        className="rutas-detail-modal--wide modal--shell"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <>
            <Button variant="ghost" onClick={handleClose} disabled={overlay.busy}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={requestApply}
              loading={overlay.busy}
              disabled={overlay.busy || overlay.active || !can('contratos.change_rutatransporte')}
            >
              <Icon name="check" size="sm" /> Aplicar a {selectedIds.length} rutas
            </Button>
          </>
        }
      >
        <div className="rutas-detail-bulk-layout">
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-3)',
              }}
            >
              <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                1. Rutas a modificar ({selectedIds.length})
              </h4>
              <div className="rutas-detail-est-actions">
                <button type="button" onClick={() => setSelectedIds(rutas.map((r) => r.id))}>
                  Todas
                </button>
                <button
                  type="button"
                  className="is-muted"
                  onClick={() => setSelectedIds([])}
                >
                  Ninguna
                </button>
              </div>
            </div>
            <div className="rutas-detail-est-grid" style={{ maxHeight: '20rem', gridTemplateColumns: '1fr' }}>
              {rutas.map((r) => (
                <label key={r.id} className="rutas-detail-est-item">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...selectedIds, r.id]
                        : selectedIds.filter((id) => id !== r.id)
                      setSelectedIds(newIds)
                    }}
                  />
                  <span>{r.nombre}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="rutas-detail-section-title">2. Cambios a aplicar</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="rutas-detail-field-row">
                <div>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>Excluir fines de semana</strong>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    Sábados y domingos
                  </div>
                </div>
                <TriToggle
                  value={fields.incluir_fines_semana}
                  yesVariant="warn"
                  onChange={(v) => setFields({ ...fields, incluir_fines_semana: v })}
                />
              </div>

              <div className="rutas-detail-field-row">
                <div>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>Excluir feriados</strong>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    Días nacionales
                  </div>
                </div>
                <TriToggle
                  value={fields.excluir_feriados}
                  onChange={(v) => setFields({ ...fields, excluir_feriados: v })}
                />
              </div>

              <div className="form-grid">
                <Field label="Día inicio" htmlFor="bulk-dia-inicio">
                  <Input
                    id="bulk-dia-inicio"
                    type="number"
                    placeholder="No cambiar"
                    value={fields.dia_inicio_periodo}
                    onChange={(e) =>
                      setFields({ ...fields, dia_inicio_periodo: e.target.value })
                    }
                  />
                </Field>
                <Field label="Día fin" htmlFor="bulk-dia-fin">
                  <Input
                    id="bulk-dia-fin"
                    type="number"
                    placeholder="No cambiar"
                    value={fields.dia_fin_periodo}
                    onChange={(e) => setFields({ ...fields, dia_fin_periodo: e.target.value })}
                  />
                </Field>
                <Field label="Valor diario" htmlFor="bulk-valor" className="field--full">
                  <CurrencyInput
                    id="bulk-valor"
                    placeholder="No cambiar"
                    value={fields.valor_diario}
                    onChange={(val) => setFields({ ...fields, valor_diario: val })}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        onConfirm={handleApply}
        title="Aplicar cambios"
        description={`¿Está seguro de aplicar estos cambios a ${selectedIds.length} rutas?`}
        confirmLabel="Aplicar"
        danger={false}
      />
    </>
  )
}
