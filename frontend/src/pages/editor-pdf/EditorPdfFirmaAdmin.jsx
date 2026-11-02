import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  FileInput,
  FormOverlay,
  PageHeader,
  Textarea,
  useFormOverlay,
} from '@slep/ui'
import api from '../../api'

function aplicarVariables(texto, variables) {
  return String(texto || '').replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, clave) => {
    const item = variables.find((variable) => variable.clave === clave.toLowerCase())
    return item ? item.ejemplo : ''
  })
}

export default function EditorPdfFirmaAdmin() {
  const overlay = useFormOverlay()
  const areaRef = useRef(null)
  const [texto, setTexto] = useState('')
  const [variables, setVariables] = useState([])
  const [conFicha, setConFicha] = useState(false)
  const [imagen, setImagen] = useState('')
  const [imagenTipo, setImagenTipo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api.get('editor-pdf/firma-plantilla/')
      .then(({ data }) => {
        if (!active) return
        setTexto(data.texto || '')
        setVariables(data.variables || [])
        setConFicha(Boolean(data.con_ficha))
        setImagen(data.imagen || '')
        setImagenTipo(data.imagen_tipo || '')
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.detail || 'No se pudo cargar el texto de la firma.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const vista = useMemo(() => aplicarVariables(texto, variables), [texto, variables])

  const insertar = (clave) => {
    const snippet = `{{${clave}}}`
    const area = areaRef.current
    const start = area?.selectionStart ?? texto.length
    const end = area?.selectionEnd ?? texto.length
    const next = `${texto.slice(0, start)}${snippet}${texto.slice(end)}`
    setTexto(next)
    requestAnimationFrame(() => {
      if (!area) return
      const cursor = start + snippet.length
      area.focus()
      area.setSelectionRange(cursor, cursor)
    })
  }

  const guardar = async () => {
    setError('')
    try {
      await overlay.run(async () => {
        const { data } = await api.put('editor-pdf/firma-plantilla/', {
          texto,
          imagen,
          imagen_tipo: imagenTipo,
          quitar_imagen: !imagen,
        })
        setTexto(data.texto || '')
        setVariables(data.variables || [])
        setConFicha(Boolean(data.con_ficha))
        setImagen(data.imagen || '')
        setImagenTipo(data.imagen_tipo || '')
      }, {
        successTitle: 'Firma guardada',
        successDescription: 'Las próximas firmas usarán este texto y esta imagen.',
        errorTitle: 'No se pudo guardar',
        formatError: (err) => err.response?.data?.detail || 'No se pudo guardar la firma.',
      })
    } catch {
      /* el overlay muestra el error */
    }
  }

  const elegirImagen = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('Use una imagen PNG o JPG.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 256
        const ratio = Math.min(1, max / img.width, max / img.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * ratio))
        canvas.height = Math.max(1, Math.round(img.height * ratio))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        setImagen(dataUrl.split(',')[1] || '')
        setImagenTipo('png')
        setError('')
      }
      img.onerror = () => setError('No se pudo leer la imagen.')
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  }

  const srcImagen = imagen
    ? `data:image/${imagenTipo === 'jpg' ? 'jpeg' : 'png'};base64,${imagen}`
    : ''

  return (
    <div className="page" data-od-id="editor-pdf-firma-admin">
      <PageHeader
        icon="file-check"
        title="Texto de la firma"
        description="Defina el texto y, si quiere, una imagen pequeña. Las variables se reemplazan con la ficha de quien firma."
        breadcrumbs={[
          { label: 'Editor PDF', to: '/editor-pdf' },
          { label: 'Administración', to: '/admin/editor-pdf' },
          { label: 'Texto de la firma' },
        ]}
        linkComponent={Link}
      />
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <FormOverlay
        status={overlay.status}
        title={overlay.title}
        description={overlay.description}
        onDismiss={overlay.dismiss}
      >
        <Card>
          <CardHeader
            title="Plantilla"
            subtitle="Use una variable por dato. Cada salto de línea es una línea del sello."
          />
          <div className="card__body">
            <div className="crud-form">
              <Field label="Datos disponibles">
                <div className="token-list">
                  {variables.map((variable) => (
                    <Button
                      key={variable.clave}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => insertar(variable.clave)}
                    >
                      {variable.etiqueta}
                    </Button>
                  ))}
                </div>
              </Field>
              <Field label="Texto">
                <Textarea
                  ref={areaRef}
                  rows={8}
                  value={texto}
                  disabled={loading}
                  onChange={(event) => setTexto(event.target.value)}
                />
              </Field>
              <Field label="Imagen">
                <FileInput
                  label="Elegir imagen PNG o JPG"
                  hint="Se muestra pequeña, a la izquierda del texto."
                  accept="image/png,image/jpeg"
                  onChange={elegirImagen}
                />
              </Field>
              <Field label={conFicha ? 'Vista previa con su ficha' : 'Vista previa con datos de ejemplo'}>
                <div className="firma-sello">
                  {srcImagen ? <img className="firma-sello__img" src={srcImagen} alt="Imagen de la firma" /> : null}
                  <pre className="token-preview">{vista || 'El sello quedará vacío.'}</pre>
                </div>
                {srcImagen ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => { setImagen(''); setImagenTipo('') }}>
                    Quitar imagen
                  </Button>
                ) : null}
              </Field>
            </div>
          </div>
          <div className="form-actions">
            <Button variant="primary" onClick={guardar} disabled={loading || overlay.busy}>
              Guardar firma
            </Button>
          </div>
        </Card>
      </FormOverlay>
    </div>
  )
}
