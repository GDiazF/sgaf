import React from 'react'
import { Modal, Button, Alert } from '@slep/ui'

export default function RevisarDocumentoModal({
  open,
  item,
  pdfUrl,
  loading,
  error,
  onClose,
}) {
  const filename = `${item?.codigo_interno || item?.meta?.folio || 'documento'}.pdf`

  const handleDownload = () => {
    if (!pdfUrl) return
    const link = document.createElement('a')
    link.href = pdfUrl
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      className="firma-doc-viewer-modal"
      title="Revisar documento"
      subheader={item?.titulo || item?.codigo_interno || 'PDF'}
      footer={
        <>
          <Button variant="quiet" type="button" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="outline"
            type="button"
            disabled={!pdfUrl}
            onClick={handleDownload}
          >
            Descargar PDF
          </Button>
        </>
      }
    >
      {loading ? (
        <Alert variant="info" title="Cargando documento">
          Preparando vista del PDF…
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" title="No se pudo abrir el documento">
          {error}
        </Alert>
      ) : null}

      {!loading && !error && pdfUrl ? (
        <iframe
          className="firma-doc-viewer__frame"
          src={pdfUrl}
          title={`Vista previa ${filename}`}
        />
      ) : null}
    </Modal>
  )
}
