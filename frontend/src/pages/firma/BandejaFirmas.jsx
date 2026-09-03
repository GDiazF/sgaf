import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../hooks/useNotify'
import FirmarPendienteModal from './FirmarPendienteModal'
import DocumentViewerModal from '../../components/common/DocumentViewerModal'
import { fetchPendientePdfBlob } from '../../utils/firmaPendientePdf'
import {
  PageHeader,
  DataTable,
  Badge,
  Button,
  EmptyState,
  Field,
  Textarea,
  Modal,
} from '@slep/ui'

const TABS = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'firmado', label: 'Firmados' },
  { id: 'rechazado', label: 'Rechazados' },
]

const ORIGEN_LABEL = {
  rc: 'Recepción conforme',
  prueba: 'Prueba',
  contrato: 'Contrato',
}

function formatFecha(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return iso
  }
}

export default function BandejaFirmas() {
  const { user } = useAuth()
  const { notify } = useNotify()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState('pendiente')
  const [counts, setCounts] = useState({ pendiente: 0, firmado: 0, rechazado: 0 })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [firmarTarget, setFirmarTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [revisandoId, setRevisandoId] = useState(null)
  const [revisarState, setRevisarState] = useState(null)

  const fetchCounts = useCallback(async () => {
    try {
      const { data } = await api.get('firma-digital/pendientes/contadores/')
      setCounts(data)
    } catch {
      /* ignore */
    }
  }, [])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('firma-digital/pendientes/', {
        params: { estado: tab, page_size: 50 },
      })
      setRows(data.results || (Array.isArray(data) ? data : []))
    } catch (err) {
      setRows([])
      notify({
        variant: 'danger',
        text: err?.response?.data?.error || 'No se pudo cargar la bandeja.',
      })
    } finally {
      setLoading(false)
    }
  }, [tab, notify])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  // Deep-link desde la campana: /firma?pendiente=ID
  useEffect(() => {
    const raw = searchParams.get('pendiente')
    if (!raw || loading) return
    const id = Number(raw)
    if (!Number.isFinite(id)) return

    const clearParam = () => {
      const next = new URLSearchParams(searchParams)
      next.delete('pendiente')
      setSearchParams(next, { replace: true })
    }

    const inRows = rows.find((r) => r.id === id)
    if (inRows) {
      if (tab === 'pendiente' && inRows.estado === 'pendiente') {
        setFirmarTarget(inRows)
      }
      clearParam()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get(`firma-digital/pendientes/${id}/`)
        if (cancelled || !data) return
        if (data.estado === 'pendiente') {
          setTab('pendiente')
          setFirmarTarget(data)
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) clearParam()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams, setSearchParams, rows, loading, tab])

  const closeRevisar = () => {
    setRevisarState((prev) => {
      if (prev?.pdfUrl) {
        window.URL.revokeObjectURL(prev.pdfUrl)
      }
      return null
    })
    setRevisandoId(null)
  }

  const handleRevisar = async (item) => {
    setRevisandoId(item.id)
    setRevisarState({ item, loading: true, pdfUrl: null, error: null })
    try {
      const blob = await fetchPendientePdfBlob(item, api)
      const pdfUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      setRevisarState({ item, loading: false, pdfUrl, error: null })
    } catch (err) {
      const msg =
        err?.message ||
        err?.response?.data?.error ||
        'No se pudo abrir el documento.'
      setRevisarState({ item, loading: false, pdfUrl: null, error: msg })
      notify({ variant: 'danger', text: msg })
    } finally {
      setRevisandoId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setRejecting(true)
    try {
      await api.post(`firma-digital/pendientes/${rejectTarget.id}/rechazar/`, {
        motivo,
      })
      notify({ variant: 'success', text: 'Documento rechazado.' })
      setRejectTarget(null)
      setMotivo('')
      window.dispatchEvent(new Event('refresh-notifications'))
      fetchCounts()
      fetchRows()
    } catch (err) {
      notify({
        variant: 'danger',
        text: err?.response?.data?.error || 'No se pudo rechazar.',
      })
    } finally {
      setRejecting(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: 'codigo_interno',
        header: 'Código',
        className: 'col--primary',
        cardRole: 'title',
        priority: 1,
      },
      {
        key: 'titulo',
        header: 'Documento',
        className: 'col--secondary',
        cardRole: 'subtitle',
        priority: 1,
      },
      {
        key: 'origen',
        header: 'Origen',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => ORIGEN_LABEL[item.origen] || item.origen,
      },
      {
        key: 'creado_en',
        header: tab === 'firmado' ? 'Firmado' : tab === 'rechazado' ? 'Rechazado' : 'Solicitado',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) =>
          formatFecha(
            tab === 'firmado'
              ? item.firmado_en
              : tab === 'rechazado'
                ? item.rechazado_en
                : item.creado_en,
          ),
      },
      {
        key: 'extra',
        header: tab === 'firmado' ? 'Validación' : tab === 'rechazado' ? 'Motivo' : 'Solicitado por',
        className: 'col--tablet-hide',
        cardRole: 'field',
        priority: 2,
        render: (item) => {
          if (tab === 'firmado') {
            return item.codigo_validacion ? (
              <Link to={`/validar/${item.codigo_validacion}`}>{item.codigo_validacion}</Link>
            ) : (
              '—'
            )
          }
          if (tab === 'rechazado') return item.motivo_rechazo || '—'
          return item.solicitado_por_nombre || '—'
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        className: 'col--actions',
        render: (item) =>
          tab === 'pendiente' ? (
            <div className="data-table__actions">
              <Button
                variant="outline"
                size="sm"
                loading={revisandoId === item.id}
                disabled={revisandoId === item.id}
                onClick={() => handleRevisar(item)}
              >
                Revisar
              </Button>
              <Button variant="primary" size="sm" onClick={() => setFirmarTarget(item)}>
                Firmar
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRejectTarget(item)}>
                Rechazar
              </Button>
            </div>
          ) : tab === 'firmado' && item.codigo_validacion ? (
            <div className="data-table__actions">
              <Button
                variant="outline"
                size="sm"
                loading={revisandoId === item.id}
                disabled={revisandoId === item.id}
                onClick={() => handleRevisar(item)}
              >
                Revisar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/validar/${item.codigo_validacion}`, '_blank')}
              >
                Validar
              </Button>
            </div>
          ) : tab === 'rechazado' ? (
            <Button
              variant="outline"
              size="sm"
              loading={revisandoId === item.id}
              disabled={revisandoId === item.id}
              onClick={() => handleRevisar(item)}
            >
              Revisar
            </Button>
          ) : null,
      },
    ],
    [tab, revisandoId],
  )

  if (!user?.puede_firmar && !user?.is_superuser) {
    return (
      <div className="page">
        <EmptyState
          title="Sin acceso"
          description="No está autorizado a la bandeja de firmas."
        />
      </div>
    )
  }

  return (
    <div className="page" data-od-id="bandeja-firmas-page">
      <PageHeader
        icon="file-check"
        title="Bandeja de firmas"
        description="Documentos asignados a usted para firma digital (Propósito General + OTP)"
        breadcrumbs={[{ label: 'Firma digital' }, { label: 'Bandeja' }]}
        linkComponent={Link}
        split
        actions={
          <Button variant="secondary" size="sm" onClick={() => window.location.assign('/validar')}>
            Validador público
          </Button>
        }
      />

      <div className="tabs">
        <ul className="tabs__list" role="tablist" aria-label="Estados de firma">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`tabs__btn${tab === t.id ? ' is-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}{' '}
                <Badge variant={t.id === 'pendiente' ? 'warning' : 'neutral'}>
                  {counts[t.id] ?? 0}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        totalCount={rows.length}
        emptyTitle={
          tab === 'pendiente'
            ? 'Sin pendientes'
            : tab === 'firmado'
              ? 'Sin firmados'
              : 'Sin rechazados'
        }
        emptyDescription="No hay documentos en esta pestaña."
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        toolbar={
          <div className="table-toolbar__left">
            <span className="table-toolbar__title">
              {TABS.find((t) => t.id === tab)?.label}
            </span>
          </div>
        }
      />

      <FirmarPendienteModal
        open={Boolean(firmarTarget)}
        pendiente={firmarTarget}
        onClose={() => setFirmarTarget(null)}
        onFirmado={() => {
          setFirmarTarget(null)
          window.dispatchEvent(new Event('refresh-notifications'))
          fetchCounts()
          fetchRows()
        }}
      />

      <DocumentViewerModal
        open={Boolean(revisarState?.pdfUrl)}
        onClose={closeRevisar}
        title="Revisar documento"
        subtitle={revisarState?.item?.titulo || revisarState?.item?.codigo_interno}
        documentType="PDF"
        fileUrl={revisarState?.pdfUrl}
      />

      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => {
          if (!rejecting) {
            setRejectTarget(null)
            setMotivo('')
          }
        }}
        size="md"
        title="Rechazar documento"
        subheader={rejectTarget?.titulo}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              disabled={rejecting}
              onClick={() => {
                setRejectTarget(null)
                setMotivo('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              type="button"
              loading={rejecting}
              disabled={rejecting || motivo.trim().length < 5}
              onClick={handleReject}
            >
              Confirmar rechazo
            </Button>
          </>
        }
      >
        <Field label="Motivo" required htmlFor="rechazo-motivo">
          <Textarea
            id="rechazo-motivo"
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique por qué rechaza la firma…"
          />
        </Field>
      </Modal>
    </div>
  )
}
