import React from 'react'
import { Modal, Button, Icon } from '@slep/ui'
import { APP_VERSION, APP_DEVELOPER, APP_RELEASE_DATE } from '../../version'

function AboutModal({ isOpen, onClose, version = APP_VERSION }) {
  const year = new Date().getFullYear()
  const releaseLabel = (() => {
    try {
      return new Date(`${APP_RELEASE_DATE}T12:00:00`).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return APP_RELEASE_DATE
    }
  })()

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      className="about-modal"
      title="Acerca de SGAF"
      subheader="Sistema de Gestión Administrativa y Financiera"
      footer={
        <Button variant="secondary" type="button" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="about-modal__body">
        <div className="about-modal__brand" aria-hidden>
          <span className="about-modal__mark">
            <Icon name="building" size={28} />
          </span>
          <div className="about-modal__brand-text">
            <p className="about-modal__name">SGAF</p>
            <p className="about-modal__org">SLEP Iquique</p>
          </div>
        </div>

        <dl className="about-modal__meta">
          <div className="about-modal__meta-row">
            <dt>Versión</dt>
            <dd>v{version}</dd>
          </div>
          <div className="about-modal__meta-row">
            <dt>Lanzamiento</dt>
            <dd>{releaseLabel}</dd>
          </div>
          <div className="about-modal__meta-row about-modal__meta-row--stack">
            <dt>Desarrollo</dt>
            <dd>{APP_DEVELOPER}</dd>
          </div>
        </dl>

        <p className="about-modal__copy">© {year} SLEP Iquique</p>
      </div>
    </Modal>
  )
}

export default AboutModal
