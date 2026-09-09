import React, { useState } from 'react'
import { Modal, Button, Alert, FileInput, Icon, Badge } from '@slep/ui'

/**
 * Carga masiva documentación: 1) Excel → preview  2) PDFs por folio → commit.
 */
export default function DocBulkUploadModal({
  open,
  onClose,
  tipoNombre = '',
  usaFolio = false,
  uploading = false,
  preview = null,
  commitResult = null,
  onDownloadTemplate,
  onPreviewExcel,
  onCommitPdfs,
  onReset,
}) {
  const [step, setStep] = useState(1)

  const handleClose = () => {
    if (uploading) return
    setStep(1)
    onReset?.()
    onClose?.()
  }

  const okCount = preview?.ok?.length ?? 0
  const previewErrors = preview?.errors ?? []
  const createdCount = commitResult?.created?.length ?? 0
  const commitErrors = commitResult?.errors ?? []

  const footer = (
    <>
      <Button variant="ghost" type="button" onClick={handleClose} disabled={uploading}>
        Cerrar
      </Button>
      {step === 2 && !commitResult ? (
        <Button
          variant="secondary"
          type="button"
          disabled={uploading}
          onClick={() => {
            setStep(1)
            onReset?.()
          }}
        >
          Volver al Excel
        </Button>
      ) : null}
    </>
  )

  return (
    <Modal
      open={!!open}
      onClose={handleClose}
      size="lg"
      title="Carga masiva"
      subheader={
        tipoNombre
          ? `${tipoNombre} · Excel + PDFs nombrados por folio`
          : 'Excel + PDFs nombrados por folio'
      }
      footer={footer}
    >
      <div className="crud-form">
        {!usaFolio ? (
          <Alert variant="warning" title="Tipo sin folio">
            Active folio en este tipo para usar la carga masiva.
          </Alert>
        ) : null}

        {usaFolio && !commitResult ? (
          <div className="table-toolbar__left">
            <Badge variant={step === 1 ? 'accent' : 'neutral'}>1 · Excel</Badge>
            <Badge variant={step === 2 ? 'accent' : 'neutral'}>2 · PDFs</Badge>
          </div>
        ) : null}

        {commitResult ? (
          <>
            <Alert
              variant={createdCount ? 'success' : 'danger'}
              title={
                createdCount
                  ? `Se crearon ${createdCount} registro(s)`
                  : 'No se creó ningún registro'
              }
            >
              {createdCount
                ? 'Los archivos se guardaron con el nombre del folio.'
                : 'Revise los errores e intente de nuevo.'}
            </Alert>
            {commitErrors.length > 0 ? (
              <Alert variant="warning" title="Detalle (éxito parcial)">
                <ul className="contracts-glosa-preview">
                  {commitErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStep(1)
                onReset?.()
              }}
            >
              Nueva carga
            </Button>
          </>
        ) : null}

        {usaFolio && !commitResult && step === 1 ? (
          <>
            <Alert variant="info" title="Paso 1 · Datos">
              Descargue la plantilla, complete una fila por certificado y súbala. Aún no se
              guarda nada en el sistema. El matching con los PDFs será solo por{' '}
              <strong>folio</strong>. Columna opcional{' '}
              <code>Ya enviado (SI/NO)</code>: ponga SI si el correo ya se mandó fuera del
              sistema.
            </Alert>

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

            {previewErrors.length > 0 ? (
              <Alert variant="danger" title="Filas con error">
                <ul className="contracts-glosa-preview">
                  {previewErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </Alert>
            ) : null}

            {okCount > 0 ? (
              <Alert variant="success" title={`${okCount} fila(s) lista(s)`}>
                Puede continuar al paso 2 para subir los PDFs. Las filas con error se omiten.
                <div className="form-actions">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={uploading}
                    onClick={() => setStep(2)}
                  >
                    Continuar con PDFs
                  </Button>
                </div>
              </Alert>
            ) : null}

            {uploading ? (
              <Alert variant="info" title="Validando Excel">
                Espere…
              </Alert>
            ) : (
              <FileInput
                variant="zone"
                label="Arrastre el Excel o haga clic para seleccionar"
                hint="Formatos: .xlsx, .xls"
                accept=".xlsx,.xls"
                onChange={onPreviewExcel}
                disabled={uploading}
              />
            )}
          </>
        ) : null}

        {usaFolio && !commitResult && step === 2 ? (
          <>
            <Alert variant="info" title="Paso 2 · Documentos">
              Suba los PDF cuyo nombre sea exactamente el folio (ej.{' '}
              <code>FMS-2568.pdf</code>). Solo entonces se crean los registros. Éxito
              parcial: lo que matchee se guarda; el resto se reporta.
            </Alert>
            <p>
              Filas pendientes: <strong>{okCount}</strong>
            </p>
            {uploading ? (
              <Alert variant="info" title="Importando">
                Creando registros…
              </Alert>
            ) : (
              <FileInput
                variant="zone"
                label="Seleccione o arrastre los PDFs"
                hint="Solo PDF · varios a la vez · nombre = folio"
                accept=".pdf,application/pdf"
                multiple
                disabled={uploading}
                onChange={onCommitPdfs}
              />
            )}
          </>
        ) : null}
      </div>
    </Modal>
  )
}
