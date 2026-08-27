import React, { useState, useEffect } from 'react'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { MetricStrip, Card, CardHeader, Button, Icon } from '@slep/ui'

const MonitoreoKPI = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const { notify } = useNotify()

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const res = await api.get('ejecutivos/gestiones/kpi_dashboard/')
        setStats(res.data)
      } catch (error) {
        console.error(error)
        notify({
          variant: 'danger',
          text: 'No se pudieron cargar las métricas.',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchKPI()
  }, [notify])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await api.get('ejecutivos/gestiones/exportar_metricas/', {
        responseType: 'blob',
      })
      const blob = new Blob([response.data], {
        type: 'text/csv;charset=utf-8-sig',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'metricas_ejecutivos.csv')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading KPI metrics:', error)
      notify({
        variant: 'danger',
        text: 'No se pudieron descargar las métricas.',
      })
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return <p className="comunicaciones-kpi-loading">Cargando métricas…</p>
  }

  if (!stats) {
    return null
  }

  const metrics = [
    { label: 'Total', value: stats.totales.total },
    { label: 'Pendientes', value: stats.totales.pendientes },
    { label: 'En proceso', value: stats.totales.en_proceso },
    { label: 'Cerradas', value: stats.totales.cerradas },
    { label: 'Resolución', value: `${stats.tasa_resolucion}%` },
    { label: 'Prom. cierre', value: `${stats.tiempo_promedio} d` },
  ]

  return (
    <div className="comunicaciones-kpi">
      <Card>
        <CardHeader
          title="Métricas y estadísticas"
          subtitle="Resumen descargable de gestiones de ejecutivos de acompañamiento."
          actions={
            <Button
              action="download"
              loading={downloading}
              onClick={handleDownload}
            >
              <Icon name="download" size="sm" /> Descargar métricas
            </Button>
          }
        />
      </Card>

      <MetricStrip items={metrics} />

      <div className="comunicaciones-kpi__charts">
        <Card className="comunicaciones-kpi__chart">
          <h3>Tendencia de gestiones nuevas (últimos 7 días)</h3>
          <div className="comunicaciones-kpi__chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.tendencia} margin={{ left: 0, right: 20 }}>
                <defs>
                  <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Gestiones nuevas"
                  stroke="var(--primary)"
                  fillOpacity={1}
                  fill="url(#colorTendencia)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="comunicaciones-kpi__chart">
          <h3>Top unidades más requeridas</h3>
          <div className="comunicaciones-kpi__chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_unidad} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={150}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: 'var(--bg)' }} />
                <Bar
                  dataKey="value"
                  name="Gestiones"
                  fill="var(--accent, #ec4899)"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="comunicaciones-kpi__chart">
          <h3>Carga de trabajo activa (pendiente + en proceso)</h3>
          <div className="comunicaciones-kpi__chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.carga_activa} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={150}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: 'var(--bg)' }} />
                <Bar
                  dataKey="value"
                  name="Gestiones activas"
                  fill="var(--warning, #f59e0b)"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="comunicaciones-kpi__chart">
          <h3>Top establecimientos demandantes</h3>
          <div className="comunicaciones-kpi__chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.by_establecimiento}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  width={150}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: 'var(--bg)' }} />
                <Bar
                  dataKey="value"
                  name="Gestiones"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default MonitoreoKPI
