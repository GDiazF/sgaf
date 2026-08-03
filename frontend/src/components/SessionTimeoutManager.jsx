import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Modal, Button, Icon } from '@slep/ui'
import { useAuth } from '../context/AuthContext'

const SessionTimeoutManager = () => {
  const { logout, user } = useAuth()
  const location = useLocation()
  const [showModal, setShowModal] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(60)

  const SESSION_TIME = 30 * 60 * 1000
  const WARNING_TIME = 1 * 60 * 1000

  const publicPaths = ['/login', '/forgot-password', '/reset-password', '/reservas-externas', '/legal']
  const isPublic = publicPaths.some((p) => location.pathname.startsWith(p))

  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (user) {
      const now = Date.now()
      lastActivityRef.current = now
      localStorage.setItem('lastActivity', now.toString())
      setShowModal(false)
      setSecondsLeft(60)
    } else {
      setShowModal(false)
      setSecondsLeft(60)
      localStorage.removeItem('lastActivity')
      lastActivityRef.current = Date.now()
    }
  }, [user])

  const updateActivity = () => {
    if (!user || showModal || isPublic) return
    const now = Date.now()
    if (now - lastActivityRef.current > 5000) {
      lastActivityRef.current = now
      localStorage.setItem('lastActivity', now.toString())
    }
  }

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, updateActivity))
    return () => events.forEach((ev) => window.removeEventListener(ev, updateActivity))
  }, [user, showModal, isPublic])

  useEffect(() => {
    const handleSync = (e) => {
      if (e.key === 'lastActivity' && !showModal) {
        lastActivityRef.current = parseInt(e.newValue || Date.now().toString(), 10)
      }
    }
    window.addEventListener('storage', handleSync)
    return () => window.removeEventListener('storage', handleSync)
  }, [showModal])

  useEffect(() => {
    if (!user || isPublic) {
      setShowModal(false)
      return undefined
    }

    const initialElapsed = Date.now() - lastActivityRef.current
    if (initialElapsed >= SESSION_TIME) {
      lastActivityRef.current = Date.now()
      localStorage.setItem('lastActivity', lastActivityRef.current.toString())
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastActivityRef.current

      if (elapsed >= SESSION_TIME) {
        clearInterval(interval)
        logout()
      } else if (elapsed >= SESSION_TIME - WARNING_TIME) {
        if (!showModal) setShowModal(true)
        const remaining = Math.max(0, Math.ceil((SESSION_TIME - elapsed) / 1000))
        setSecondsLeft(remaining)
      } else if (showModal) {
        setShowModal(false)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [user, isPublic, showModal, logout])

  const handleKeepAlive = () => {
    setShowModal(false)
    const now = Date.now()
    lastActivityRef.current = now
    localStorage.setItem('lastActivity', now.toString())
  }

  if (!user || isPublic) return null

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sc = s % 60
    return `${m}:${sc.toString().padStart(2, '0')}`
  }

  return (
    <Modal
      open={showModal}
      onClose={handleKeepAlive}
      size="sm"
      title="¿Sigues ahí?"
      subheader="Tu sesión expirará por inactividad"
      footer={
        <>
          <Button variant="secondary" type="button" onClick={logout}>
            <Icon name="close" size={14} />
            Salir
          </Button>
          <Button variant="primary" type="button" onClick={handleKeepAlive}>
            <Icon name="refresh" size={14} />
            Mantener
          </Button>
        </>
      }
    >
      <div className="session-timeout">
        <p className="session-timeout__timer" aria-live="polite">
          {formatTime(secondsLeft)}
        </p>
        <p className="session-timeout__hint">Tiempo restante antes del cierre automático</p>
      </div>
    </Modal>
  )
}

export default SessionTimeoutManager
