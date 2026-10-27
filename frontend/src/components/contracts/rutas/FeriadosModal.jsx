import React, { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  EmptyState,
  Field,
  Input,
  DateInput,
  Icon,
  ConfirmModal,
  formatDateCL,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import api from '../../../api'
import { useNotify } from '../../../hooks/useNotify'
import { usePermission } from '../../../hooks/usePermission'

const EMPTY_MANUAL = { fecha: '', descripcion: '' }

export default function FeriadosModal({ open, onClose }) {
  const [feriados, setFeriados] = useState([])
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const overlay = useFormOverlay()
  const { notify } = useNotify()
  const { can } = usePermission()
  const canDelete = can('contratos.delete_feriadonacional')

  const fetchFeriados = async () => {
    try {
      const res = await api.get('contratos/feriados/')
      setFeriados(res.data.results || res.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (open) {
      fetchFeriados()
      setManual(EMPTY_MANUAL)
    }
  }, [open])

  const handleSyncFeriados = async () => {
    try {
      await overlay.run(
        async () => {
          const anios = [2024, 2025, 2026]
          let totalCreados = 0

          for (const anio of anios) {
            let data = null
            try {
              const response = await fetch(
                `https://feriados-cl.netlify.app/api/holidays/${anio}`,
              )
              if (response.ok) data = await response.json()
            } catch (e) {
              console.error(`Netlify fail for ${anio}`, e)
            }

            if (!data || !data.feriados) {
              try {
                const response = await fetch(
                  'https://api.victorsanmartin.com/feriados/en.json',
                )
                if (response.ok) {
                  const raw = await response.json()
                  data = {
                    feriados: {
                      all: raw
                        .filter((f) => f.date.startsWith(String(anio)))
                        .map((f) => ({
                          ...f,
                          dia: parseInt(f.date.split('-')[2], 10),
                          mes: parseInt(f.date.split('-')[1], 10),
                        })),
                    },
                  }
                }
              } catch (e) {
                console.error(`VictorSM fail for ${anio}`, e)
              }
            }

            if (!data || !data.feriados) continue

            const feriadosList = []
            Object.entries(data.feriados).forEach(([, items]) => {
              items.forEach((item) => {
                const mesPad = String(item.mes).padStart(2, '0')
                const diaPad = String(item.dia).padStart(2, '0')
                feriadosList.push({
                  fecha: `${anio}-${mesPad}-${diaPad}`,
                  descripcion: item.descripcion || item.title,
                })
              })
            })

            if (feriadosList.length > 0) {
              const res = await api.post('contratos/feriados/bulk_create/', feriadosList)
              totalCreados += res.data.creados
            }
          }

          return totalCreados
        },
        {
          successDescription: 'Feriados sincronizados correctamente.',
          formatError: (err) =>
            err?.message || formatApiFormError(err, 'Error al sincronizar feriados.'),
        },
      )
      await fetchFeriados()
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  const handleAddManual = async (e) => {
    e.preventDefault()
    const fecha = (manual.fecha || '').trim()
    const descripcion = (manual.descripcion || '').trim()
    if (!fecha || !descripcion) {
      notify({ variant: 'danger', text: 'Indique fecha y descripción.' })
      return
    }
    try {
      await overlay.run(
        async () => {
          await api.post('contratos/feriados/', { fecha, descripcion })
        },
        {
          successDescription: 'Feriado agregado.',
          formatError: (err) => {
            const data = err?.response?.data
            if (data?.fecha) {
              const msg = Array.isArray(data.fecha) ? data.fecha[0] : data.fecha
              if (String(msg).toLowerCase().includes('already exists') || String(msg).toLowerCase().includes('ya existe')) {
                return 'Ya existe un feriado en esa fecha.'
              }
            }
            return formatApiFormError(err, 'No se pudo agregar el feriado.')
          },
        },
      )
      setManual(EMPTY_MANUAL)
      await fetchFeriados()
    } catch {
      // FormOverlay
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
      fetchFeriados()
      return
    }
    overlay.dismiss()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`contratos/feriados/${deleteTarget.id}/`)
      setDeleteTarget(null)
      await fetchFeriados()
      notify({ variant: 'success', text: 'Feriado eliminado.' })
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'Error al eliminar feriado.' })
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
        title="Calendario de feriados"
        subheader="Configuración nacional para exclusión de días"
        {...overlay.modalProps}
        onOverlayDismiss={handleOverlayDismiss}
        footer={
          <Button
            variant="secondary"
            type="button"
            onClick={handleClose}
            disabled={overlay.busy}
          >
            Cerrar
          </Button>
        }
      >
        <div className="rutas-feriados">
          <form className="rutas-feriados__sync" onSubmit={handleAddManual}>
            <div className="rutas-feriados__sync-copy">
              <p className="rutas-feriados__sync-title">Calendario nacional</p>
              <p className="rutas-feriados__sync-hint">
                Sincronice 2024–2026 desde fuentes públicas, o agregue un feriado si no calza con
                el real.
              </p>
            </div>
            <div className="form-grid">
              <Field label="Fecha" required htmlFor="feriado-fecha">
                <DateInput
                  id="feriado-fecha"
                  required
                  value={manual.fecha}
                  onChange={(e) => setManual((prev) => ({ ...prev, fecha: e.target.value }))}
                  disabled={overlay.busy}
                />
              </Field>
              <Field label="Descripción" required htmlFor="feriado-desc">
                <Input
                  id="feriado-desc"
                  required
                  maxLength={200}
                  placeholder="Ej. Feriado regional"
                  value={manual.descripcion}
                  onChange={(e) =>
                    setManual((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  disabled={overlay.busy}
                />
              </Field>
            </div>
            <div className="rutas-feriados__actions">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={handleSyncFeriados}
                loading={overlay.busy}
                disabled={overlay.busy || overlay.active}
              >
                <Icon name="download" size="sm" /> Sincronizar API
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                loading={overlay.busy}
                disabled={overlay.busy || overlay.active}
              >
                <Icon name="plus" size="sm" /> Agregar feriado
              </Button>
            </div>
          </form>

          {feriados.length === 0 && !overlay.busy ? (
            <EmptyState
              title="Sin feriados"
              description="No hay feriados cargados. Sincronice el calendario o agregue uno manualmente."
            />
          ) : (
            <ul className="rutas-feriados__list">
              {feriados.map((f) => (
                <li key={f.id} className="rutas-feriados__item">
                  <div>
                    <strong>{f.descripcion}</strong>
                    <span>{formatDateCL(f.fecha) || f.fecha}</span>
                  </div>
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Eliminar feriado"
                      onClick={() => setDeleteTarget(f)}
                    >
                      <Icon name="trash" size="sm" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
        title="Eliminar feriado"
        description={
          deleteTarget
            ? `¿Eliminar «${deleteTarget.descripcion}» (${formatDateCL(deleteTarget.fecha) || deleteTarget.fecha})?`
            : ''
        }
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </>
  )
}
