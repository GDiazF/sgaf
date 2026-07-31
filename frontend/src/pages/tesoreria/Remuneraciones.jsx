import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../api'
import { usePermission } from '../../hooks/usePermission'
import { TesoreriaConfigSection } from './TesoreriaMaintainers'
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Alert,
  FileInput,
  Icon,
} from '@slep/ui'

const FileUploader = ({ title, description, endpoint, buttonLabel, accept, multiple = false }) => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [inputKey, setInputKey] = useState(0)

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || [])
    setFiles(list)
    setMessage(null)
    setError(null)
  }

  const getEstimatedTime = () => {
    if (!files.length) return 0
    const totalSize = files.reduce((acc, f) => acc + f.size, 0)
    return Math.ceil(2 + files.length + totalSize / (512 * 1024))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!files.length) {
      setError('Seleccione al menos un archivo.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))

    try {
      const response = await api.post(endpoint, formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url

      const contentDisposition = response.headers['content-disposition']
      let fileName = 'archivo_procesado.xlsx'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match?.[1]) fileName = match[1]
      }

      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setMessage('Archivo procesado y descargado correctamente.')
      setFiles([])
      setInputKey((k) => k + 1)
    } catch (err) {
      console.error('Error processing file:', err)
      setError('Error al procesar. Revise el formato e intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const filesLabel =
    files.length === 0
      ? null
      : files.length === 1
        ? files[0].name
        : `${files.length} archivos`

  const totalKb =
    files.length > 0
      ? (files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)
      : null

  const isPdf = accept?.includes('pdf')

  return (
    <Card className="tesoreria-upload-card">
      <CardHeader title={title} subtitle={description} />
      <form className="tesoreria-upload-card__body" onSubmit={handleSubmit}>
        <FileInput
          key={inputKey}
          variant="zone"
          label={filesLabel || 'Subir archivos'}
          hint={
            filesLabel
              ? `${totalKb} KB`
              : multiple
                ? 'Uno o más archivos'
                : 'Arrastre o seleccione'
          }
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          disabled={loading}
          className={files.length ? 'is-success' : undefined}
        />

        <div className="tesoreria-upload-card__status">
          {error ? (
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
          ) : null}
          {message ? (
            <Alert variant="success" title="Listo">
              {message}
            </Alert>
          ) : null}
          {loading ? (
            <Alert variant="info" title={`Tiempo estimado: ~${getEstimatedTime()} s`}>
              {isPdf
                ? 'Extrayendo texto de los PDF…'
                : 'Procesando archivo Excel…'}
            </Alert>
          ) : null}
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={!files.length || loading}
          style={{ width: '100%' }}
        >
          <Icon name="download" size="sm" />
          {loading
            ? multiple && files.length > 1
              ? `Procesando ${files.length}…`
              : 'Procesando…'
            : buttonLabel}
        </Button>
      </form>
    </Card>
  )
}

const RemuneracionesDashboard = () => {
  const { can } = usePermission()
  const [searchParams, setSearchParams] = useSearchParams()
  const canConfig = can('remuneraciones.view_mapeobanco')

  const tabFromUrl = searchParams.get('tab')
  const [mainTab, setMainTab] = useState(() =>
    canConfig && tabFromUrl === 'config' ? 'config' : 'procesos',
  )

  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!canConfig && mainTab === 'config') setMainTab('procesos')
  }, [canConfig, mainTab])

  const selectMainTab = (id) => {
    setMainTab(id)
    if (id === 'config') {
      setSearchParams({ tab: 'config' }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  return (
    <div
      className="page"
      data-od-id="tesoreria-remuneraciones-page"
      {...(mainTab === 'config' && !isNarrow ? { 'data-fill-viewport': true } : {})}
    >
      <PageHeader
        icon="banknote"
        title="Remuneraciones"
        description="Procesos de tesorería y parámetros de mapeo"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Remuneraciones' },
        ]}
        linkComponent={Link}
      />

      {canConfig ? (
        <div className="tabs">
          <ul className="tabs__list" role="tablist" aria-label="Secciones Remuneraciones">
            <li>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${mainTab === 'procesos' ? ' is-active' : ''}`}
                aria-selected={mainTab === 'procesos'}
                onClick={() => selectMainTab('procesos')}
              >
                Procesos
              </button>
            </li>
            <li>
              <button
                type="button"
                role="tab"
                className={`tabs__btn${mainTab === 'config' ? ' is-active' : ''}`}
                aria-selected={mainTab === 'config'}
                onClick={() => selectMainTab('config')}
              >
                Configuración
              </button>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="tabs__panel is-active tesoreria-tab-panel" role="tabpanel">
        {mainTab === 'procesos' || !canConfig ? (
          <div className="tesoreria-upload-grid">
            <FileUploader
              title="Archivo bancos"
              description="Excel de remuneraciones → formato bancario (normaliza nombres y códigos)."
              endpoint="remuneraciones/procesar-banco/"
              buttonLabel="Procesar Excel"
              accept=".xlsx,.xls"
            />
            <FileUploader
              title="Asignación familiar (PDF)"
              description="Uno o más PDF → Excel con una hoja por comprobante."
              endpoint="tesoreria/procesar-banco/"
              buttonLabel="Procesar PDFs"
              accept=".pdf"
              multiple
            />
            <FileUploader
              title="Vale Vista"
              description="Reporte estándar → archivo de pago Vale Vista."
              endpoint="remuneraciones/procesar-vale-vista/"
              buttonLabel="Procesar Vale Vista"
              accept=".xlsx,.xls"
            />
          </div>
        ) : (
          <TesoreriaConfigSection isNarrow={isNarrow} />
        )}
      </div>
    </div>
  )
}

export default RemuneracionesDashboard
