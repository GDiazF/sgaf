import React, { useState, useEffect, useCallback } from 'react'
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import { Modal, Button, ConfirmModal, Icon, Field, CurrencyInput, Input, Switch } from '@slep/ui'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import api from '../../../api'
import { formatM3Display, formatM3Input } from '../../../utils/formatM3'

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

function DiaCeldaVolumen({ fecha, volumen, isFeriado, isFinDeSemana, onClick, disabled }) {
  const tieneVolumen = volumen != null && volumen !== ''
  let cls = 'rutas-detail-day'
  if (isFeriado) cls += ' rutas-detail-day--fer'
  else if (isFinDeSemana) cls += ' rutas-detail-day--weekend'
  else if (tieneVolumen) cls += ' rutas-detail-day--vol'
  else cls += ' rutas-detail-day--empty'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(fecha)}
      className={cls}
      title={tieneVolumen ? `${formatM3Display(volumen)} m³` : 'Registrar m³ del servicio'}
    >
      <span className="rutas-detail-day__dow">
        {format(fecha, 'EEE', { locale: es })}
      </span>
      <span className="rutas-detail-day__num">{format(fecha, 'd')}</span>
      {tieneVolumen ? (
        <span className="rutas-detail-day__vol">{formatM3Display(volumen)} m³</span>
      ) : null}
    </button>
  )
}

export default function PeriodoCalendarioModal({ open, periodoId, onClose }) {
  const { can } = usePermission()
  const [loading, setLoading] = useState(true)
  const [loadingTotal, setLoadingTotal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [savingDatos, setSavingDatos] = useState(false)
  const [feriados, setFeriados] = useState([])
  const [calendario, setCalendario] = useState(null)
  const [totalData, setTotalData] = useState(null)
  const [diasGrid, setDiasGrid] = useState([])
  const [confirmClose, setConfirmClose] = useState(false)
  const [montoFijo, setMontoFijo] = useState('')
  const [montoVariable, setMontoVariable] = useState('')
  const [nroFactura, setNroFactura] = useState('')
  const [fechaServicio, setFechaServicio] = useState('')
  const [incluirPeriodoEnRc, setIncluirPeriodoEnRc] = useState(true)
  const [diaVolumenEdit, setDiaVolumenEdit] = useState(null)
  const [savingVolumenDia, setSavingVolumenDia] = useState(false)
  const { notify } = useNotify()

  const esMensual = Boolean(calendario?.es_mensual)
  const esVolumetrico = Boolean(calendario?.es_volumetrico)
  const esMixto = Boolean(calendario?.es_mensual_mixto)
  const esLineaEst = esMensual || esVolumetrico
  const usaAsistencia = Boolean(calendario?.usa_asistencia) && !esMixto
  const isClosed = calendario?.estado === 'CERRADO'
  const canEditPeriodo = can('contratos.change_periodocobro')

  const fetchCalendario = useCallback(async () => {
    try {
      const res = await api.get(`contratos/periodos/${periodoId}/calendario/`)
      setCalendario(res.data)
      setMontoFijo(res.data?.monto_fijo ?? 0)
      setMontoVariable(res.data?.monto_variable ?? 0)
      setNroFactura(res.data?.nro_factura || '')
      setFechaServicio(
        res.data?.fecha_servicio
          ? String(res.data.fecha_servicio).slice(0, 10)
          : '',
      )
      setIncluirPeriodoEnRc(res.data?.incluir_periodo_en_rc !== false)
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
    if (!can('contratos.change_ausenciaruta') && !canEditPeriodo) return
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

  const handleClickDiaVolumen = (fechaDate) => {
    if (!canEditPeriodo || isClosed) return
    const fechaStr = format(fechaDate, 'yyyy-MM-dd')
    const actual = formatM3Input(calendario?.volumenes_dia?.[fechaStr] || '')
    setDiaVolumenEdit({ fecha: fechaStr, label: format(fechaDate, "d 'de' MMMM", { locale: es }), value: actual })
  }

  const handleSaveVolumenDia = async (clear = false) => {
    if (!diaVolumenEdit) return
    setSavingVolumenDia(true)
    try {
      await api.post(`contratos/periodos/${periodoId}/volumen-dia/`, {
        fecha: diaVolumenEdit.fecha,
        volumen_m3: clear
          ? null
          : diaVolumenEdit.value === ''
            ? null
            : String(diaVolumenEdit.value).replace(',', '.'),
      })
      setDiaVolumenEdit(null)
      await fetchCalendario()
      await fetchTotal()
      notify({
        variant: 'success',
        text: clear ? 'Registro del día eliminado.' : 'Volumen del día guardado.',
      })
    } catch (err) {
      notify({
        variant: 'danger',
        text:
          err?.response?.data?.volumen_m3 ||
          err?.response?.data?.fecha ||
          err?.response?.data?.detail ||
          'No se pudo guardar el volumen.',
      })
    } finally {
      setSavingVolumenDia(false)
    }
  }

  const handleSaveDatosRecepcion = async () => {
    if (!esLineaEst || isClosed) return
    setSavingDatos(true)
    try {
      const payload = {
        nro_factura: nroFactura || '',
        fecha_servicio: fechaServicio || null,
        incluir_periodo_en_rc: incluirPeriodoEnRc,
      }
      if (esMixto) {
        payload.monto_fijo = montoFijo || 0
        payload.monto_variable = montoVariable || 0
      }
      await api.patch(`contratos/periodos/${periodoId}/datos-recepcion/`, payload)
      notify({ variant: 'success', text: 'Datos del periodo guardados.' })
      await fetchCalendario()
      await fetchTotal()
    } catch (err) {
      notify({
        variant: 'danger',
        text:
          err?.response?.data?.error ||
          err?.response?.data?.fecha_servicio ||
          'No se pudieron guardar los datos.',
      })
    } finally {
      setSavingDatos(false)
    }
  }

  const handleClose = () => {
    onClose?.()
  }

  const titlePrefix = usaAsistencia
    ? 'Control de asistencia'
    : esVolumetrico
      ? 'Registro volumétrico'
      : 'Periodo'

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={`${titlePrefix} — ${calendario?.nombre_estandarizado || 'Periodo'}`}
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
              disabled={
                isClosing ||
                !calendario ||
                !(can('contratos.change_ausenciaruta') || canEditPeriodo)
              }
            >
              <Icon name="shield" size="sm" /> Guardar y congelar periodo
            </Button>
          )
        }
      >
        {loading ? (
          <p className="sr-only" role="status">
            Cargando periodo…
          </p>
        ) : (
          <div className="rutas-detail-calendar">
            <div>
              {usaAsistencia ? (
                <>
                  <div className="rutas-detail-calendar__head">
                    <h4 className="rutas-detail-section-title">Calendario mensual</h4>
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
                </>
              ) : esMixto ? (
                <div className="rutas-detail-mixto-form">
                  <h4 className="rutas-detail-section-title">Montos del periodo</h4>
                  <p className="field__hint">
                    Ambos opcionales. Total = fijo + variable (ej. solo variable en fumigación).
                  </p>
                  <Field label="Monto fijo" htmlFor="periodo-monto-fijo">
                    <CurrencyInput
                      id="periodo-monto-fijo"
                      value={montoFijo}
                      disabled={isClosed}
                      onChange={(val) => setMontoFijo(val)}
                    />
                  </Field>
                  <Field label="Monto variable" htmlFor="periodo-monto-variable">
                    <CurrencyInput
                      id="periodo-monto-variable"
                      value={montoVariable}
                      disabled={isClosed}
                      onChange={(val) => setMontoVariable(val)}
                    />
                  </Field>
                </div>
              ) : esVolumetrico ? (
                <>
                  <div className="rutas-detail-calendar__head">
                    <h4 className="rutas-detail-section-title">Servicios del mes (m³ por día)</h4>
                    <div className="rutas-detail-calendar__legend">
                      <div className="rutas-detail-calendar__legend-item">
                        <span className="rutas-detail-calendar__dot rutas-detail-calendar__dot--vol" />{' '}
                        Con volumen
                      </div>
                      <div className="rutas-detail-calendar__legend-item">
                        <span className="rutas-detail-calendar__dot rutas-detail-calendar__dot--empty" />{' '}
                        Sin servicio
                      </div>
                      <div className="rutas-detail-calendar__legend-item">
                        <span className="rutas-detail-calendar__dot rutas-detail-calendar__dot--fer" />{' '}
                        Feriado / no hábil
                      </div>
                    </div>
                  </div>
                  <p className="field__hint">
                    Precio unitario:{' '}
                    <strong>
                      ${new Intl.NumberFormat('es-CL').format(calendario?.precio_m3 || 0)}
                    </strong>{' '}
                    / m³. Haz clic en un día para registrar cuántos m³ se entregaron o
                    sanitizaron ese día. El total del periodo es la suma de todos los días.
                  </p>
                  <div className="rutas-detail-calendar__grid">
                    {calendario &&
                      diasGrid.map((dia) => {
                        const fStr = format(dia, 'yyyy-MM-dd')
                        const isFinSem = isWeekend(dia)
                        const isFeriado = feriados.includes(fStr)
                        const isDisabled =
                          calendario.estado === 'CERRADO' ||
                          (!calendario.regla.incluir_fines_semana && isFinSem) ||
                          (calendario.regla.excluir_feriados && isFeriado)

                        return (
                          <DiaCeldaVolumen
                            key={fStr}
                            fecha={dia}
                            volumen={calendario.volumenes_dia?.[fStr]}
                            isFeriado={isFeriado && calendario.regla.excluir_feriados}
                            isFinDeSemana={isFinSem && !calendario.regla.incluir_fines_semana}
                            disabled={isDisabled || !canEditPeriodo}
                            onClick={handleClickDiaVolumen}
                          />
                        )
                      })}
                  </div>
                </>
              ) : (
                <div className="rutas-detail-mixto-form">
                  <h4 className="rutas-detail-section-title">Mensual único</h4>
                  <p className="field__hint">
                    El monto es el definido a nivel de gestión. Completa factura y fecha de
                    servicio si aplica a la recepción.
                  </p>
                </div>
              )}

              {esLineaEst ? (
                <div className="rutas-detail-mixto-form">
                  <h4 className="rutas-detail-section-title">Datos para recepción</h4>
                  <p className="field__hint">
                    Periodo: <strong>{calendario?.nombre_estandarizado}</strong>. Estos datos
                    alimentan el PDF de recepción de servicio.
                  </p>
                  <Field
                    label="N° factura / certificado"
                    htmlFor="periodo-nro-factura"
                    hint="Captura manual (p. ej. certificado de fumigación)."
                  >
                    <Input
                      id="periodo-nro-factura"
                      value={nroFactura}
                      disabled={isClosed}
                      onChange={(e) => setNroFactura(e.target.value)}
                      placeholder="Ej. F-12345"
                    />
                  </Field>
                  <Field
                    label="Fecha del servicio"
                    htmlFor="periodo-fecha-servicio"
                    hint="Opcional. Si la usas y no coincide con el mes del periodo, desactiva incluir el periodo escrito."
                  >
                    <Input
                      id="periodo-fecha-servicio"
                      type="date"
                      value={fechaServicio}
                      disabled={isClosed}
                      onChange={(e) => setFechaServicio(e.target.value)}
                    />
                  </Field>
                  <div className="field">
                    <Switch
                      label="Incluir periodo escrito en la RC"
                      checked={incluirPeriodoEnRc}
                      disabled={isClosed}
                      onChange={(e) => setIncluirPeriodoEnRc(e.target.checked)}
                    />
                    <p className="field__hint">
                      Si está apagado, la variable «Periodo» del PDF queda vacía (el periodo
                      igual se usa para montos y factura).
                    </p>
                  </div>
                  {!isClosed && canEditPeriodo ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={savingDatos}
                      disabled={savingDatos}
                      onClick={handleSaveDatosRecepcion}
                    >
                      Guardar datos de recepción
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rutas-detail-pay-summary">
              <h4 className="rutas-detail-section-title">Resumen de pago</h4>
              {esMixto ? (
                <>
                  <div className="rutas-detail-pay-summary__row">
                    <span>Monto fijo</span>
                    <strong>
                      ${new Intl.NumberFormat('es-CL').format(totalData?.monto_fijo || 0)}
                    </strong>
                  </div>
                  <div className="rutas-detail-pay-summary__row">
                    <span>Monto variable</span>
                    <strong>
                      ${new Intl.NumberFormat('es-CL').format(totalData?.monto_variable || 0)}
                    </strong>
                  </div>
                </>
              ) : esVolumetrico ? (
                <>
                  <div className="rutas-detail-pay-summary__row">
                    <span>Servicios registrados</span>
                    <strong>{totalData?.cantidad_servicios ?? '—'}</strong>
                  </div>
                  <div className="rutas-detail-pay-summary__row">
                    <span>Volumen total</span>
                    <strong>
                      {formatM3Display(totalData?.volumen_m3 || calendario?.volumen_m3) || '—'} m³
                    </strong>
                  </div>
                  <div className="rutas-detail-pay-summary__row">
                    <span>Precio / m³</span>
                    <strong>
                      ${new Intl.NumberFormat('es-CL').format(totalData?.precio_m3 || calendario?.precio_m3 || 0)}
                    </strong>
                  </div>
                </>
              ) : usaAsistencia ? (
                <>
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
                </>
              ) : null}
              {esLineaEst && nroFactura ? (
                <div className="rutas-detail-pay-summary__row">
                  <span>Factura</span>
                  <strong>{nroFactura}</strong>
                </div>
              ) : null}
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

      <Modal
        open={!!diaVolumenEdit}
        onClose={() => !savingVolumenDia && setDiaVolumenEdit(null)}
        title="Volumen del día"
        subheader={diaVolumenEdit ? diaVolumenEdit.label : undefined}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={savingVolumenDia}
              onClick={() => setDiaVolumenEdit(null)}
            >
              Cancelar
            </Button>
            {calendario?.volumenes_dia?.[diaVolumenEdit?.fecha] ? (
              <Button
                variant="secondary"
                disabled={savingVolumenDia}
                onClick={() => handleSaveVolumenDia(true)}
              >
                Quitar registro
              </Button>
            ) : null}
            <Button
              variant="primary"
              loading={savingVolumenDia}
              disabled={savingVolumenDia || !diaVolumenEdit?.value}
              onClick={() => handleSaveVolumenDia(false)}
            >
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Metros cúbicos (m³)" htmlFor="dia-volumen-m3" required>
          <Input
            id="dia-volumen-m3"
            type="number"
            min="0"
            step="0.001"
            autoFocus
            value={diaVolumenEdit?.value ?? ''}
            disabled={savingVolumenDia}
            onChange={(e) =>
              setDiaVolumenEdit((prev) => (prev ? { ...prev, value: e.target.value } : prev))
            }
            placeholder="Ej. 8.5"
          />
        </Field>
      </Modal>
    </>
  )
}

function BadgeClosed() {
  return (
    <span className="rutas-detail-periodo-closed">Periodo finalizado</span>
  )
}
