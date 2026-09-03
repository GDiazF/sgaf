import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import { EmptyState } from '@slep/ui'

const ContractNewPage = () => {
  const navigate = useNavigate()
  const { notify } = useNotify()

  useEffect(() => {
    let cancelled = false
    const create = async () => {
      try {
        const res = await api.post('contratos/contratos/crear-borrador/')
        if (!cancelled) {
          navigate(`/contracts/${res.data.id}/edit`, { replace: true })
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          notify({ variant: 'danger', text: 'No se pudo crear el borrador.' })
          navigate('/contracts', { replace: true })
        }
      }
    }
    create()
    return () => {
      cancelled = true
    }
  }, [navigate, notify])

  return (
    <div className="page">
      <EmptyState title="Preparando formulario…" description="Creando borrador de contrato." />
    </div>
  )
}

export default ContractNewPage
