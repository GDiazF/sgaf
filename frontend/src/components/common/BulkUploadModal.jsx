import React from 'react'
import { Modal, Button, Alert, FileInput, Icon } from '@slep/ui'

const BulkUploadModal = ({
  open,
  isOpen,
  onClose,
  title = 'Carga masiva',
  description,
  onUpload,
  onDownloadTemplate,
  uploading = false,
  errors = [],
}) => {
  const visible = open ?? isOpen

  return (
    <Modal
      open={!!visible}
      onClose={() => {
        if (!uploading) onClose?.()
      }}
      title={title}
      subheader={description || 'Suba un archivo Excel para la carga masiva.'}
      footer={
        <Button variant="ghost" type="button" onClick={onClose} disabled={uploading}>
          Cerrar
        </Button>
      }
    >
      <div className="crud-form">
        <Alert variant="info" title="Importante">
          Si un solo registro falla, se cancela la carga completa.
        </Alert>

        {onDownloadTemplate ? (
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDownloadTemplate}
              disabled={uploading}
            >
              <Icon name="download" size="sm" /> Descargar plantilla Excel
            </Button>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <Alert variant="danger" title="Inconsistencias detectadas">
            <ul className="contracts-glosa-preview" style={{ margin: 0, paddingLeft: '1.1rem' }}>
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {uploading ? (
          <Alert variant="info" title="Procesando archivo">
            Espere mientras se valida e importa el Excel…
          </Alert>
        ) : (
          <FileInput
            variant="zone"
            label="Arrastre su archivo Excel o haga clic para seleccionar"
            hint="Formatos: .xlsx, .xls"
            accept=".xlsx,.xls"
            onChange={onUpload}
            disabled={uploading}
          />
        )}
      </div>
    </Modal>
  )
}

export default BulkUploadModal
