import React, { useState, useEffect, useRef, useCallback } from 'react'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  formatApiFormError,
} from '@slep/ui'
import ServicioDetailPage from './ServicioDetailPage'

const tipoEsTransporte = (tipo) =>
  Boolean(tipo?.es_transporte) || (tipo?.nombre || '').toLowerCase().includes('transporte')

const PLANTILLA_LABEL = {
  TRANSPORTE: 'Transporte (diario)',
  OTRO: 'Otro (mensual)',
  VOLUMETRICO: 'Volumétrico (m³)',
}

const formatArchivada = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-CL')
  } catch {
    return String(value)
  }
}

const ContratoServiciosTab = ({ contract }) => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const [gestion, setGestion] = useState(null)
  const [historial, setHistorial] = useState([])
  const [historialId, setHistorialId] = useState(null)
  const [tab, setTab] = useState('activa') // activa | historial
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [initId, setInitId] = useState(null)
  const autoStarted = useRef(false)

  const contractId = contract?.id

  const loadGestiones = useCallback(async () => {
    if (!contractId) return
    const [activaRes, histRes] = await Promise.all([
      api.get(`contratos/servicios/?contrato=${contractId}&activa=true`),
      api.get(`contratos/servicios/?contrato=${contractId}&activa=false`),
    ])
    const activas = activaRes.data.results || activaRes.data || []
    const archivadas = histRes.data.results || histRes.data || []
    setGestion(activas[0] || null)
    setHistorial(
      [...archivadas].sort((a, b) => {
        const ta = a.archivada_en ? new Date(a.archivada_en).getTime() : 0
        const tb = b.archivada_en ? new Date(b.archivada_en).getTime() : 0
        return tb - ta
      }),
    )
  }, [contractId])

  useEffect(() => {
    if (!contractId) return
    let cancelled = false
    const load = async () => {
      try {
        const [tiposRes] = await Promise.all([
          api.get('contratos/tipos-servicios/'),
          loadGestiones(),
        ])
        if (cancelled) return
        setTipos(tiposRes.data.results || tiposRes.data || [])
      } catch (error) {
        console.error(error)
        notify({ variant: 'danger', text: 'No se pudo cargar la gestión operativa.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [contractId, loadGestiones, notify])

  // Si el contrato cambia de plantilla (p. ej. tras editar), refrescar gestiones
  useEffect(() => {
    if (!contractId || loading) return
    loadGestiones().catch(() => {})
  }, [contract?.plantilla_cobro, contractId, loading, loadGestiones])

  const tipoTransporte = tipos.find((t) => tipoEsTransporte(t))
  const tipoOtro = tipos.find((t) => !tipoEsTransporte(t))

  const initGestion = async (tipo, plantilla) => {
    if (!tipo || !contractId) return
    setInitId(tipo.id)
    try {
      if (plantilla && plantilla !== contract.plantilla_cobro) {
        await api.patch(`contratos/contratos/${contractId}/`, {
          plantilla_cobro: plantilla,
          confirmar_cambio_plantilla: true,
        })
      } else if (contract.plantilla_cobro) {
        await api.patch(`contratos/contratos/${contractId}/`, {
          plantilla_cobro: contract.plantilla_cobro,
        })
      }
      await loadGestiones()
      const servRes = await api.get(`contratos/servicios/?contrato=${contractId}&activa=true`)
      const list = servRes.data.results || servRes.data || []
      if (list[0]) {
        setGestion(list[0])
        setTab('activa')
        return
      }
      const res = await api.post('contratos/servicios/', {
        contrato: contractId,
        nombre: contract.codigo_mercado_publico || contract.descripcion || 'Gestión operativa',
        tipo_servicio: tipo.id,
        modalidad_cobro: tipoEsTransporte(tipo)
          ? 'DIARIO'
          : plantilla === 'VOLUMETRICO'
            ? 'POR_M3'
            : 'MENSUAL_POR_EST',
        plantilla_cobro: plantilla || contract.plantilla_cobro || null,
      })
      setGestion(res.data)
      setTab('activa')
    } catch (err) {
      notify({
        variant: 'danger',
        text: formatApiFormError(err, 'No se pudo abrir la gestión.'),
      })
    } finally {
      setInitId(null)
    }
  }

  useEffect(() => {
    if (loading || gestion || autoStarted.current || !contract?.plantilla_cobro) return
    const tipo =
      contract.plantilla_cobro === 'TRANSPORTE' ? tipoTransporte : tipoOtro
    if (!tipo) return
    autoStarted.current = true
    initGestion(tipo, contract.plantilla_cobro)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gestion, contract?.plantilla_cobro, tipoTransporte, tipoOtro])

  const historialSeleccionada =
    historial.find((h) => Number(h.id) === Number(historialId)) || null

  if (gestion?.id || historial.length > 0) {
    return (
      <div className="contracts-gestion-wrap">
        <div className="contracts-gestion-tabs" role="tablist" aria-label="Gestión operativa">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'activa'}
            className={`contracts-gestion-tabs__btn${tab === 'activa' ? ' is-active' : ''}`}
            onClick={() => {
              setTab('activa')
              setHistorialId(null)
            }}
          >
            Activa
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'historial'}
            className={`contracts-gestion-tabs__btn${tab === 'historial' ? ' is-active' : ''}`}
            onClick={() => setTab('historial')}
            disabled={historial.length === 0}
          >
            Historial
            {historial.length > 0 ? (
              <Badge variant="neutral">{historial.length}</Badge>
            ) : null}
          </button>
        </div>

        {tab === 'activa' && gestion?.id ? (
          <>
            <Alert variant="info" title="Gestión operativa">
              1) Líneas o rutas · 2) Abrir y cargar el periodo del mes · 3) Emitir recepción desde la
              pestaña Recepciones (o desde General).
            </Alert>
            <ServicioDetailPage
              key={`activa-${gestion.id}`}
              servicioId={gestion.id}
              embedded
              contract={contract}
            />
          </>
        ) : null}

        {tab === 'activa' && !gestion?.id ? (
          <EmptyState
            title="Sin gestión activa"
            description="Elija una plantilla de cobro en el contrato o inicie una gestión nueva."
          />
        ) : null}

        {tab === 'historial' ? (
          <div className="contracts-gestion-historial">
            <Alert variant="warning" title="Historial (solo lectura)">
              Gestiones archivadas al cambiar la plantilla de cobro. No se pueden editar ni generar
              cobros nuevos desde aquí.
            </Alert>
            <div className="contracts-gestion-historial__list">
              {historial.map((h) => {
                const selected = Number(historialId) === Number(h.id)
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`contracts-gestion-historial__item${selected ? ' is-selected' : ''}`}
                    onClick={() => setHistorialId(h.id)}
                  >
                    <strong>
                      {PLANTILLA_LABEL[h.plantilla_cobro] ||
                        h.modalidad_cobro ||
                        h.nombre ||
                        `Gestión #${h.id}`}
                    </strong>
                    <span>Archivada: {formatArchivada(h.archivada_en)}</span>
                  </button>
                )
              })}
            </div>
            {historialSeleccionada ? (
              <ServicioDetailPage
                key={`hist-${historialSeleccionada.id}`}
                servicioId={historialSeleccionada.id}
                embedded
                contract={contract}
                readOnly
              />
            ) : (
              <EmptyState
                title="Seleccione una gestión"
                description="Elija un ítem del historial para ver rutas y periodos en solo lectura."
              />
            )}
          </div>
        ) : null}
      </div>
    )
  }

  if (loading || initId) {
    return <EmptyState title="Cargando…" description="Abriendo la gestión del contrato." />
  }

  if (!can('contratos.add_rutatransporte')) {
    return (
      <EmptyState
        title="Sin plantilla de cobro"
        description="No tiene permiso para iniciar la gestión operativa."
      />
    )
  }

  return (
    <EmptyState
      title="Iniciar gestión operativa"
      description="Elija cómo se cobrará este contrato. Luego podrá cargar rutas o establecimientos."
      action={
        <>
          <Button
            variant="primary"
            size="sm"
            disabled={!!initId || !tipoTransporte}
            loading={initId === tipoTransporte?.id}
            onClick={() => initGestion(tipoTransporte, 'TRANSPORTE')}
          >
            Transporte · valor diario
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!!initId || !tipoOtro}
            loading={initId === tipoOtro?.id}
            onClick={() => initGestion(tipoOtro, 'OTRO')}
          >
            Otro · monto mensual
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!!initId || !tipoOtro}
            loading={initId === `${tipoOtro?.id}-volumetrico`}
            onClick={() => initGestion(tipoOtro, 'VOLUMETRICO')}
          >
            Volumétrico · $/m³
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!!initId || !tipoOtro}
            loading={initId === `${tipoOtro?.id}-mixto`}
            onClick={async () => {
              if (!tipoOtro || !contractId) return
              setInitId(`${tipoOtro.id}-mixto`)
              try {
                await api.patch(`contratos/contratos/${contractId}/`, {
                  plantilla_cobro: 'OTRO',
                  confirmar_cambio_plantilla: true,
                })
                await loadGestiones()
                const servRes = await api.get(
                  `contratos/servicios/?contrato=${contractId}&activa=true`,
                )
                const list = servRes.data.results || servRes.data || []
                if (list[0]) {
                  const patched = await api.patch(`contratos/servicios/${list[0].id}/`, {
                    modalidad_cobro: 'MENSUAL_FIJO_VARIABLE',
                  })
                  setGestion(patched.data)
                  setTab('activa')
                  return
                }
                const res = await api.post('contratos/servicios/', {
                  contrato: contractId,
                  nombre:
                    contract.codigo_mercado_publico ||
                    contract.descripcion ||
                    'Gestión operativa',
                  tipo_servicio: tipoOtro.id,
                  modalidad_cobro: 'MENSUAL_FIJO_VARIABLE',
                  plantilla_cobro: 'OTRO',
                })
                setGestion(res.data)
                setTab('activa')
              } catch (err) {
                notify({
                  variant: 'danger',
                  text: formatApiFormError(err, 'No se pudo abrir la gestión.'),
                })
              } finally {
                setInitId(null)
              }
            }}
          >
            Otro · fijo y/o variable
          </Button>
        </>
      }
    />
  )
}

export default ContratoServiciosTab
