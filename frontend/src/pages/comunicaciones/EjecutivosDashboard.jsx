import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'
import { useNotify } from '../../hooks/useNotify'
import { DataTable, Badge, Button, Icon } from '@slep/ui'

const EjecutivoDashboard = () => {
  const navigate = useNavigate()
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const { notify } = useNotify()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const fetchMisEstablecimientos = async () => {
      setLoading(true)
      try {
        const res = await api.get('ejecutivos/asignaciones/mis_asignaciones/')
        const data = res.data.results || res.data
        setAsignaciones(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error(error)
        setAsignaciones([])
        notify({
          variant: 'danger',
          text: 'No se pudieron cargar tus establecimientos.',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchMisEstablecimientos()
  }, [notify])

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return asignaciones.slice(start, start + pageSize)
  }, [asignaciones, currentPage, pageSize])

  const columns = useMemo(
    () => [
      {
        key: 'establecimiento',
        header: 'Establecimiento',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
        render: (item) => item.establecimiento_details?.nombre || '—',
      },
      {
        key: 'rbd',
        header: 'RBD',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 2,
        render: (item) => item.establecimiento_details?.rbd ?? '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        className: 'col--status',
        cardRole: 'status',
        priority: 1,
        render: (item) => (
          <Badge variant={item.vigente !== false ? 'success' : 'danger'}>
            {item.vigente !== false ? 'Vigente' : 'Inactivo'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) => {
          const id = item.establecimiento_details?.id
          if (!id) return null
          return (
            <div className="data-table__actions" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                title="Gestionar"
                onClick={() => navigate(`/comunicaciones/ejecutivos/gestion/${id}`)}
              >
                <Icon name="eye" size="sm" />
              </Button>
            </div>
          )
        },
      },
    ],
    [navigate],
  )

  return (
    <>
      

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        totalCount={asignaciones.length}
        emptyTitle="Sin establecimientos"
        emptyDescription="No tienes establecimientos asignados."
        fillViewport
        page={currentPage}
        pageSize={pageSize}
        pageSizeId="com-mis-est-page-size"
        pageSizeOptions={[10, 25, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(n) => {
          setPageSize(n)
          setCurrentPage(1)
        }}
        mobileCardActions={(item) => {
          const id = item.establecimiento_details?.id
          if (!id) return undefined
          return {
            primary: {
              label: 'Gestionar',
              onClick: () => navigate(`/comunicaciones/ejecutivos/gestion/${id}`),
            },
          }
        }}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">Mis establecimientos</span>
            <Badge variant="neutral">{asignaciones.length}</Badge>
          </div>
        }
      />
    </>
  )
}

export default EjecutivoDashboard
