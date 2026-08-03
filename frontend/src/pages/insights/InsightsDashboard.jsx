import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  FiltersBar,
  Field,
  Select,
  Button,
  Icon,
  ChartCard,
  ChartBar,
  ChartArea,
  ChartPie,
  seriesColor,
  prioritySeriesColor
} from '@slep/ui'

const InsightsDashboard = () => {
  const [rankingData, setRankingData] = useState([])
  const [rankingTitle, setRankingTitle] = useState('Resumen por Subdirección')
  const [timeData, setTimeData] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState('ranking')
  const [module, setModule] = useState('reservas')
  const [ticketStats, setTicketStats] = useState(null)
  const { notify } = useNotify()

  const [recursos, setRecursos] = useState([])
  const [subs, setSubs] = useState([])
  const [depts, setDepts] = useState([])
  const [units, setUnits] = useState([])

  const [resourceType, setResourceType] = useState('')
  const [selectedRecurso, setSelectedRecurso] = useState('')
  const [selectedSub, setSelectedSub] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('')

  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const fetchInitialData = useCallback(async () => {
    try {
      const [r, s, d, u] = await Promise.all([
        api.get('reservas/recursos/'),
        api.get('subdirecciones/'),
        api.get('departamentos/'),
        api.get('unidades/'),
      ])
      setRecursos(r.data.results || r.data)
      setSubs(s.data.results || s.data)
      setDepts(d.data.results || d.data)
      setUnits(u.data.results || u.data)
    } catch (error) {
      console.error('Error fetching dynamic filters:', error)
      notify({
        variant: 'danger',
        text: 'Error al cargar catálogos de filtros.',
      })
    }
  }, [])

  const fetchData = useCallback(
    async ({ withDelay = false } = {}) => {
      setRefreshing(true)
      const delayPromise = withDelay
        ? new Promise((resolve) => setTimeout(resolve, 600))
        : Promise.resolve()

      try {
        if (module === 'reservas') {
          let query = `?type=${resourceType}`
          if (selectedRecurso) query += `&recurso_id=${selectedRecurso}`
          if (selectedSub) query += `&subdireccion_id=${selectedSub}`
          if (selectedDept) query += `&departamento_id=${selectedDept}`
          if (selectedUnit) query += `&unidad_id=${selectedUnit}`

          const [resRanking, resTime] = await Promise.all([
            api.get(`insights/main/reservations_ranking/${query}`),
            api.get(`insights/main/activity_time/${query}`),
            delayPromise,
          ])
          setRankingData(resRanking.data.main_ranking || [])
          setRankingTitle(resRanking.data.title || 'Ranking')
          setTimeData(resTime.data || [])
        } else {
          let query = '?'
          if (selectedSub) query += `subdireccion_id=${selectedSub}&`
          if (selectedDept) query += `departamento_id=${selectedDept}&`
          if (selectedUnit) query += `unidad_id=${selectedUnit}`

          const [res] = await Promise.all([
            api.get(`insights/main/tickets_summary/${query}`),
            delayPromise,
          ])
          setTicketStats(res.data)
        }
      } catch (error) {
        console.error('Error fetching insights:', error)
        notify({
          variant: 'danger',
          text: 'Error al cargar indicadores.',
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      module,
      resourceType,
      selectedRecurso,
      selectedSub,
      selectedDept,
      selectedUnit,
    ],
  )

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleReloadAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchInitialData(), fetchData({ withDelay: true })])
    } catch (error) {
      console.error('Error reloading all data:', error)
      notify({
        variant: 'danger',
        text: 'Error al actualizar los indicadores.',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const clearFilters = () => {
    setSelectedSub('')
    setSelectedDept('')
    setSelectedUnit('')
    setResourceType('')
    setSelectedRecurso('')
  }

  const activeFilterCount =
    (resourceType ? 1 : 0) +
    (selectedRecurso ? 1 : 0) +
    (selectedSub ? 1 : 0) +
    (selectedDept ? 1 : 0) +
    (selectedUnit ? 1 : 0)

  const filteredRecursos = useMemo(
    () => recursos.filter((r) => !resourceType || r.tipo === resourceType),
    [recursos, resourceType],
  )

  const filteredDepts = useMemo(
    () =>
      depts.filter(
        (d) => !selectedSub || d.subdireccion === parseInt(selectedSub, 10),
      ),
    [depts, selectedSub],
  )

  const filteredUnits = useMemo(
    () =>
      units.filter(
        (u) => !selectedDept || u.departamento === parseInt(selectedDept, 10),
      ),
    [units, selectedDept],
  )

  const yAxisWidth = isNarrow ? 96 : 130

  return (
    <div
      className="page"
      data-od-id="insights-dashboard-page"
      data-charts
      {...(!isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="chart-bar"
        title="Indicadores"
        description="Análisis de gestión por áreas · Reservas y Tickets"
        breadcrumbs={[{ label: 'Soporte TI' }, { label: 'Indicadores' }]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleReloadAll}
              disabled={refreshing}
            >
              <Icon
                name="activity"
                size="sm"
                className={refreshing ? 'insights-spin' : undefined}
              />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </Button>
          </>
        }
      />

      

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Módulo de indicadores">
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${module === 'reservas' ? ' is-active' : ''}`}
              aria-selected={module === 'reservas'}
              onClick={() => setModule('reservas')}
            >
              Reservas
            </button>
          </li>
          <li>
            <button
              type="button"
              role="tab"
              className={`tabs__btn${module === 'tickets' ? ' is-active' : ''}`}
              aria-selected={module === 'tickets'}
              onClick={() => setModule('tickets')}
            >
              Tickets
            </button>
          </li>
        </ul>
      </div>

      <div className="tabs__panel is-active insights-tab-panel" role="tabpanel">
        <FiltersBar
          onClear={clearFilters}
          activeCount={activeFilterCount}
          advanced={
            module === 'reservas' ? (
              <>
                <Field label="Tipo de recurso" htmlFor="ins-tipo">
                  <Select
                    id="ins-tipo"
                    value={resourceType}
                    onChange={(e) => {
                      setResourceType(e.target.value)
                      setSelectedRecurso('')
                    }}
                  >
                    <option value="">Todo</option>
                    <option value="SALA">Sala</option>
                    <option value="VEHICULO">Vehículo</option>
                  </Select>
                </Field>
                <Field label="Recurso" htmlFor="ins-recurso">
                  <Select
                    id="ins-recurso"
                    value={selectedRecurso}
                    onChange={(e) => setSelectedRecurso(e.target.value)}
                  >
                    <option value="">Recurso específico…</option>
                    {filteredRecursos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null
          }
        >
          <Field label="Subdirección" htmlFor="ins-sub">
            <Select
              id="ins-sub"
              value={selectedSub}
              onChange={(e) => {
                setSelectedSub(e.target.value)
                setSelectedDept('')
                setSelectedUnit('')
              }}
            >
              <option value="">Toda la subdirección…</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Departamento" htmlFor="ins-dept">
            <Select
              id="ins-dept"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value)
                setSelectedUnit('')
              }}
            >
              <option value="">Todo el depto…</option>
              {filteredDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Unidad" htmlFor="ins-unit">
            <Select
              id="ins-unit"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              <option value="">Toda la unidad…</option>
              {filteredUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </FiltersBar>

        {module === 'reservas' ? (
          <div className="tabs insights-subtabs">
            <ul className="tabs__list" role="tablist" aria-label="Vista de reservas">
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${viewMode === 'ranking' ? ' is-active' : ''}`}
                  aria-selected={viewMode === 'ranking'}
                  onClick={() => setViewMode('ranking')}
                >
                  Rankings
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="tab"
                  className={`tabs__btn${viewMode === 'time' ? ' is-active' : ''}`}
                  aria-selected={viewMode === 'time'}
                  onClick={() => setViewMode('time')}
                >
                  Tendencias
                </button>
              </li>
            </ul>
          </div>
        ) : null}

        <div className="insights-charts-scroll">
          {loading ? (
            <div className="insights-loading">
              <Icon name="activity" size={28} className="insights-spin" />
              <p>Sincronizando indicadores…</p>
            </div>
          ) : module === 'reservas' ? (
            viewMode === 'ranking' ? (
              <div className="insights-charts insights-charts--2">
                <ChartCard title={rankingTitle}>
                  <div className="insights-charts__body">
                    <ChartBar
                      data={rankingData}
                      layout="vertical"
                      categoryKey="label"
                      dataKey="value"
                      seriesName="Reservas"
                      yAxisWidth={yAxisWidth}
                      colorBy={(_, i) => seriesColor(i)}
                    />
                  </div>
                </ChartCard>

                <ChartCard title="Distribución relativa">
                  <div className="insights-charts__body">
                    <ChartPie
                      data={rankingData}
                      donut
                      showLabel
                      nameKey="label"
                      dataKey="value"
                      colorBy={(_, i) => seriesColor(i + 1)}
                    />
                  </div>
                </ChartCard>
              </div>
            ) : (
              <div className="insights-charts insights-charts--1">
                <ChartCard
                  title="Tendencia de actividad"
                  className="insights-charts__card--tall"
                >
                  <div className="insights-charts__body insights-charts__body--tall">
                    <ChartArea
                      data={timeData}
                      categoryKey="day"
                      dataKey="value"
                      seriesName="Actividad"
                    />
                  </div>
                </ChartCard>
              </div>
            )
          ) : (
            <div className="insights-tickets">
              <div className="insights-charts insights-charts--3">
                <ChartCard title="Por categoría">
                  <div className="insights-charts__body">
                    <ChartPie
                      data={ticketStats?.by_category || []}
                      donut
                      showLabel
                      label={({ percent }) =>
                        percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                      }
                      colorBy={(_, i) => seriesColor(i)}
                    />
                  </div>
                </ChartCard>

                <ChartCard title="Estado de solicitudes">
                  <div className="insights-charts__body">
                    <ChartBar
                      data={ticketStats?.by_status || []}
                      layout="horizontal"
                      barSize={32}
                      seriesName="Tickets"
                      colorBy={(_, i) => seriesColor(i + 2)}
                    />
                  </div>
                </ChartCard>

                <ChartCard title="Nivel de prioridad">
                  <div className="insights-charts__body">
                    <ChartPie
                      data={ticketStats?.by_priority || []}
                      colorBy={(entry) => prioritySeriesColor(entry.label)}
                    />
                  </div>
                </ChartCard>
              </div>

              <div className="insights-charts insights-charts--demand">
                <ChartCard title="Departamentos con mayor demanda">
                  <div className="insights-charts__body">
                    <ChartBar
                      data={ticketStats?.by_department || []}
                      layout="vertical"
                      yAxisWidth={isNarrow ? 100 : 160}
                      seriesName="Tickets"
                      colorBy={() => seriesColor(0)}
                    />
                  </div>
                </ChartCard>

                <ChartCard title="Resolución promedio (horas)">
                  <div className="insights-charts__body">
                    <ChartBar
                      data={ticketStats?.avg_time_by_priority || []}
                      layout="horizontal"
                      barSize={32}
                      seriesName="Promedio"
                      valueFormatter={(v) => `${v} hrs`}
                      colorBy={(entry) => prioritySeriesColor(entry.label)}
                    />
                  </div>
                </ChartCard>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InsightsDashboard
