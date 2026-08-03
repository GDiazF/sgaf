import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../icons/Icon.jsx'
import { Button } from './Button.jsx'
import { FormOverlay } from './FormOverlay.jsx'
import { cn } from '../../lib/cn.js'
import { useOverlayPresence } from '../../hooks/useOverlayPresence.js'
import { useSmoothModalSize } from '../../hooks/useSmoothModalSize.js'

const OVERLAY_EXIT_MS = 320

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  confirm = false,
  className,
  labelledBy = 'slep-modal-title',
  showClose = true,
  headerActions,
  footerClassName,
  bodyClassName,
  bodyStyle,
  role = 'dialog',
  hideHeader = false,
  ribbon,
  subheader,
  afterHeader,
  style,
  smoothSize = true,
  /** FormOverlay: null | 'loading' | 'success' | 'error' */
  overlayStatus = null,
  overlayTitle,
  overlayDescription,
  onOverlayDismiss,
}) {
  const { mounted, visible } = useOverlayPresence(open, { durationMs: OVERLAY_EXIT_MS })
  const shellRef = useRef(null)
  useSmoothModalSize(shellRef, { active: mounted && visible && smoothSize })

  const overlayBusy = overlayStatus === 'loading'
  const requestClose = () => {
    if (overlayBusy) return
    onClose?.()
  }

  useEffect(() => {
    if (!mounted) return undefined
    document.body.style.overflow = 'hidden'
    document.body.classList.add('has-modal-scroll-lock')
    return () => {
      document.body.style.overflow = ''
      document.body.classList.remove('has-modal-scroll-lock')
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && visible) requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mounted, visible, overlayBusy, onClose])

  if (!mounted) return null

  const shell = (
    <>
      {ribbon}
      {!hideHeader ? (
        <div className="modal__header">
          <div className="modal__header-main">
            <h2 className="modal__title" id={labelledBy}>
              {title}
            </h2>
            {subheader ? <div className="modal__subheader">{subheader}</div> : null}
          </div>
          {(headerActions || showClose) && (
            <div className="modal__header-actions">
              {headerActions}
              {showClose ? (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={requestClose}
                  aria-label="Cerrar"
                  disabled={overlayBusy}
                >
                  <Icon name="close" size={20} />
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
      {afterHeader}
      <div className={cn('modal__body', bodyClassName)} style={bodyStyle}>
        {children}
      </div>
      {footer ? <div className={cn('modal__footer', footerClassName)}>{footer}</div> : null}
    </>
  )

  return createPortal(
    <div
      className={cn('modal-backdrop', visible && 'is-open')}
      role={role}
      aria-modal="true"
      aria-hidden={!visible}
      aria-labelledby={hideHeader ? undefined : labelledBy}
      onClick={() => {
        if (visible) requestClose()
      }}
    >
      <div
        ref={shellRef}
        className={cn(
          'modal',
          confirm && 'modal--confirm',
          size === 'lg' && 'modal--lg',
          size === 'sm' && 'modal--sm',
          overlayBusy && 'is-loading',
          className,
        )}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <FormOverlay
          className="form-overlay-host--modal"
          status={overlayStatus}
          title={overlayTitle}
          description={overlayDescription}
          onDismiss={onOverlayDismiss}
        >
          {shell}
        </FormOverlay>
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  variant = 'dialog', // dialog | confirm
}) {
  if (variant === 'confirm') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        confirm
        title={title}
        showClose={false}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={danger ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm?.()
                onClose?.()
              }}
            >
              {confirmLabel}
            </Button>
          </>
        }
      >
        <Icon name="warning" className="modal__icon" size={48} />
        {description ? <p>{description}</p> : null}
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {description ? <p>{description}</p> : null}
    </Modal>
  )
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
  wide = false,
  className,
  bodyClassName,
  /** FormOverlay: null | 'loading' | 'success' | 'error' */
  overlayStatus = null,
  overlayTitle,
  overlayDescription,
  onOverlayDismiss,
}) {
  const { mounted, visible } = useOverlayPresence(open, { durationMs: OVERLAY_EXIT_MS })
  const overlayBusy = overlayStatus === 'loading'
  const requestClose = () => {
    if (overlayBusy) return
    onClose?.()
  }

  useEffect(() => {
    if (!mounted) return undefined
    document.body.classList.add('has-modal-scroll-lock')
    return () => {
      document.body.classList.remove('has-modal-scroll-lock')
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && visible) requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mounted, visible, overlayBusy, onClose])

  if (!mounted) return null

  const shell = (
    <>
      <div className="drawer__header">
        <h2 className="drawer__title">{title}</h2>
        <button
          type="button"
          className="icon-btn"
          onClick={requestClose}
          aria-label="Cerrar"
          disabled={overlayBusy}
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className={cn('drawer__body', bodyClassName)}>{children}</div>
      {footer ? <div className="drawer__footer">{footer}</div> : null}
    </>
  )

  return createPortal(
    <div
      className={cn('drawer-backdrop', visible && 'is-open')}
      aria-hidden={!visible}
      onClick={() => {
        if (visible) requestClose()
      }}
    >
      <aside
        className={cn(
          'drawer',
          wide && 'drawer--wide',
          side === 'left' && 'drawer--left',
          visible && 'is-open',
          overlayBusy && 'is-loading',
          className,
        )}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <FormOverlay
          className="form-overlay-host--drawer"
          status={overlayStatus}
          title={overlayTitle}
          description={overlayDescription}
          onDismiss={onOverlayDismiss}
        >
          {shell}
        </FormOverlay>
      </aside>
    </div>,
    document.body,
  )
}
