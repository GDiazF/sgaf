import React, { useState, useEffect, useRef } from 'react'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import { Button, EmptyState, formatApiFormError } from '@slep/ui'
import ServicioDetailPage from './ServicioDetailPage'

const tipoEsTransporte = (tipo) =>
  Boolean(tipo?.es_transporte) || (tipo?.nombre || '').toLowerCase().includes('transporte')

const ContratoServiciosTab = ({ contract }) => {
  const { can } = usePermission()
  const { notify } = useNotify()
  const [gestion, setGestion] = useState(null)
  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(true)
  const [initId, setInitId] = useState(null)
  const autoStarted = useRef(false)

  const contractId = contract?.id

  useEffect(() => {
    if (!contractId) return
    let cancelled = false
    const load = async () => {
      try {
        const [servRes, tiposRes] = await Promise.all([
          api.get(`contratos/servicios/?contrato=${contractId}`),
          api.get('contratos/tipos-servicios/'),
        ])
        if (cancelled) return
        const list = servRes.data.results || servRes.data || []
        setGestion(list[0] || null)
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
  }, [contractId])

  const tipoTransporte = tipos.find((t) => tipoEsTransporte(t))
  const tipoOtro = tipos.find((t) => !tipoEsTransporte(t))

  const initGestion = async (tipo, plantilla) => {
    if (!tipo || !contractId) return
    setInitId(tipo.id)
    try {
      if (plantilla && plantilla !== contract.plantilla_cobro) {
        await api.patch(`contratos/contratos/${contractId}/`, {
          plantilla_cobro: plantilla,
        })
      } else if (contract.plantilla_cobro) {
        await api.patch(`contratos/contratos/${contractId}/`, {
          plantilla_cobro: contract.plantilla_cobro,
        })
      }
      const servRes = await api.get(`contratos/servicios/?contrato=${contractId}`)
      const list = servRes.data.results || servRes.data || []
      if (list[0]) {
        setGestion(list[0])
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
      })
      setGestion(res.data)
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

  if (gestion?.id) {
    return (
      <ServicioDetailPage servicioId={gestion.id} embedded contract={contract} />
    )
  }

  if (loading || initId) {
    return <EmptyState title="Cargando…" description="Abriendo la gestión del contrato." />
  }

  if (!can('contratos.add_rutatransporte')) {
    return (
      <EmptyState
        title="Sin plantilla de cobro"
        description="Este contrato anterior no tiene definida la forma de calcular el gasto. Un editor puede indicarla al editar el contrato."
      />
    )
  }

  return (
    <EmptyState
      title="Cómo se cobra este contrato"
      description="Contrato creado antes de esta plantilla. Elija una vez Transporte u Otro; queda guardado en el contrato."
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
                })
                const servRes = await api.get(`contratos/servicios/?contrato=${contractId}`)
                const list = servRes.data.results || servRes.data || []
                if (list[0]) {
                  const patched = await api.patch(`contratos/servicios/${list[0].id}/`, {
                    modalidad_cobro: 'MENSUAL_FIJO_VARIABLE',
                  })
                  setGestion(patched.data)
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
                })
                setGestion(res.data)
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
