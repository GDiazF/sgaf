import React, { useState, useEffect, useCallback } from 'react'
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal, Button, ConfirmModal, Icon } from '@slep/ui'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import api from '../../../api'

function DiaCelda({ fecha, isTrabajado, isFeriado, isFinDeSemana, onClick, disabled }) {
  let cls = 'rutas-detail-day rutas-detail-day--ok'
  if (isFeriado) cls = 'rutas-detail-day rutas-detail-day--fer'
  else if (isFinDeSemana) cls = 'rutas-detail-day rutas-detail-day--weekend'
  else if (!isTrabajado) cls = 'rutas-detail-day rutas-detail-day--aus'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(fecha)}
      className={cls}
    >
      <span className="rutas-detail-day__dow">
        {format(fecha, 'EEE', { locale: es })}
      </span>
      <span className="rutas-detail-day__num">{format(fecha, 'd')}</span>
    </button>
  )
}

export default function PeriodoCalendarioModal({ open, periodoId, onClose }) {
  const { can } = usePermission()
  const [loading, setLoading] = useState(true)
  const [loadingTotal, setLoadingTotal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [feriados, setFeriados] = useState([])
  const [calendario, setCalendario] = useState(null)
  const [totalData, setTotalData] = useState(null)
  const [diasGrid, setDiasGrid] = useState([])
  const [confirmClose, setConfirmClose] = useState(false)
  const { notify } = useNotify()

  const fetchCalendario = useCallback(async () => {
    try {
      const res = await api.get(`contratos/periodos/${periodoId}/calendario/`)
      setCalendario(res.data)
      return res.data
    } catch (error) {
      console.error('Error fetching calendario:', error)
      return null
    }
  }, [periodoId])

  const fetchTotal = useCallback(async () => {
    setLoadingTotal(true)
    try {
      const res = await api.get(`contratos/periodos/${periodoId}/total/`)
      setTotalData(res.data)
    } catch (error) {
      console.error('Error fetching total:', error)
    } finally {
      setLoadingTotal(false)
    }
  }, [periodoId])

  useEffect(() => {
    if (!open || !periodoId) return undefined
    let cancelled = false
    const init = async () => {
      setLoading(true)
      try {
        const feriadosRes = await api.get('contratos/feriados/')
        const listaFeriados = Array.isArray(feriadosRes.data)
          ? feriadosRes.data
          : feriadosRes.data.results || []
        if (cancelled) return
        setFeriados(listaFeriados.map((f) => f.fecha))
        const cal = await fetchCalendario()
        if (cancelled || !cal) return
        const start = parseISO(cal.fecha_inicio)
        const end = parseISO(cal.fecha_fin)
        setDiasGrid(eachDayOfInterval({ start, end }))
        await fetchTotal()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [open, periodoId, fetchCalendario, fetchTotal])

  const handleToggleDia = async (fechaDate) => {
    if (!can('contratos.change_ausenciaruta')) return
    if (calendario?.estado === 'CERRADO') return
    const fechaStr = format(fechaDate, 'yyyy-MM-dd')
    const isCurrentlyAusente = calendario.ausencias.includes(fechaStr)

    setCalendario((prev) => ({
      ...prev,
      ausencias: isCurrentlyAusente
        ? prev.ausencias.filter((d) => d !== fechaStr)
        : [...prev.ausencias, fechaStr],
    }))

    try {
      await api.post(`contratos/periodos/${periodoId}/toggle-dia/`, { fecha: fechaStr })
      await fetchTotal()
    } catch {
      notify({ variant: 'danger', text: 'Error al actualizar asistencia.' })
      fetchCalendario()
    }
  }

  const handleCerrarPeriodo = async () => {
    if (!can('contratos.change_ausenciaruta')) return
    setConfirmClose(false)
    setIsClosing(true)
    try {
      await api.post(`contratos/periodos/${periodoId}/cerrar/`)
      await fetchCalendario()
      await fetchTotal()
    } catch {
      notify({ variant: 'danger', text: 'Error al cerrar periodo.' })
    } finally {
      setIsClosing(false)
    }
  }

  const handleClose = () => {
    onClose?.()
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={`Control de asistencia — ${calendario?.nombre_estandarizado || 'Periodo'}`}
        subheader={
          calendario
            ? `Rango: ${format(parseISO(calendario.fecha_inicio), 'dd/MM/yyyy')} – ${format(parseISO(calendario.fecha_fin), 'dd/MM/yyyy')}`
            : 'Cargando…'
        }
        size="lg"
        className="rutas-detail-modal--xl modal--shell"
        headerActions={
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              fetchCalendario()
              fetchTotal()
            }}
            aria-label="Actualizar"
          >
            <Icon name="download" size="sm" />
          </Button>
        }
        footer={
          calendario?.estado === 'CERRADO' ? (
            <BadgeClosed />
          ) : (
            <Button
              variant="primary"
              onClick={() => setConfirmClose(true)}
              loading={isClosing}
              disabled={isClosing || !calendario || !can('contratos.change_ausenciaruta')}
            >
              <Icon name="shield" size="sm" /> Guardar y congelar periodo
            </Button>
          )
        }
      >
        

        {loading ? (
          <p className="sr-only" role="status">
            Cargando calendario…
          </p>
        ) : (
          <div className="rutas-detail-calendar">
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--space-4)',
                  gap: 'var(--space-3)',
                  flexWrap: 'wrap',
                }}
              >
                <h4 className="rutas-detail-section-title" style={{ margin: 0 }}>
                  Calendario mensual
                </h4>
                <div className="rutas-detail-calendar__legend">
                  <div className="rutas-detail-calendar__legend-item">
                    <span className="rutas-detail-calendar__dot rutas-detail-calendar__dot--ok" />{' '}
                    Realizado
                  </div>
                  <div className="rutas-detail-calendar__legend-item">
                    <span className="rutas-detail-calendar__dot rutas-detail-calendar__dot--aus" />{' '}
                    Ausencia
                  </div>
                  <div className="rutas-detail-calendar__legend-item">
                    <span className="rutas-detail-calendar__dot rutas-detail-calendar__dot--fer" />{' '}
                    Feriado
                  </div>
                </div>
              </div>
              <div className="rutas-detail-calendar__grid">
                {calendario &&
                  diasGrid.map((dia) => {
                    const fStr = format(dia, 'yyyy-MM-dd')
                    const isFinSem = isWeekend(dia)
                    const isFeriado = feriados.includes(fStr)
                    const isAus = (calendario.ausencias || []).includes(fStr)
                    const isDisabled =
                      calendario.estado === 'CERRADO' ||
                      (!calendario.regla.incluir_fines_semana && isFinSem) ||
                      (calendario.regla.excluir_feriados && isFeriado)

                    return (
                      <DiaCelda
                        key={fStr}
                        fecha={dia}
                        isTrabajado={!isAus}
                        isFeriado={isFeriado && calendario.regla.excluir_feriados}
                        isFinDeSemana={isFinSem && !calendario.regla.incluir_fines_semana}
                        disabled={isDisabled}
                        onClick={handleToggleDia}
                      />
                    )
                  })}
              </div>
            </div>

            <div className="rutas-detail-pay-summary">
              <h4 className="rutas-detail-section-title">Resumen de pago</h4>
              <div className="rutas-detail-pay-summary__row">
                <span>Días hábiles</span>
                <strong>{totalData?.dias_base ?? '—'}</strong>
              </div>
              <div className="rutas-detail-pay-summary__row">
                <span>Inasistencias</span>
                <strong>-{totalData?.ausencias ?? 0}</strong>
              </div>
              <div className="rutas-detail-pay-summary__row">
                <span>Días a pagar</span>
                <strong>{totalData?.dias_cobrar ?? '—'}</strong>
              </div>
              <div className="rutas-detail-pay-summary__total">
                <p>Monto estimado</p>
                <strong>
                  {loadingTotal
                    ? '…'
                    : `$${new Intl.NumberFormat('es-CL').format(totalData?.total || 0)}`}
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleCerrarPeriodo}
        title="Cerrar periodo"
        description="¿Confirmas el cierre definitivo de este periodo? No se podrán realizar más cambios."
        confirmLabel="Cerrar periodo"
        danger
      />
    </>
  )
}

function BadgeClosed() {
  return (
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', fontWeight: 600 }}>
      Periodo finalizado
    </span>
  )
}
