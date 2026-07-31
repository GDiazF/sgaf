import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  PageHeader,
  Button,
  Card,
  Badge,
  Modal,
  Alert,
  Field,
  Select,
  Input,
  EmptyState,
  Icon,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import { useNotify } from '../../hooks/useNotify'
import api from '../../api'

const MONTH_OPTIONS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const RutaDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { notify } = useNotify()
  const [ruta, setRuta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isGenModalOpen, setIsGenModalOpen] = useState(false)
  const [genData, setGenData] = useState({
    mes: String(new Date().getMonth() + 1),
    anio: String(new Date().getFullYear()),
  })
  const genOverlay = useFormOverlay()

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await api.get(`contratos/rutas/${id}/`)
      setRuta(res.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching ruta detail:', err)
      setError('No se pudo cargar la información de la ruta.')
      notify({ variant: 'danger', text: 'No se pudo cargar la información de la ruta.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const closeGenModal = () => {
    if (genOverlay.busy) return
    genOverlay.reset()
    setIsGenModalOpen(false)
  }

  const handleGenOverlayDismiss = () => {
    if (genOverlay.status === 'success') {
      genOverlay.reset()
      setIsGenModalOpen(false)
      fetchData()
      return
    }
    genOverlay.dismiss()
  }

  const handleGeneratePeriod = async (e) => {
    e.preventDefault()
    try {
      await genOverlay.run(
        async () => {
          await api.post(`contratos/rutas/${id}/generar-periodo/`, {
            mes: Number(genData.mes),
            anio: Number(genData.anio),
          })
        },
        {
          successDescription: 'Periodo generado.',
          formatError: (err) =>
            err.response?.data?.error || formatApiFormError(err, 'Error al generar el periodo.'),
        },
      )
    } catch {
      // El error se muestra en FormOverlay
    }
  }

  if (loading) {
    return (
      <div className="page" data-od-id="ruta-detail-page">
        <EmptyState title="Cargando ruta…" description="Obteniendo configuración y periodos." />
      </div>
    )
  }

  if (error || !ruta) {
    return (
      <div className="page" data-od-id="ruta-detail-page">
        <EmptyState
          title="Error de carga"
          description={error || 'Ruta no encontrada'}
          action={
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Volver atrás
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page contratos-ruta-page" data-od-id="ruta-detail-page">
      <PageHeader
        icon="rutas"
        title={ruta.nombre}
        description="Configuración de ruta y periodos de cobro"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Servicio', to: `/contracts/servicios/${ruta.servicio}` },
          { label: 'Configuración de ruta' },
        ]}
        linkComponent={Link}
        actions={
          <Button type="button" variant="primary" onClick={() => setIsGenModalOpen(true)}>
            <Icon name="plus" size={16} />
            Nuevo periodo de cobro
          </Button>
        }
      />

      <div className="contratos-ruta-page__grid">
        <Card className="contratos-ruta-card">
          <p className="contratos-ruta-card__eyebrow">Información de pago</p>
          <div className="contratos-ruta-card__row">
            <span className="contratos-ruta-card__icon" aria-hidden>
              <Icon name="box" size={20} />
            </span>
            <div>
              <p className="contratos-ruta-card__title">{ruta.proveedor_nombre}</p>
              <p className="contratos-ruta-card__hint">Proveedor asignado</p>
            </div>
          </div>
          <div className="contratos-ruta-card__metric">
            <p className="contratos-ruta-card__hint">Valor por ruta (diaria)</p>
            <p className="contratos-ruta-card__value">
              ${new Intl.NumberFormat('es-CL').format(ruta.valor_diario)}
            </p>
          </div>
        </Card>

        <Card className="contratos-ruta-card">
          <p className="contratos-ruta-card__eyebrow">Reglas de periodo</p>
          <dl className="contratos-ruta-card__rules">
            <div>
              <dt>Día de inicio</dt>
              <dd>Cada {ruta.dia_inicio_periodo}</dd>
            </div>
            <div>
              <dt>Día de término</dt>
              <dd>Cada {ruta.dia_fin_periodo}</dd>
            </div>
          </dl>
          <ul className="contratos-ruta-card__flags">
            <li className={ruta.incluir_fines_semana ? 'is-on' : ''}>
              <Icon name="check" size={14} /> Incluye fines de semana
            </li>
            <li className={ruta.excluir_feriados ? 'is-on' : ''}>
              <Icon name="check" size={14} /> Excluye feriados nacionales
            </li>
          </ul>
        </Card>

        <Card className="contratos-ruta-card">
          <p className="contratos-ruta-card__eyebrow">Establecimientos beneficiarios</p>
          <div className="contratos-ruta-card__chips">
            {ruta.establecimientos_detalle?.map((est) => (
              <span key={est.id} className="contratos-ruta-chip">
                <Icon name="building" size={12} />
                {est.nombre}
              </span>
            ))}
          </div>
        </Card>
      </div>

      <section className="contratos-ruta-periodos">
        <h2 className="contratos-ruta-periodos__title">
          <Icon name="clock" size={18} />
          Historial de periodos de cobro
        </h2>

        {!ruta.periodos || ruta.periodos.length === 0 ? (
          <EmptyState
            title="Sin periodos generados"
            description='Haz clic en "Nuevo periodo" para comenzar el control de este mes.'
          />
        ) : (
          <div className="contratos-ruta-periodos__grid">
            {ruta.periodos.map((periodo) => (
              <Card key={periodo.id} className="contratos-periodo-card">
                <div className="contratos-periodo-card__head">
                  <span className="contratos-ruta-card__icon" aria-hidden>
                    <Icon name="clock" size={18} />
                  </span>
                  <Badge variant={periodo.estado === 'CERRADO' ? 'neutral' : 'success'}>
                    {periodo.estado}
                  </Badge>
                </div>
                <h3 className="contratos-periodo-card__name">{periodo.nombre_estandarizado}</h3>
                <p className="contratos-periodo-card__range">
                  {new Date(periodo.fecha_inicio).toLocaleDateString()} —{' '}
                  {new Date(periodo.fecha_fin).toLocaleDateString()}
                </p>
                <Link to={`/contracts/periodo/${periodo.id}`} className="btn btn--secondary contratos-periodo-card__cta">
                  Abrir calendario
                  <Icon name="chevron-right" size={14} />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={isGenModalOpen}
        onClose={closeGenModal}
        title="Nuevo periodo"
        subheader="Generar fechas automáticamente"
        {...genOverlay.modalProps}
        onOverlayDismiss={handleGenOverlayDismiss}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeGenModal} disabled={genOverlay.busy}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="ruta-gen-periodo-form"
              variant="primary"
              loading={genOverlay.busy}
              disabled={genOverlay.busy || genOverlay.active}
            >
              Generar periodo
            </Button>
          </>
        }
      >
        <form id="ruta-gen-periodo-form" onSubmit={handleGeneratePeriod} className="contratos-gen-form">
          <Alert variant="warning" title="Cálculo automático" className="alert--compact">
            El sistema calculará el rango de fechas (ej: {ruta.dia_inicio_periodo} al{' '}
            {ruta.dia_fin_periodo}) según el mes seleccionado.
          </Alert>
          <div className="contratos-gen-form__row">
            <Field label="Mes">
              <Select
                value={genData.mes}
                onChange={(e) => setGenData({ ...genData, mes: e.target.value })}
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Año">
              <Input
                type="number"
                value={genData.anio}
                onChange={(e) => setGenData({ ...genData, anio: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default RutaDetailPage
