import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { StatusBadge, PriorityBadge } from './ticketBadges'
import {
  PageHeader,
  Button,
  Textarea,
  ConfirmModal,
  EmptyState,
  Card,
  CardHeader,
  DetailItem,
  Icon,
  FormOverlay,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'

const STATUS_ACTIONS = [
  { key: 'EN_PROGRESO', label: 'En progreso' },
  { key: 'RESUELTO', label: 'Resuelto' },
  { key: 'EN_ESPERA', label: 'En espera' },
  { key: 'CERRADO', label: 'Cerrado' },
]

const TicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const chatEndRef = useRef(null)
  const overlay = useFormOverlay()

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTicket = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get(`tickets/tickets/${id}/`)
      setTicket(res.data)
      const sortedMessages = (res.data.mensajes || []).sort(
        (a, b) => new Date(a.fecha) - new Date(b.fecha),
      )
      setMessages(sortedMessages)
      api.post(`tickets/tickets/${id}/registrar_presencia/`).catch(() => {})
    } catch (error) {
      console.error('Error fetching ticket:', error)
      if (!silent) setTicket(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
    const interval = setInterval(() => fetchTicket(true), 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const res = await api.post(`tickets/tickets/${id}/agregar_mensaje/`, {
        mensaje: newMessage.trim(),
      })
      setMessages((prev) => [...prev, res.data])
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const updateStatus = async (newStatus) => {
    if (overlay.busy || isSending) return
    const label = STATUS_ACTIONS.find((s) => s.key === newStatus)?.label || newStatus
    try {
      await overlay.run(
        async () => {
          await api.patch(`tickets/tickets/${id}/`, { estado: newStatus })
          await fetchTicket(true)
        },
        {
          successDescription: `Estado actualizado a «${label}».`,
          formatError: (err) => formatApiFormError(err, 'No se pudo actualizar el estado.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const autoAssign = async () => {
    if (overlay.busy) return
    try {
      await overlay.run(
        async () => {
          await api.post(`tickets/tickets/${id}/auto_asignar/`)
          await fetchTicket(true)
        },
        {
          successDescription: 'Ticket asignado a tu usuario.',
          formatError: (err) => formatApiFormError(err, 'No se pudo asignar el ticket.'),
        },
      )
    } catch {
      // FormOverlay
    }
  }

  const handleConfirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`tickets/tickets/${id}/`)
      setDeleteOpen(false)
      window.dispatchEvent(new CustomEvent('refresh-notifications'))
      navigate('/tickets')
    } catch (error) {
      console.error('Error eliminando ticket:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="page" data-od-id="ticket-detail-page">
        <EmptyState title="Cargando ticket…" description="Obteniendo conversación y detalles." />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="page" data-od-id="ticket-detail-page">
        <EmptyState
          title="Ticket no encontrado"
          description="La solicitud no existe o no tenés acceso."
          action={
            <Button variant="primary" onClick={() => navigate('/tickets')}>
              Volver a Mesa de ayuda
            </Button>
          }
        />
      </div>
    )
  }

  const canManage =
    ticket.user_role?.is_agent ||
    ticket.user_role?.is_admin ||
    ticket.user_role?.is_assigned
  const canDelete =
    user?.is_superuser ||
    (user?.user_permissions && user.user_permissions.includes('tickets.delete_ticket'))

  const conversationMessages = messages.filter((m) => !m.es_sistema)
  const systemMessages = messages.filter((m) => m.es_sistema)

  return (
    <div
      className="page ticket-detail"
      data-od-id="ticket-detail-page"
      data-fill-viewport
    >
      <PageHeader
        icon="help-circle"
        title={ticket.titulo}
        description={
          <span className="ticket-detail__header-meta">
            <span className="mono">{ticket.correlativo}</span>
            <StatusBadge status={ticket.estado} />
            <PriorityBadge priority={ticket.prioridad} />
          </span>
        }
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Mesa de ayuda', to: '/tickets' },
          { label: ticket.correlativo || 'Detalle' },
        ]}
        linkComponent={Link}
        split
        actions={
          <div className="ticket-detail__header-actions">
            <Button variant="secondary" size="sm" onClick={() => navigate('/tickets')}>
              Volver
            </Button>
            {canDelete ? (
              <Button
                variant="ghost-danger"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Icon name="trash" size={14} /> Eliminar
              </Button>
            ) : null}
          </div>
        }
      />

      <FormOverlay
        className="form-overlay-host--page"
        status={overlay.status}
        title={overlay.title}
        description={overlay.description}
        onDismiss={overlay.dismiss}
      >
      <div className="ticket-detail__layout">
        <div className="ticket-detail__main">
          <Card className="ticket-conversation">
            <div className="ticket-conversation__scroll">
              <div className="ticket-detail__origin">
                <div className="ticket-detail__origin-head">
                  <div className="ticket-detail__avatar" aria-hidden>
                    {ticket.creado_por_obj?.nombre_completo?.charAt(0) ||
                      ticket.creado_por_obj?.username?.charAt(0) ||
                      'U'}
                  </div>
                  <div>
                    <p className="ticket-detail__author">
                      {ticket.creado_por_obj?.nombre_completo ||
                        ticket.creado_por_obj?.username ||
                        'Usuario'}
                    </p>
                    <p className="ticket-detail__meta">
                      {new Date(ticket.fecha_creacion).toLocaleString('es-CL')} · Solicitud
                      original
                    </p>
                  </div>
                </div>
                <p className="ticket-detail__body">{ticket.descripcion}</p>
              </div>

              {(conversationMessages.length > 0 || systemMessages.length > 0) && (
                <div className="ticket-thread" aria-label="Conversación">
                  {messages.map((msg) => {
                    if (msg.es_sistema) {
                      return (
                        <div key={msg.id} className="ticket-thread__system">
                          <Icon name="activity" size={12} />
                          <span>
                            {msg.mensaje} ·{' '}
                            {new Date(msg.fecha).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )
                    }

                    const isMe = msg.autor === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`ticket-thread__row${isMe ? ' is-mine' : ''}`}
                      >
                        <div
                          className={`ticket-thread__avatar${isMe ? ' is-mine' : ''}`}
                          aria-hidden
                        >
                          {msg.autor_obj?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="ticket-thread__bubble-wrap">
                          <div className="ticket-thread__bubble-meta">
                            <strong>{msg.autor_obj?.username}</strong>
                            <span>{new Date(msg.fecha).toLocaleString('es-CL')}</span>
                          </div>
                          <div
                            className={`ticket-thread__bubble${isMe ? ' is-mine' : ''}`}
                          >
                            <p>{msg.mensaje}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
              {conversationMessages.length === 0 && systemMessages.length === 0 ? (
                <p className="ticket-conversation__empty">
                  Todavía no hay respuestas. Escribí el primer mensaje abajo.
                </p>
              ) : null}
            </div>

            <form className="ticket-reply" onSubmit={handleSendMessage}>
              <div className="field field--full">
                <Textarea
                  rows={3}
                  placeholder="Escribe tu respuesta…"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
              </div>
              <div className="ticket-reply__actions">
                <span className="ticket-reply__hint">
                  Enter para enviar · Shift+Enter salto de línea
                </span>
                <Button
                  variant="primary"
                  type="submit"
                  size="sm"
                  loading={isSending}
                  disabled={!newMessage.trim() || isSending}
                >
                  Enviar
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="ticket-detail__aside">
          {canManage ? (
            <Card>
              <CardHeader title="Gestión" />
              <div className="ticket-aside__body">
                {!ticket.asignado_a ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={autoAssign}
                    disabled={overlay.busy}
                    loading={overlay.busy}
                  >
                    <Icon name="user" size={14} /> Asignarme
                  </Button>
                ) : null}
                <p className="ticket-aside__label">Estado</p>
                <div className="ticket-aside__status-grid">
                  {STATUS_ACTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      disabled={overlay.busy}
                      className={`ticket-aside__status${
                        ticket.estado === s.key ? ' is-active' : ''
                      }`}
                      data-status={s.key}
                      onClick={() => updateStatus(s.key)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Información" />
            <div className="ticket-aside__details">
              <DetailItem label="Asignado a">
                {ticket.asignado_a_obj?.username || 'Sin asignar'}
              </DetailItem>
              <DetailItem label="Categoría">
                {ticket.categoria_obj?.nombre || 'General'}
              </DetailItem>
              <DetailItem label="Área destino">
                {ticket.area_destino_obj?.nombre || 'N/A'}
              </DetailItem>
              <DetailItem label="Solicitante">
                {ticket.creado_por_obj?.nombre_completo ||
                  ticket.creado_por_obj?.username ||
                  '—'}
                {ticket.creado_por_obj?.rut
                  ? ` · RUT ${ticket.creado_por_obj.rut}`
                  : ''}
              </DetailItem>
              <DetailItem label="Creación">
                {new Date(ticket.fecha_creacion).toLocaleString('es-CL')}
              </DetailItem>
              <DetailItem label="Última actualización">
                {new Date(ticket.fecha_actualizacion).toLocaleString('es-CL')}
              </DetailItem>
              {ticket.fecha_resolucion ? (
                <DetailItem label="Resolución">
                  {new Date(ticket.fecha_resolucion).toLocaleString('es-CL')}
                </DetailItem>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>
      </FormOverlay>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false)
        }}
        onConfirm={handleConfirmDelete}
        title="Eliminar ticket"
        description={`¿Eliminar «${ticket.correlativo}» de forma permanente? Esta acción no se puede deshacer.`}
        confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
        cancelLabel="Cancelar"
        danger
      />
    </div>
  )
}

export default TicketDetail
