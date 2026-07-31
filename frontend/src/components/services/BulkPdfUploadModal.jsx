import React from 'react'
import { Modal, Button, FileInput, Alert, Icon } from '@slep/ui'

const BulkPdfUploadModal = ({
  open,
  onClose,
  onUpload,
  uploading = false,
  results = null,
  onClearResults,
}) => (
  <Modal
    open={open}
    onClose={() => {
      if (!uploading) onClose?.()
    }}
    size="lg"
    title="Carga masiva de boletas (PDF)"
    subheader="Suba múltiples archivos PDF a la vez"
    footer={
      <Button variant="ghost" type="button" onClick={onClose} disabled={uploading}>
        Cerrar
      </Button>
    }
  >
    <div className="crud-form">
      <Alert variant="info" title="Estándar de nombres (obligatorio)">
        <div className="payments-pdf-rules">
          <p>
            <strong>1 · Boleta por servicio</strong>
            <br />
            <code>{'{Nro_Documento}_{Nro_Cliente}.pdf'}</code>
            <br />
            Ejemplo: <code>846573_723621.pdf</code>
          </p>
          <p>
            <strong>2 · Factura corporativa</strong> (un PDF, varios servicios)
            <br />
            <code>{'{Nro_Documento}_CORP.pdf'}</code>
            <br />
            Ejemplo: <code>98765432_CORP.pdf</code> → se asigna a todos los pagos con ese documento.
          </p>
        </div>
      </Alert>

      {!results ? (
        <FileInput
          variant="zone"
          label={uploading ? 'Procesando archivos…' : 'Seleccione o arrastre los archivos PDF'}
          hint="Solo PDF · puede seleccionar varios"
          accept=".pdf,application/pdf"
          multiple
          disabled={uploading}
          onChange={onUpload}
        />
      ) : (
        <div className="payments-pdf-results">
          <div className="payments-pdf-results__stats">
            <div className="payments-pdf-results__stat payments-pdf-results__stat--ok">
              <span>Exitosos</span>
              <strong>{results.success?.length ?? 0}</strong>
            </div>
            <div className="payments-pdf-results__stat payments-pdf-results__stat--err">
              <span>Errores</span>
              <strong>{results.errors?.length ?? 0}</strong>
            </div>
          </div>

          {results.errors?.length > 0 ? (
            <div className="payments-pdf-results__errors">
              <p className="contracts-section-title">Detalle de errores</p>
              {results.errors.map((err, i) => (
                <p key={i} className="payments-pdf-results__error">
                  <Icon name="close" size="sm" /> {err}
                </p>
              ))}
            </div>
          ) : null}

          <Button variant="secondary" type="button" onClick={onClearResults}>
            Subir más archivos
          </Button>
        </div>
      )}
    </div>
  </Modal>
)

export default BulkPdfUploadModal
