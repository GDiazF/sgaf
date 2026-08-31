import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Field,
  Input,
  Alert,
  Badge,
  FileInput,
  Icon,
} from '@slep/ui'

const API_BASE = (import.meta.env.DEV ? import.meta.env.VITE_API_URL : null) || '/api/'

function formatFecha(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('es-CL', {
      dateStyle: 'long',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export default function ValidarDocumento() {
  const { codigo: codigoParam } = useParams()
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState((codigoParam || '').toUpperCase())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [file, setFile] = useState(null)
  const [hashCheck, setHashCheck] = useState(null)
  const [hashLoading, setHashLoading] = useState(false)

  useEffect(() => {
    document.title = 'Validar documento | SGAF - SLEP Iquique'
  }, [])

  useEffect(() => {
    if (codigoParam) {
      setCodigo(codigoParam.toUpperCase())
      consultar(codigoParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoParam])

  const consultar = async (codeValue) => {
    const code = (codeValue || codigo || '').trim().toUpperCase()
    if (!code) {
      setError('Ingrese el código del documento (ej. SGAF-2026-0001).')
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setHashCheck(null)
    try {
      const res = await fetch(`${API_BASE}firma-digital/validar/${encodeURIComponent(code)}/`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'No se encontró el documento.')
        setResult({ valido: false, codigo: code })
        return
      }
      setResult(data)
      if (code !== codigoParam) {
        navigate(`/validar/${code}`, { replace: true })
      }
    } catch {
      setError('No se pudo consultar el validador. Intente más tarde.')
    } finally {
      setLoading(false)
    }
  }

  const verificarArchivo = async () => {
    if (!result?.codigo) {
      setError('Consulte primero un código válido.')
      return
    }
    if (!file) {
      setError('Seleccione el PDF firmado para comparar.')
      return
    }
    setHashLoading(true)
    setHashCheck(null)
    setError(null)
    try {
      const form = new FormData()
      form.append('codigo', result.codigo)
      form.append('file', file)
      const res = await fetch(`${API_BASE}firma-digital/validar/verificar-archivo/`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      setHashCheck(data)
      if (!res.ok && !data.coincide) {
        setError(data.mensaje || data.error || 'El archivo no coincide.')
      }
    } catch {
      setError('No se pudo verificar el archivo.')
    } finally {
      setHashLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    consultar(codigo)
  }

  return (
    <div className="page" data-od-id="validar-documento-page">
      <PageHeader
        icon="file-check"
        title="Validar documento firmado"
        description="Consulte si un documento fue firmado en SGAF — SLEP Iquique"
      />

      <Card>
        <CardHeader
          title="Código de validación"
          subtitle="Formato SGAF-AAAA-NNNN (aparece al firmar en el sistema)"
        />
        <div className="card__body">
          <form className="crud-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <Field label="Código" htmlFor="validar-codigo" required className="field--full">
                <Input
                  id="validar-codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="SGAF-2026-0001"
                  autoComplete="off"
                />
              </Field>
            </div>
            <div className="firma-prueba__upload-actions">
              <Button type="submit" variant="primary" loading={loading} disabled={loading}>
                <Icon name="search" size="sm" /> Consultar
              </Button>
              <Button type="button" variant="quiet" onClick={() => navigate('/login')}>
                Ir al inicio de sesión
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {error ? (
        <Alert variant="danger" title="Validación">
          {error}
        </Alert>
      ) : null}

      {result?.valido ? (
        <Card>
          <CardHeader
            title={result.codigo}
            subtitle="Documento registrado en SGAF"
            actions={<Badge variant="success">Válido</Badge>}
          />
          <div className="card__body">
            <p>
              <strong>Firmado el:</strong> {formatFecha(result.firmado_en)}
            </p>
            <p>
              <strong>Firmante:</strong> {result.firmante_nombre || '—'}
              {result.firmante_cargo ? ` · ${result.firmante_cargo}` : ''}
            </p>
            {result.firmante_run ? (
              <p>
                <strong>RUN:</strong> {result.firmante_run}
              </p>
            ) : null}
            <p>
              <strong>Propósito:</strong> {result.purpose || '—'}
            </p>
            <p>
              <strong>Archivo:</strong> {result.nombre_archivo || '—'}
            </p>
            <p>
              <strong>Huella (SHA-256):</strong>{' '}
              <code>{result.hash_corto}…</code>
            </p>

            <Field
              label="Verificar archivo (opcional)"
              hint="Suba el PDF firmado para comprobar que no fue alterado."
              className="field--full"
            >
              <FileInput
                variant="zone"
                label="Seleccionar PDF"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null)
                  setHashCheck(null)
                }}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              loading={hashLoading}
              disabled={hashLoading || !file}
              onClick={verificarArchivo}
            >
              Comparar hash del PDF
            </Button>

            {hashCheck?.coincide === true ? (
              <Alert variant="success" title="Integridad OK">
                {hashCheck.mensaje}
              </Alert>
            ) : null}
            {hashCheck?.coincide === false ? (
              <Alert variant="warning" title="No coincide">
                {hashCheck.mensaje}
              </Alert>
            ) : null}
          </div>
        </Card>
      ) : null}

      {result && result.valido === false ? (
        <Alert variant="warning" title="No encontrado">
          El código {result.codigo} no está registrado como documento firmado en SGAF.
        </Alert>
      ) : null}

      <p className="legal-page__footer">
        Este validador confirma el registro institucional en SGAF. La validez jurídica de la
        firma electrónica avanzada la otorga el certificado FirmaGob del Estado.
      </p>
    </div>
  )
}
