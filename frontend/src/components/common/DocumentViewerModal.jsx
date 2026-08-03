import React from 'react'
import { Modal, Button, Icon } from '@slep/ui'

/**
 * Visor de documento compartido (contratos, procedimientos, CDP…).
 * Props históricas: isOpen (alias de open).
 */
const DocumentViewerModal = ({
  isOpen,
  open,
  onClose,
  title,
  subtitle,
  documentType = 'Documento',
  fileUrl,
}) => {
  const visible = open ?? isOpen

  return (
    <Modal
      open={!!visible}
      onClose={onClose}
      title={title || 'Documento'}
      subheader={[documentType, subtitle].filter(Boolean).join(' · ')}
      className="modal--shell modal--viewer"
      bodyClassName="modal__body--viewer"
      footer={
        <>
          <Button
            variant="secondary"
            type="button"
            onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
            disabled={!fileUrl}
          >
            Abrir en pestaña
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => {
              if (!fileUrl) return
              const link = document.createElement('a')
              link.href = fileUrl
              link.download = ''
              link.rel = 'noopener'
              document.body.appendChild(link)
              link.click()
              link.remove()
            }}
            disabled={!fileUrl}
          >
            <Icon name="download" size="sm" /> Descargar
          </Button>
        </>
      }
    >
      {fileUrl ? (
        <iframe src={fileUrl} className="doc-viewer__frame" title={title || 'Vista previa'} />
      ) : (
        <p className="doc-viewer__empty">No hay archivo para mostrar.</p>
      )}
    </Modal>
  )
}

export default DocumentViewerModal
