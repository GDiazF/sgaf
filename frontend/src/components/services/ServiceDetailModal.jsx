import React, { useState, useEffect, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import api from '../../api'
import { Modal, Button, Field, Select, Badge, Icon } from '@slep/ui'

/** Período de consumo = mes calendario anterior a la fecha de vencimiento. */
const getServicePeriod = (payment) => {
  const dateStr = payment.fecha_vencimiento || payment.fecha_emision || payment.fecha_pago
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  if (!year || !month) return null
  const vencimiento = new Date(year, month - 1, day || 1)
  vencimiento.setMonth(vencimiento.getMonth() - 1)
  return { year: vencimiento.getFullYear(), month: vencimiento.getMonth() }
}

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount || 0)

const formatDate = (dateString) => {
  if (!dateString) return '—'
  const [year, month, day] = dateString.split('-')
  return `${day}/${month}/${year}`
}

/** Normaliza unidad (m3 → m³) y formatea el consumo del pago. */
const formatUnit = (unit) => {
  if (!unit) return ''
  const u = String(unit).trim()
  if (u.toLowerCase() === 'm3') return 'm³'
  return u
}

const formatConsumo = (payment, fallbackUnit = '') => {
  const raw = payment?.consumo
  if (raw === null || raw === undefined || raw === '') return null
  const value = Number(raw)
  if (Number.isNaN(value)) return null
  const unit = formatUnit(payment.servicio_unidad_medida || fallbackUnit)
  const amount = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString('es-CL', { maximumFractionDigits: 2 })
  return unit ? `${amount} ${unit}` : amount
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const ServiceDetailModal = ({ open, onClose, service }) => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    if (!open || !service?.id) return undefined
    let cancelled = false
    const loadPayments = async () => {
      setLoading(true)
      try {
        const res = await api.get('registros-pagos/', {
          params: { servicio: service.id, page_size: 1000 },
        })
        const fetched = res.data.results || res.data || []
        if (cancelled) return
        setPayments(fetched)
        const years = fetched.map((p) => getServicePeriod(p)?.year).filter(Boolean)
        setSelectedYear(years.length ? Math.max(...years) : new Date().getFullYear())
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPayments()
    return () => {
      cancelled = true
    }
  }, [open, service?.id])

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(payments.map((p) => getServicePeriod(p)?.year).filter(Boolean)),
    ).sort((a, b) => b - a)
    return years.length ? years : [new Date().getFullYear()]
  }, [payments])

  const yearlyPayments = useMemo(
    () => payments.filter((p) => getServicePeriod(p)?.year === selectedYear),
    [payments, selectedYear],
  )

  const chartData = useMemo(
    () =>
      MONTH_NAMES.map((name, index) => {
        const monthly = yearlyPayments.filter((p) => getServicePeriod(p)?.month === index)
        const totalConsumo = monthly.reduce((sum, p) => sum + (parseFloat(p.consumo) || 0), 0)
        const totalMonto = monthly.reduce((sum, p) => sum + (parseInt(p.monto_total, 10) || 0), 0)
        return { name, Consumo: totalConsumo, Monto: totalMonto }
      }),
    [yearlyPayments],
  )

  const totalYearlyConsumption = yearlyPayments.reduce(
    (sum, p) => sum + (parseFloat(p.consumo) || 0),
    0,
  )
  const totalYearlySpent = yearlyPayments.reduce(
    (sum, p) => sum + (parseInt(p.monto_total, 10) || 0),
    0,
  )

  /** Unidad del servicio, o la que traen los pagos (por si el listado no la incluye). */
  const metricUnit = useMemo(() => {
    if (service?.unidad_medida) return service.unidad_medida
    const fromPayment = payments.find((p) => p.servicio_unidad_medida)?.servicio_unidad_medida
    if (fromPayment) return fromPayment
    const hasConsumo = payments.some(
      (p) => p.consumo !== null && p.consumo !== undefined && p.consumo !== '',
    )
    return hasConsumo ? 'u' : ''
  }, [service?.unidad_medida, payments])

  const usesConsumoBars = Boolean(metricUnit)
  const dataKey = usesConsumoBars ? 'Consumo' : 'Monto'
  const unitLabel = formatUnit(metricUnit === 'u' ? '' : metricUnit)

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length || !service) return null
    const data = payload[0].payload
    return (
      <div className="svc-detail-tooltip">
        <strong>
          {data.name} {selectedYear}
        </strong>
        {usesConsumoBars ? (
          <div>
            Consumo: {data.Consumo.toFixed(1)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </div>
        ) : null}
        <div>Costo: {formatCurrency(data.Monto)}</div>
      </div>
    )
  }

  return (
    <Modal
      open={open && !!service}
      onClose={onClose}
      size="lg"
      title={service?.proveedor_nombre || 'Detalle de servicio'}
      subheader={
        service
          ? `Nº cliente #${service.numero_cliente}${
              service.numero_servicio ? ` · Medidor ${service.numero_servicio}` : ''
            }`
          : undefined
      }
      headerActions={
        <Field label="Año" htmlFor="svc-detail-year" className="svc-detail-year">
          <Select
            id="svc-detail-year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Field>
      }
      footer={
        <Button variant="ghost" type="button" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {service ? (
        <div className="crud-form svc-detail">
          <div className="svc-detail__stats">
            <div className="svc-detail__stat">
              <span className="svc-detail__stat-label">Establecimiento</span>
              <strong>{service.establecimiento_nombre || '—'}</strong>
            </div>
            <div className="svc-detail__stat">
              <span className="svc-detail__stat-label">
                {usesConsumoBars ? `Consumo ${selectedYear}` : 'Medición'}
              </span>
              <strong>
                {usesConsumoBars
                  ? `${totalYearlyConsumption.toFixed(1)}${unitLabel ? ` ${unitLabel}` : ''}`
                  : 'Costo fijo / sin métrica'}
              </strong>
            </div>
            <div className="svc-detail__stat">
              <span className="svc-detail__stat-label">Gasto anual {selectedYear}</span>
              <strong>{formatCurrency(totalYearlySpent)}</strong>
            </div>
          </div>

          <div className="svc-detail__chart-wrap">
            <div className="svc-detail__chart-head">
              <span>Historial mensual (por período de vencimiento)</span>
              <Badge variant="accent">
                {usesConsumoBars
                  ? `Consumos (${unitLabel || 'unidades'})`
                  : 'Gasto facturado ($)'}
              </Badge>
            </div>
            {loading ? (
              <div className="svc-detail__empty">
                <p>Cargando historial…</p>
              </div>
            ) : totalYearlySpent === 0 ? (
              <div className="svc-detail__empty">
                <Icon name="servicios" size="lg" />
                <p>No hay consumos o pagos registrados para {selectedYear}</p>
              </div>
            ) : (
              <div className="svc-detail__chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      stroke="var(--muted)"
                      fontSize={11}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      stroke="var(--muted)"
                      fontSize={11}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg)' }} />
                    <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill="var(--primary)" fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <p className="contracts-section-title">Boletas {selectedYear}</p>
            <div className="table-wrap svc-detail__table">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th>Nº Documento</th>
                    <th>F. Venc.</th>
                    <th>Consumo</th>
                    <th>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {yearlyPayments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nro_documento}</td>
                      <td>{formatDate(p.fecha_vencimiento)}</td>
                      <td>
                        {formatConsumo(p, service.unidad_medida) || '—'}
                      </td>
                      <td>{formatCurrency(p.monto_total)}</td>
                    </tr>
                  ))}
                  {yearlyPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Ninguna boleta registrada para este año</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

export default ServiceDetailModal
