import React, { useEffect, useState } from 'react'
import {
  Modal,
  Button,
  Field,
  Select,
  FormStatus,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import api from '../../api'

const ContratoPlantillaRecepcionModal = ({ open, onClose, contract, onSaved }) => {
  const overlay = useFormOverlay()
  const [plantillas, setPlantillas] = useState([])
  const [loadingPlantillas, setLoadingPlantillas] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    if (!open) return undefined
    overlay.reset()
    setSelectedId(
      contract?.plantilla_recepcion_servicio
        ? String(contract.plantilla_recepcion_servicio)
        : '',
    )
    setLoadingPlantillas(true)
    api
      .get('documentos/plantillas/', {
        params: {
          proposito: 'recepcion_servicio',
          activa: true,
          page_size: 200,
          ordering: 'nombre',
        },
      })
      .then((res) => {
        setPlantillas(res.data.results || res.data || [])
      })
      .catch(() => {
        setPlantillas([])
      })
      .finally(() => {
        setLoadingPlantillas(false)
      })
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir
  }, [open, contract?.id, contract?.plantilla_recepcion_servicio])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contract?.id) return
    try {
      await overlay.run(
        async () => {
          const payload = {
            plantilla_recepcion_servicio: selectedId ? Number(selectedId) : null,
          }
          const res = await api.patch(`contratos/contratos/${contract.id}/`, payload)
          onSaved?.(res.data)
        },
        {
          successDescription: 'Plantilla de recepción actualizada.',
          formatError: (err) => formatApiFormError(err),
        },
      )
    } catch {
      /* FormOverlay */
    }
  }

  const handleOverlayDismiss = () => {
    if (overlay.status === 'success') {
      overlay.reset()
      onClose({ saved: true })
      return
    }
    overlay.dismiss()
  }

  const handleClose = () => {
    if (overlay.busy) return
    overlay.reset()
    onClose()
  }

  const defaultPlantilla = plantillas.find((p) => p.es_default)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      title="Plantilla de recepción (colegio)"
      subheader={`Contrato ${contract?.codigo_mercado_publico || ''}`}
      {...overlay.modalProps}
      onOverlayDismiss={handleOverlayDismiss}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={overlay.busy}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="contrato-plantilla-rc-form"
            loading={overlay.busy}
            disabled={overlay.busy || overlay.active || loadingPlantillas}
          >
            Guardar
          </Button>
        </>
      }
    >
      <form id="contrato-plantilla-rc-form" className="crud-form" onSubmit={handleSubmit}>
        <FormStatus
          variant="info"
          title="Recepción sin folio"
          description="Define qué plantilla se usa al descargar la recepción de servicio por colegio desde la gestión operativa. No aplica a la ROC de Mercado Público ni al acta de gestión de ruta."
        />
        <Field
          label="Plantilla"
          htmlFor="contrato-plantilla-rc"
          hint={
            defaultPlantilla
              ? `Predeterminada del sistema: «${defaultPlantilla.nombre}».`
              : 'Sin plantilla predeterminada activa en el sistema.'
          }
        >
          <Select
            id="contrato-plantilla-rc"
            value={selectedId}
            disabled={loadingPlantillas || overlay.busy}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">Usar plantilla predeterminada del sistema</option>
            {plantillas.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.nombre}
                {p.es_default ? ' (predeterminada)' : ''}
              </option>
            ))}
          </Select>
        </Field>
        {plantillas.length === 0 && !loadingPlantillas ? (
          <FormStatus
            variant="warning"
            title="Sin plantillas activas"
            description="Cree plantillas con propósito «Recepción de servicio» en Administración → Plantillas de documentos."
          />
        ) : null}
      </form>
    </Modal>
  )
}

export default ContratoPlantillaRecepcionModal
