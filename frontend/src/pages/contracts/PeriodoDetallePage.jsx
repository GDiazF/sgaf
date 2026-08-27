import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  PageHeader,
  Button,
  Card,
  Badge,
  Alert,
  EmptyState,
  Icon,
  ConfirmModal,
} from '@slep/ui'
import { format, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'
import { es } from 'date-fns/locale'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'

const DiaCelda = ({ fecha, isTrabajado, isFeriado, isFinDeSemana, onClick, disabled }) => {
  let modifier = 'is-trabajado'
  if (!isTrabajado) modifier = 'is-ausencia'
  else if (isFeriado) modifier = 'is-feriado'
  else if (isFinDeSemana) modifier = 'is-fin-semana'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(fecha)}
      className={`contratos-dia-celda ${modifier}${disabled ? ' is-disabled' : ''}`}
    >
      <span className="contratos-dia-celda__dow">
        {format(fecha, 'EEE', { locale: es })}
      </span>
      <span className="contratos-dia-celda__day">{format(fecha, 'd')}</span>
    </button>
  )
}

const ResumenPeriodo = ({ totalData, loadingTotal }) => {
  if (!totalData) return null

  const { total, dias_base, ausencias, dias_cobrar, estado, es_mensual_mixto, monto_fijo, monto_variable } =
    totalData

  return (
    <Card className="contratos-periodo-resumen">
      <p className="contratos-ruta-card__eyebrow">
        <Icon name="info" size={16} /> Resumen del periodo
      </p>
      <dl className="contratos-periodo-resumen__list">
        {es_mensual_mixto ? (
          <>
            <div>
              <dt>Monto fijo</dt>
              <dd>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  monto_fijo || 0,
                )}
              </dd>
            </div>
            <div>
              <dt>Monto variable</dt>
              <dd>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                  monto_variable || 0,
                )}
              </dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Días base (hábiles)</dt>
              <dd>{dias_base}</dd>
            </div>
            <div>
              <dt>Días no realizados</dt>
              <dd className="is-danger">-{ausencias}</dd>
            </div>
            <div className="is-total">
              <dt>Días a cobrar</dt>
              <dd>{dias_cobrar}</dd>
            </div>
          </>
        )}
      </dl>
      <div className="contratos-periodo-resumen__footer">
        <div>
          <p className="contratos-ruta-card__hint">Total calculado</p>
          <p className="contratos-ruta-card__value">
            {loadingTotal
              ? '…'
              : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total)}
          </p>
        </div>
        <Badge variant={estado === 'CERRADO' ? 'neutral' : 'success'}>{estado}</Badge>
      </div>
    </Card>
  )
}

const PeriodoDetallePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermission()
  const canToggleAsistencia = can('contratos.change_ausenciaruta')
  const canCerrarPeriodo = can('contratos.change_periodocobro')

  const [loading, setLoading] = useState(true)
  const [loadingTotal, setLoadingTotal] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const [calendario, setCalendario] = useState(null)
  const [totalData, setTotalData] = useState(null)
  const [diasGrid, setDiasGrid] = useState([])
  const [toggleError, setToggleError] = useState('')

  const fetchCalendario = useCallback(async () => {
    try {
      const res = await api.get(`contratos/periodos/${id}/calendario/`)
      setCalendario(res.data)
      return res.data
    } catch (error) {
      console.error('Error fetching calendario:', error)
      return null
    }
  }, [id])

  const fetchTotal = useCallback(async () => {
    setLoadingTotal(true)
    try {
      const res = await api.get(`contratos/periodos/${id}/total/`)
      setTotalData(res.data)
    } catch (error) {
      console.error('Error fetching total:', error)
    } finally {
      setLoadingTotal(false)
    }
  }, [id])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const cal = await fetchCalendario()
      if (cal) {
        const start = parseISO(cal.fecha_inicio)
        const end = parseISO(cal.fecha_fin)
        setDiasGrid(eachDayOfInterval({ start, end }))
      }
      await fetchTotal()
      setLoading(false)
    }
    init()
  }, [fetchCalendario, fetchTotal])

  const isClosed = calendario?.estado === 'CERRADO'

  const handleToggleDia = async (fechaDate) => {
    if (isClosed || !canToggleAsistencia) return

    const fechaStr = format(fechaDate, 'yyyy-MM-dd')
    const isCurrentlyAusente = calendario.ausencias.includes(fechaStr)
    const newAusencias = isCurrentlyAusente
      ? calendario.ausencias.filter((d) => d !== fechaStr)
      : [...calendario.ausencias, fechaStr]

    setCalendario((prev) => ({ ...prev, ausencias: newAusencias }))
    setToggleError('')

    try {
      await api.post(`contratos/periodos/${id}/toggle-dia/`, { fecha: fechaStr })
      await fetchTotal()
    } catch (error) {
      console.error('Error toggling dia:', error)
      setToggleError('No se pudo actualizar el día. Revise la conexión.')
      setCalendario((prev) => ({
        ...prev,
        ausencias: isCurrentlyAusente
          ? newAusencias.filter((d) => d !== fechaStr)
          : prev.ausencias.filter((d) => d !== fechaStr),
      }))
      fetchCalendario()
    }
  }

  const handleCerrarPeriodo = async () => {
    setIsClosing(true)
    try {
      await api.post(`contratos/periodos/${id}/cerrar/`)
      setConfirmClose(false)
      await fetchCalendario()
      await fetchTotal()
    } catch (error) {
      console.error('Error cerrando periodo:', error)
      setToggleError('Ocurrió un error al intentar cerrar el periodo.')
    } finally {
      setIsClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="page" data-od-id="periodo-detail-page">
        <EmptyState title="Cargando periodo…" description="Obteniendo calendario y totales." />
      </div>
    )
  }

  if (!calendario) {
    return (
      <div className="page" data-od-id="periodo-detail-page">
        <Alert variant="danger" title="Error">
          No se pudo cargar la información del periodo.
        </Alert>
        <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
          Volver
        </Button>
      </div>
    )
  }

  const rangeLabel = `${format(parseISO(calendario.fecha_inicio), "d 'de' MMMM, yyyy", { locale: es })} al ${format(parseISO(calendario.fecha_fin), "d 'de' MMMM, yyyy", { locale: es })}`

  return (
    <div className="page contratos-periodo-page" data-od-id="periodo-detail-page">
      <PageHeader
        icon="clock"
        title="Detalle del periodo"
        description={rangeLabel}
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Periodo' },
        ]}
        linkComponent={Link}
        actions={
          <div className="contratos-periodo-page__actions">
            <Button
              type="button"
              variant="secondary"
              disabled={isClosing}
              onClick={() => {
                fetchCalendario()
                fetchTotal()
              }}
            >
              <Icon name="refresh" size={16} />
              Refrescar
            </Button>
            {!isClosed && canCerrarPeriodo ? (
              <Button
                type="button"
                variant="primary"
                disabled={isClosing}
                onClick={() => setConfirmClose(true)}
              >
                Cerrar periodo
              </Button>
            ) : null}
          </div>
        }
      />

      {toggleError ? (
        <Alert variant="danger" title="Error" className="alert--compact">
          {toggleError}
        </Alert>
      ) : null}

      <div className="contratos-periodo-page__layout">
        <Card className="contratos-periodo-cal">
          <div className="contratos-periodo-cal__head">
            <h2 className="contratos-periodo-cal__title">
              <Icon name="check" size={18} />
              Control de asistencia
            </h2>
            <ul className="contratos-periodo-cal__legend">
              <li>
                <span className="contratos-periodo-cal__swatch is-trabajado" /> Trabajado
              </li>
              <li>
                <span className="contratos-periodo-cal__swatch is-ausencia" /> Ausencia
              </li>
              <li>
                <span className="contratos-periodo-cal__swatch is-fin-semana" /> Feriado / fin sem.
              </li>
            </ul>
          </div>

          <div className="contratos-periodo-cal__grid">
            {diasGrid.map((dia) => {
              const fechaStr = format(dia, 'yyyy-MM-dd')
              const isFinSemana = isWeekend(dia)
              const isAusente = calendario.ausencias.includes(fechaStr)
              const isFeriado = false

              let disabledForInteraction = false
              if (isClosed) disabledForInteraction = true
              if (!canToggleAsistencia) disabledForInteraction = true
              if (!calendario.regla.incluir_fines_semana && isFinSemana) disabledForInteraction = true
              if (calendario.regla.excluir_feriados && isFeriado) disabledForInteraction = true

              const isTrabajado = !isAusente
              const isFinDeSemanaOrFeriado = disabledForInteraction && !isClosed && isTrabajado

              return (
                <DiaCelda
                  key={fechaStr}
                  fecha={dia}
                  isTrabajado={isTrabajado}
                  isFeriado={false}
                  isFinDeSemana={isFinDeSemanaOrFeriado}
                  disabled={disabledForInteraction}
                  onClick={handleToggleDia}
                />
              )
            })}
          </div>
        </Card>

        <ResumenPeriodo totalData={totalData} loadingTotal={loadingTotal} />
      </div>

      <ConfirmModal
        open={confirmClose}
        onClose={() => !isClosing && setConfirmClose(false)}
        onConfirm={handleCerrarPeriodo}
        title="Cerrar periodo"
        description="¿Estás seguro de cerrar este periodo? Esta acción congelará el cálculo y no se podrán modificar los días."
        confirmLabel={isClosing ? 'Cerrando…' : 'Cerrar periodo'}
        danger={false}
      />
    </div>
  )
}

export default PeriodoDetallePage
