import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import { DataTable, Badge, Button, EmptyState, Alert, Icon } from '@slep/ui'

const ContratoServiciosTab = ({ contractId }) => {
  const navigate = useNavigate()
  const [servicios, setServicios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const servRes = await api.get(`contratos/servicios/?contrato=${contractId}`)
        setServicios(servRes.data.results || servRes.data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchServicios()
  }, [contractId])

  const columns = [
    {
      key: 'nombre',
      header: 'Operativo',
      className: 'col--primary',
      cardRole: 'title',
      priority: 1,
    },
    {
      key: 'tipo',
      header: 'Tipo',
      className: 'col--status',
      cardRole: 'status',
      priority: 1,
      render: (item) => (
        <Badge variant="accent">{item.tipo_servicio_nombre || '—'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      className: 'col--actions',
      render: (item) => (
        <div className="data-table__actions">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/contracts/servicios/${item.id}`)}
          >
            Abrir centro
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return <EmptyState title="Cargando…" description="Buscando gestión operativa." />
  }

  if (!servicios.length) {
    return (
      <EmptyState
        title="Sin contratos operativos"
        description="Este contrato aún no tiene gestión operativa vinculada."
        action={
          <Link to="/contracts/servicios" className="btn btn--primary btn--sm">
            <Icon name="plus" size="sm" /> Ir a Gestión de rutas
          </Link>
        }
      />
    )
  }

  return (
    <div className="contracts-tab">
      <Alert variant="info" title="Nota">
        El apartado operativo gestiona asistencia, periodos y multas. Para crear una
        nueva gestión usá el módulo Gestión de rutas del menú.
      </Alert>
      <DataTable
        columns={columns}
        rows={servicios}
        totalCount={servicios.length}
        emptyTitle="Sin operativos"
        fillViewport={false}
        showFooter={false}
        pageSizeId="serv-link-page"
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Gestión operativa</span>
            <Badge variant="neutral">{servicios.length}</Badge>
          </div>
        }
        mobileCardActions={(item) => ({
          primary: {
            label: 'Abrir',
            onClick: () => navigate(`/contracts/servicios/${item.id}`),
          },
        })}
      />
    </div>
  )
}

export default ContratoServiciosTab
