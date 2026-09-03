import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { useNotify } from '../../hooks/useNotify'
import ContractForm from '../../components/contracts/ContractForm'
import {
  prepareContractPayload,
  contractToFormData,
  contractLabel,
} from '../../utils/contractForm'
import {
  PageHeader,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Icon,
  FormOverlay,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const ContractDraftPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermission()
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const [loading, setLoading] = useState(true)
  const [contract, setContract] = useState(null)
  const [formData, setFormData] = useState(null)
  const [lookups, setLookups] = useState({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const skipAutosave = useRef(true)
  const formDataRef = useRef(null)
  const lastSavedPayloadRef = useRef('')
  const notifyRef = useRef(notify)
  const autosaveErrorNotified = useRef(false)
  const savingRef = useRef(false)
  notifyRef.current = notify

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      skipAutosave.current = true
      try {
        const [contractRes, procRes, estRes, catRes, oriRes, provRes, setupsRes, typesRes] =
          await Promise.all([
            api.get(`contratos/contratos/${id}/`),
            api.get('contratos/procesos/'),
            api.get('contratos/estados/'),
            api.get('contratos/categorias/'),
            api.get('contratos/orientaciones/'),
            api.get('proveedores/'),
            api.get('establecimientos/', { params: { page_size: 1000, activo: true } }),
            api.get('tipos-establecimiento/'),
          ])

        if (cancelled) return

        const data = contractRes.data
        if (!data.es_borrador) {
          navigate(`/contracts/${id}`, { replace: true })
          return
        }

        const nextForm = contractToFormData(data)
        setContract(data)
        setFormData(nextForm)
        formDataRef.current = nextForm
        lastSavedPayloadRef.current = JSON.stringify(prepareContractPayload(nextForm))
        autosaveErrorNotified.current = false
        setLookups({
          procesos: procRes.data.results || procRes.data,
          estados: estRes.data.results || estRes.data,
          categorias: catRes.data.results || catRes.data,
          orientaciones: oriRes.data.results || oriRes.data,
          proveedores: provRes.data.results || provRes.data,
          establecimientos: setupsRes.data.results || setupsRes.data,
          tiposEstablecimiento: typesRes.data.results || typesRes.data,
        })
        setTimeout(() => {
          if (!cancelled) skipAutosave.current = false
        }, 800)
      } catch (error) {
        if (cancelled) return
        console.error(error)
        notifyRef.current({ variant: 'danger', text: 'No se pudo cargar el borrador.' })
        navigate('/contracts?vista=borradores', { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  useEffect(() => {
    if (!formData || skipAutosave.current) return undefined

    const saveTimer = setTimeout(async () => {
      const payload = prepareContractPayload(formDataRef.current || formData)
      const serialized = JSON.stringify(payload)
      if (serialized === lastSavedPayloadRef.current || savingRef.current) return

      savingRef.current = true
      try {
        await api.patch(`contratos/contratos/${id}/`, payload)
        lastSavedPayloadRef.current = serialized
        autosaveErrorNotified.current = false
      } catch (error) {
        console.error(error)
        if (!autosaveErrorNotified.current) {
          autosaveErrorNotified.current = true
          notifyRef.current({
            variant: 'danger',
            text: 'No se pudieron guardar los cambios del borrador. Revise la conexión e intente de nuevo.',
          })
        }
      } finally {
        savingRef.current = false
      }
    }, 1200)

    return () => clearTimeout(saveTimer)
  }, [formData, id])

  const handlePublish = async () => {
    try {
      // Asegura último estado antes de publicar
      if (formDataRef.current) {
        const payload = prepareContractPayload(formDataRef.current)
        const serialized = JSON.stringify(payload)
        if (serialized !== lastSavedPayloadRef.current) {
          await api.patch(`contratos/contratos/${id}/`, payload)
          lastSavedPayloadRef.current = serialized
        }
      }
      await overlay.run(
        async () => {
          await api.post(
            `contratos/contratos/${id}/publicar/`,
            prepareContractPayload(formDataRef.current || formData),
          )
        },
        {
          successDescription: 'Contrato publicado correctamente.',
          formatError: (err) => formatApiFormError(err),
        },
      )
      notify({ variant: 'success', text: 'Contrato creado correctamente.' })
      navigate(`/contracts/${id}`, { replace: true })
    } catch {
      // FormOverlay muestra el error
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`contratos/contratos/${id}/`)
      notify({ variant: 'success', text: 'Borrador eliminado.' })
      navigate('/contracts?vista=borradores', { replace: true })
    } catch (error) {
      console.error(error)
      notify({ variant: 'danger', text: 'No se pudo eliminar el borrador.' })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="page">
        <EmptyState title="Cargando…" description="Preparando el formulario del borrador." />
      </div>
    )
  }

  if (!contract || !formData) return null

  return (
    <div className="page" data-od-id="contract-draft-page" data-contract-draft>
      <PageHeader
        icon="contratos"
        title={contractLabel(contract)}
        description="Borrador: puede salir y continuar después desde la pestaña Borradores."
        breadcrumbs={[
          { label: 'SSGG' },
          { label: 'Contratos', to: '/contracts?vista=borradores' },
          { label: contractLabel(contract) },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/contracts?vista=borradores')}
            >
              Volver
            </Button>
            {can('contratos.delete_contrato') ? (
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
                <Icon name="trash" size="sm" /> Eliminar borrador
              </Button>
            ) : null}
            {can('contratos.change_contrato') ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                loading={overlay.busy}
                disabled={overlay.busy || overlay.active}
              >
                Crear contrato
              </Button>
            ) : null}
          </>
        }
      />

      <div className="contract-draft-layout">
        <FormOverlay
          className="form-overlay-host--inline"
          status={overlay.status}
          title={overlay.title}
          description={overlay.description}
          onDismiss={overlay.dismiss}
        >
          <Card className="contract-draft-card">
            <ContractForm
              formId="contract-draft-form"
              formData={formData}
              setFormData={setFormData}
              lookups={lookups}
              isDraft
              compactLayout
              editingId={contract.id}
              onSubmit={(e) => e.preventDefault()}
            />
          </Card>
        </FormOverlay>
      </div>
      <ConfirmModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={handleDelete}
        title="Eliminar borrador"
        description={`¿Eliminar ${contractLabel(contract)}? Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        danger
      />
    </div>
  )
}

export default ContractDraftPage
