import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  EmptyState,
  Field,
  FileInput,
  FormOverlay,
  Input,
  PageHeader,
  useFormOverlay,
} from '@slep/ui'
import api from '../../api'
import { downloadBlob } from '../../editor-pdf/download'
import { runTool } from '../../editor-pdf/processors'
import { isSignTool, metaFor } from '../../editor-pdf/toolMeta'
import FirmaSlepPage from './FirmaSlepPage'

export default function EditorPdfHerramienta() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [tool, setTool] = useState(null)
  const [missing, setMissing] = useState(false)
  const [files, setFiles] = useState([])
  const [values, setValues] = useState({})
  const overlay = useFormOverlay()

  useEffect(() => {
    let active = true
    setMissing(false)
    setTool(null)
    api.get(`editor-pdf/herramientas/${slug}/`)
      .then(({ data }) => {
        if (active) setTool(data)
      })
      .catch(() => {
        if (active) setMissing(true)
      })
    return () => { active = false }
  }, [slug])

  if (missing) {
    return (
      <div className="page">
        <EmptyState
          title="Herramienta no disponible"
          description="No está habilitada o no existe en el catálogo."
          action={<Button onClick={() => navigate('/editor-pdf')}>Volver al catálogo</Button>}
        />
      </div>
    )
  }

  if (!tool) {
    return <div className="page" />
  }

  if (isSignTool(slug)) {
    return <FirmaSlepPage tool={tool} />
  }

  const meta = metaFor(slug)

  const onProcess = async () => {
    try {
      await overlay.run(async () => {
        const result = await runTool(slug, files, values)
        downloadBlob(result.blob, result.filename)
      }, {
        successTitle: 'Listo',
        successDescription: 'El archivo se descargó en su equipo.',
        errorTitle: 'No se pudo procesar',
        formatError: (err) => err?.message || 'No se pudo procesar el archivo.',
      })
    } catch {
      /* el overlay muestra el error */
    }
  }

  return (
    <div className="page" data-od-id={`editor-pdf-${slug}`}>
      <PageHeader
        icon="file"
        title={tool.nombre}
        description={tool.descripcion}
        breadcrumbs={[
          { label: 'Editor PDF', to: '/editor-pdf' },
          { label: tool.nombre },
        ]}
        linkComponent={Link}
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/editor-pdf')}>
            Volver
          </Button>
        }
      />
      <FormOverlay
        status={overlay.status}
        title={overlay.title}
        description={overlay.description}
        onDismiss={overlay.dismiss}
      >
        <FileInput
          variant="zone"
          label={meta.multiple ? 'Arrastre los archivos o haga clic para elegirlos' : 'Arrastre el archivo o haga clic para elegirlo'}
          hint={tool.descripcion}
          accept={meta.accept}
          multiple={meta.multiple}
          onChange={(event) => setFiles([...event.target.files])}
        />
        {meta.fields.map((field) => (
          <Field key={field.name} label={field.label} hint={field.hint}>
            <Input
              value={values[field.name] || ''}
              placeholder={field.placeholder}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
          </Field>
        ))}
        {overlay.status === 'error' ? null : (
          <Alert variant="info">El resultado se descarga. SGAF no guarda una copia del archivo.</Alert>
        )}
        <Button variant="primary" onClick={onProcess} disabled={!files.length || overlay.busy}>
          Procesar y descargar
        </Button>
      </FormOverlay>
    </div>
  )
}
