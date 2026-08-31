import React, { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api'
import { useAuth } from '../../context/AuthContext'
import { useNotify } from '../../hooks/useNotify'
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Alert,
  FileInput,
  Field,
  Input,
  Select,
  Badge,
  Modal,
  Icon,
} from '@slep/ui'

const ZOOM_MIN = 50
const ZOOM_MAX = 250
const ZOOM_STEP = 25

function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

async function readErrorMessage(error) {
  const data = error?.response?.data
  if (!data) return error?.message || 'Error al firmar el documento.'
  if (typeof data === 'string') return data
  if (data.error) return data.error
  if (data instanceof Blob) {
    try {
      const text = await data.text()
      const parsed = JSON.parse(text)
      return parsed.error || text
    } catch {
      return 'Error al firmar el documento.'
    }
  }
  return 'Error al firmar el documento.'
}

const PRESETS = [
  { id: 'tl', label: 'Superior izquierda' },
  { id: 'tr', label: 'Superior derecha' },
  { id: 'bl', label: 'Inferior izquierda' },
  { id: 'br', label: 'Inferior derecha' },
]

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/** Nombre y cargo del usuario autenticado (funcionario vinculado o datos de cuenta). */
function getSignerDefaults(user) {
  if (!user) return { name: '', role: '' }
  const fd = user.funcionario_data
  const fromFuncionario = (fd?.nombre_funcionario || '').trim()
  const fromAccount = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return {
    name: fromFuncionario || fromAccount || user.username || '',
    role: (fd?.cargo || '').trim(),
  }
}

export default function FirmaPrueba() {
  const { user } = useAuth()
  const { notify } = useNotify()
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState(null)
  const [capsLoading, setCapsLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [otp, setOtp] = useState('')
  const [signatureMode, setSignatureMode] = useState('atendida')
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('')
  const [testRut, setTestRut] = useState('')
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [fileKey, setFileKey] = useState(0)

  const [preview, setPreview] = useState(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [stampBox, setStampBox] = useState({ x: 0, y: 0, w: 160, h: 56 })
  const dragRef = useRef(null)
  const stageRef = useRef(null)
  const viewportRef = useRef(null)

  useEffect(() => {
    const defaults = getSignerDefaults(user)
    setSignerName(defaults.name)
    setSignerRole(defaults.role)
  }, [user])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp || !preview) return
    const centerTop = () => {
      const maxX = Math.max(0, vp.scrollWidth - vp.clientWidth)
      vp.scrollLeft = maxX / 2
      vp.scrollTop = 0
    }
    centerTop()
    // Esperar layout tras cambio de zoom/ancho
    requestAnimationFrame(centerTop)
  }, [zoom, preview, page, modalOpen])

  const loadConfig = useCallback(async ({ notifyResult = false } = {}) => {
    setCapsLoading(true)
    setConfigError(null)
    try {
      const { data } = await api.get('firma-digital/config/')
      setConfig(data)
      if (notifyResult) {
        const env = data?.firma_dep?.environment || 'desconocido'
        const api = data?.firma_dep?.apiUrl || data?.api_url || '—'
        if (data?.firma_dep_error) {
          notify({
            variant: 'warning',
            text: `firma-dep: ${data.firma_dep_error}`,
          })
        } else {
          notify({
            variant: 'success',
            text: `Capabilities OK · ambiente ${env} · ${api}`,
          })
        }
      }
      return data
    } catch (err) {
      const msg =
        err?.response?.data?.detail
        || err?.response?.data?.error
        || 'No se pudo cargar la configuración de FirmaGob.'
      setConfigError(msg)
      if (notifyResult) {
        notify({ variant: 'danger', text: msg })
      }
      return null
    } finally {
      setCapsLoading(false)
    }
  }, [notify])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const loadPreview = useCallback(async (pdfFile, pageNum, { openModal = false } = {}) => {
    if (!pdfFile) return
    setPreviewLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', pdfFile)
      formData.append('page', String(pageNum))
      const { data } = await api.post('firma-digital/preview/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(data)
      const stampW = Math.round(
        (data.page_width_pt ? 205 / data.page_width_pt : 0.28) * data.preview_width_px,
      )
      const stampH = Math.round(
        (data.page_height_pt ? 84 / data.page_height_pt : 0.1) * data.preview_height_px,
      )
      const margin = 16
      setStampBox({
        w: stampW,
        h: stampH,
        x: Math.max(margin, data.preview_width_px - stampW - margin),
        y: Math.max(margin, data.preview_height_px - stampH - margin),
      })
      setZoom(100)
      if (openModal) setModalOpen(true)
    } catch (err) {
      setPreview(null)
      setModalOpen(false)
      notify({
        variant: 'danger',
        text: err?.response?.data?.error || 'No se pudo generar la vista previa del PDF.',
      })
    } finally {
      setPreviewLoading(false)
    }
  }, [notify])

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null
    setFile(selected)
    setPreview(null)
    setPage(1)
    setModalOpen(false)
    if (selected) loadPreview(selected, 1, { openModal: true })
  }

  const handlePageChange = (e) => {
    const next = Number(e.target.value) || 1
    setPage(next)
    if (file) loadPreview(file, next)
  }

  const applyPreset = (id) => {
    if (!preview) return
    const margin = 16
    const { w, h } = stampBox
    const maxX = preview.preview_width_px - w - margin
    const maxY = preview.preview_height_px - h - margin
    const map = {
      br: { x: maxX, y: maxY },
      bl: { x: margin, y: maxY },
      tr: { x: maxX, y: margin },
      tl: { x: margin, y: margin },
    }
    const pos = map[id]
    if (pos) setStampBox((prev) => ({ ...prev, ...pos }))
  }

  const onStampPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || !preview) return
    const scaleX = preview.preview_width_px / rect.width
    const scaleY = preview.preview_height_px / rect.height
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: stampBox.x,
      originY: stampBox.y,
      scaleX,
      scaleY,
    }
  }

  const onStampPointerMove = (e) => {
    const drag = dragRef.current
    if (!drag || !preview) return
    const dx = (e.clientX - drag.startClientX) * drag.scaleX
    const dy = (e.clientY - drag.startClientY) * drag.scaleY
    setStampBox((prev) => ({
      ...prev,
      x: clamp(drag.originX + dx, 0, preview.preview_width_px - prev.w),
      y: clamp(drag.originY + dy, 0, preview.preview_height_px - prev.h),
    }))
  }

  const onStampPointerUp = () => {
    dragRef.current = null
  }

  const boxToPdfCoords = () => {
    if (!preview) return null
    const sx = preview.page_width_pt / preview.preview_width_px
    const sy = preview.page_height_pt / preview.preview_height_px
    const llx = Math.round(stampBox.x * sx)
    const urx = Math.round((stampBox.x + stampBox.w) * sx)
    const ury = Math.round(preview.page_height_pt - stampBox.y * sy)
    const lly = Math.round(preview.page_height_pt - (stampBox.y + stampBox.h) * sy)
    return { llx, lly, urx, ury }
  }

  const resetStampForm = () => {
    const defaults = getSignerDefaults(user)
    setOtp('')
    setSignerName(defaults.name)
    setSignerRole(defaults.role)
  }

  const clearAll = () => {
    setFile(null)
    setPreview(null)
    setPage(1)
    setModalOpen(false)
    resetStampForm()
    setFileKey((k) => k + 1)
  }

  const closeModal = () => {
    if (loading) return
    setModalOpen(false)
  }

  const handleSign = async () => {
    if (!file) {
      notify({ variant: 'warning', text: 'Seleccione un archivo PDF.' })
      return
    }
    if (!preview) {
      notify({ variant: 'warning', text: 'Espere a que cargue la vista previa del PDF.' })
      return
    }
    if (signatureMode === 'atendida' && !/^\d{6}$/.test(otp.trim())) {
      notify({
        variant: 'warning',
        text: 'Ingrese el OTP de 6 dígitos de Google Authenticator (certificado FirmaGob).',
      })
      return
    }
    if (!signerName.trim()) {
      notify({
        variant: 'warning',
        text: 'Su usuario no tiene funcionario vinculado con nombre. Configure el perfil.',
      })
      return
    }

    const coords = boxToPdfCoords()
    if (!coords) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('mode', signatureMode)
    formData.append('with_stamp', '1')
    formData.append('signer_name', signerName.trim())
    if (signerRole.trim()) formData.append('signer_role', signerRole.trim())
    formData.append('page', String(page))
    formData.append('llx', String(coords.llx))
    formData.append('lly', String(coords.lly))
    formData.append('urx', String(coords.urx))
    formData.append('ury', String(coords.ury))
    if (signatureMode === 'atendida') {
      formData.append('otp', otp.trim())
    }
    const isSandboxEnv = (config?.firma_dep?.environment || '').toLowerCase() === 'test'
    const sandboxAtendida = /11\.?111\.?111-1/i.test(testRut) || /11111111/i.test(testRut)
    const sandboxDesatendida = /22\.?222\.?222-2/i.test(testRut) || /22222222/i.test(testRut)
    if (testRut.trim()) {
      formData.append('rut', testRut.trim())
    } else if (isSandboxEnv && signatureMode === 'desatendida') {
      formData.append('rut', '22.222.222-2')
    } else if (isSandboxEnv && signatureMode === 'atendida') {
      formData.append('rut', '11.111.111-1')
    }
    // Solo forzar entity SEGPRES en sandbox / RUTs de prueba del manual.
    if (
      isSandboxEnv
      && (
        sandboxAtendida
        || sandboxDesatendida
        || !testRut.trim()
      )
    ) {
      formData.append('entity', 'Subsecretaría General de la Presidencia')
    }

    try {
      const response = await api.post('firma-digital/probar/', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const baseName = file.name?.replace(/\.pdf$/i, '') || 'documento'
      downloadBlob(response.data, `${baseName}_firmado.pdf`)
      const codigo =
        response.headers?.['x-sgaf-documento-codigo'] ||
        response.headers?.['X-SGAF-Documento-Codigo']
      notify({
        variant: 'success',
        text: codigo
          ? `Documento firmado (${signatureMode}). Código: ${codigo}`
          : `Documento firmado (${signatureMode}).`,
      })
      setModalOpen(false)
    } catch (err) {
      const message = await readErrorMessage(err)
      notify({ variant: 'danger', text: message })
    } finally {
      setLoading(false)
    }
  }

  const pageOptions = preview
    ? Array.from({ length: preview.page_count }, (_, i) => ({
        value: String(i + 1),
        label: `Página ${i + 1}`,
      }))
    : []

  const stampStyle = preview
    ? {
        left: `${(stampBox.x / preview.preview_width_px) * 100}%`,
        top: `${(stampBox.y / preview.preview_height_px) * 100}%`,
        width: `${(stampBox.w / preview.preview_width_px) * 100}%`,
        height: `${(stampBox.h / preview.preview_height_px) * 100}%`,
      }
    : undefined

  return (
    <div className="page" data-od-id="firma-prueba-page">
      <PageHeader
        title="Firma digital (prueba)"
        description="Prueba vía sidecar firma-dep. Atendida (Propósito General + OTP) u opcionalmente Desatendida (solo laboratorio CERT)."
      />

      {configError ? (
        <Alert variant="danger" title="Configuración">
          {configError}
        </Alert>
      ) : null}

      {config?.firma_dep_error ? (
        <Alert variant="warning" title="firma-dep">
          {config.firma_dep_error}
          {import.meta.env.DEV ? (
            <>
              {' '}
              Levante el servicio: <code>cd services/firma-dep && npm run start:dev</code>
            </>
          ) : (
            <>
              {' '}
              En producción verifique: <code>docker compose ps firma-dep</code>, que{' '}
              <code>FIRMA_DEP_API_KEY</code> coincida con <code>API_CLIENT_KEYS</code> en{' '}
              <code>~/sgaf/.env</code>, y reinicie con <code>docker compose up -d firma-dep backend</code>.
            </>
          )}
        </Alert>
      ) : null}

      {config ? (
        <Card>
          <CardHeader
            title="Configuración activa"
            subtitle="Django → firma-dep (:4010). Las credenciales FirmaGob viven en services/firma-dep/.env"
            actions={(
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={capsLoading}
                  onClick={() => loadConfig({ notifyResult: true })}
                >
                  Capabilities
                </Button>
                <Badge
                  variant={
                    (config.firma_dep?.environment || '').toLowerCase() === 'production'
                      ? 'success'
                      : 'accent'
                  }
                >
                  {(config.firma_dep?.environment || 'sin ambiente').toUpperCase()}
                </Badge>
                <Badge variant={signatureMode === 'desatendida' ? 'accent' : 'warning'}>
                  {signatureMode === 'desatendida' ? 'Desatendida' : 'Propósito General · OTP'}
                </Badge>
              </>
            )}
          />
          <div className="card__body">
            <p>
              <strong>Via:</strong> {config.via || 'firma-dep'}
            </p>
            <p>
              <strong>URL sidecar:</strong> {config.api_url || '—'}
            </p>
            <p>
              <strong>Entidad:</strong> {config.entity || '—'}
            </p>
            <p>
              <strong>RUN firmante (perfil):</strong> {config.run || '—'}
            </p>
            {config.firma_dep?.environment ? (
              <p>
                <strong>Ambiente FirmaGob:</strong>
                {' '}
                {config.firma_dep.environment}
                {config.firma_dep.apiUrl ? (
                  <>
                    {' '}
                    (
                    <code>{config.firma_dep.apiUrl}</code>
                    )
                  </>
                ) : null}
              </p>
            ) : (
              <Alert variant="warning" title="Sin capabilities">
                No se obtuvo respuesta de firma-dep. Verifique que esté corriendo en :4010.
              </Alert>
            )}
            {config.firma_dep?.supports?.signatureModes ? (
              <p>
                <strong>Modos sidecar:</strong>
                {' '}
                {[
                  config.firma_dep.supports.signatureModes.atendida !== false ? 'atendida' : null,
                  config.firma_dep.supports.signatureModes.desatendida ? 'desatendida' : null,
                ].filter(Boolean).join(', ') || '—'}
              </p>
            ) : null}
            <Field label="Modo de firma (laboratorio)" htmlFor="firma-mode">
              <Select
                id="firma-mode"
                value={signatureMode}
                onChange={(e) => setSignatureMode(e.target.value)}
              >
                <option value="atendida">Atendida — Propósito General + OTP</option>
                <option value="desatendida">Desatendida — sin OTP (solo prueba CERT)</option>
              </Select>
            </Field>
            {signatureMode === 'desatendida' ? (
              <Alert variant="warning" title="Solo laboratorio">
                En CERT use RUT <code>22.222.222-2</code> (abajo). No use desatendida en bandeja RC.
              </Alert>
            ) : null}
            <Field
              label={
                (config.firma_dep?.environment || '').toLowerCase() === 'production'
                  ? 'RUT override (opcional)'
                  : 'RUT override (pruebas sandbox)'
              }
              htmlFor="firma-test-rut"
              hint={
                (config.firma_dep?.environment || '').toLowerCase() === 'production'
                  ? 'Producción: deje vacío para usar el RUT de su funcionario vinculado, o ingrese su RUT real con certificado Propósito General vigente en firma.digital.gob.cl. No use 11.111.111-1 ni 22.222.222-2.'
                  : 'Sandbox/CERT: 11.111.111-1 (atendida) o 22.222.222-2 (desatendida). Vacío = valores por defecto del lab.'
              }
            >
              <Input
                id="firma-test-rut"
                value={testRut}
                onChange={(e) => setTestRut(e.target.value)}
                placeholder={
                  (config.firma_dep?.environment || '').toLowerCase() === 'production'
                    ? 'Vacío = RUT del funcionario vinculado'
                    : signatureMode === 'desatendida'
                      ? '22.222.222-2'
                      : '11.111.111-1'
                }
              />
            </Field>
            {(config.firma_dep?.environment || '').toLowerCase() === 'production'
              && (/11\.?111\.?111-1/i.test(testRut) || /22\.?222\.?222-2/i.test(testRut)) ? (
              <Alert variant="danger" title="RUT de sandbox en producción">
                <code>11.111.111-1</code> y <code>22.222.222-2</code> solo funcionan en ambiente CERT/sandbox.
                En producción use su RUT real y el OTP de su certificado Propósito General.
              </Alert>
            ) : null}
            {config.sello_resuelto ? (
              <p>
                <strong>Sello orgánico:</strong> {config.sello_resuelto.nombre}
                {' '}({config.sello_resuelto.nivel_label}
                {config.sello_resuelto.organo_nombre
                  ? ` · ${config.sello_resuelto.organo_nombre}`
                  : ''}
                )
              </p>
            ) : (
              <Alert variant="warning" title="Sin sello de área">
                No hay sello activo para su Unidad/Departamento/Subdirección.
                Configure uno en Funcionarios → Sellos de firma. Se firmará con el sello del sidecar.
              </Alert>
            )}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Documento a firmar"
          subtitle="Seleccione un PDF. Se abrirá un modal para ubicar el sello y firmar."
        />
        <div className="card__body">
          <FileInput
            key={fileKey}
            variant="zone"
            label="Seleccionar PDF"
            hint="Solo archivos .pdf"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
          />

          {file ? (
            <p className="firma-placement__hint">
              Archivo: <strong>{file.name}</strong>
              {previewLoading ? ' · Generando vista previa…' : null}
              {!previewLoading && preview && !modalOpen
                ? ' · Puede reabrir el modal con el botón de abajo si lo cerró.'
                : null}
            </p>
          ) : null}

          {file ? (
            <div className="firma-prueba__upload-actions">
              {preview && !modalOpen ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={previewLoading}
                  onClick={() => setModalOpen(true)}
                >
                  Reabrir modal de firma
                </Button>
              ) : null}
              <Button type="button" variant="quiet" onClick={clearAll}>
                Limpiar
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Ubicar sello y firmar"
        subheader={file?.name || 'Documento PDF'}
        size="lg"
        className="firma-placement-modal"
        overlayStatus={loading ? 'loading' : null}
        overlayTitle="Firmando documento…"
        overlayDescription="Enviando a FirmaGob. Esto puede tardar unos segundos."
        footer={
          <>
            <Button variant="quiet" onClick={closeModal} disabled={loading}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSign}
              disabled={loading || !preview || !signerName.trim()}
              loading={loading}
            >
              Firmar PDF con sello
            </Button>
          </>
        }
      >
        <div className="firma-prueba__grid">
          <div>
            {previewLoading && !preview ? (
              <Alert variant="info" title="Vista previa">
                Generando vista previa…
              </Alert>
            ) : null}

            {preview ? (
              <>
                <div className="firma-placement-toolbar" role="toolbar" aria-label="Zoom de vista previa">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || zoom <= ZOOM_MIN}
                    onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                    aria-label="Alejar"
                  >
                    −
                  </Button>
                  <span className="firma-placement-toolbar__label">{zoom}%</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={loading || zoom >= ZOOM_MAX}
                    onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                    aria-label="Acercar"
                  >
                    <Icon name="plus" size={14} />
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    disabled={loading || zoom === 100}
                    onClick={() => setZoom(100)}
                  >
                    Ajustar
                  </Button>
                </div>
                <div className="firma-placement-viewport" ref={viewportRef}>
                  <div
                    className="firma-placement-viewport__track"
                    style={{
                      width: `${Math.max(100, zoom)}%`,
                    }}
                  >
                    <div
                      className="firma-placement"
                      ref={stageRef}
                      style={{
                        width: `${(zoom / Math.max(100, zoom)) * 100}%`,
                      }}
                    >
                      <img
                        className="firma-placement__img"
                        src={`data:image/png;base64,${preview.image_base64}`}
                        alt={`Vista previa página ${page}`}
                        draggable={false}
                      />
                      <div
                        className="firma-placement__stamp"
                        style={stampStyle}
                        onPointerDown={onStampPointerDown}
                        onPointerMove={onStampPointerMove}
                        onPointerUp={onStampPointerUp}
                        onPointerCancel={onStampPointerUp}
                        role="button"
                        tabIndex={0}
                        aria-label="Arrastrar posición del sello"
                      >
                        Sello
                        <br />
                        (arrastrar)
                      </div>
                    </div>
                  </div>
                </div>
                <p className="firma-placement__hint">
                  Use + / − para el zoom. Arrastre el recuadro azul o use los botones de esquina.
                </p>
              </>
            ) : (
              !previewLoading && (
                <Alert variant="info" title="Vista previa">
                  No hay vista previa disponible.
                </Alert>
              )
            )}
          </div>

          <div className="firma-prueba__fields">
            {preview && pageOptions.length > 1 ? (
              <Field label="Página">
                <Select value={String(page)} onChange={handlePageChange}>
                  {pageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label="Posición rápida">
              <div className="firma-prueba__presets" role="group" aria-label="Esquinas del documento">
                {PRESETS.map((p) => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="firma-prueba__preset-btn"
                    disabled={!preview || loading}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </Field>

            <Field
              label="Nombre en el sello"
              required
              hint="Tomado del funcionario vinculado a su usuario."
            >
              <Input
                value={signerName}
                readOnly
                placeholder="Sin nombre en el perfil"
                disabled={loading}
              />
            </Field>

            <Field
              label="Cargo"
              hint="Tomado del funcionario vinculado a su usuario."
            >
              <Input
                value={signerRole}
                readOnly
                placeholder="Sin cargo en el perfil"
                disabled={loading}
              />
            </Field>

            {config?.sello_resuelto ? (
              <Field
                label="Imagen del sello"
                hint={`Desde ${config.sello_resuelto.nivel_label}${
                  config.sello_resuelto.organo_nombre
                    ? `: ${config.sello_resuelto.organo_nombre}`
                    : ''
                } (mantenedor de sellos).`}
              >
                {config.sello_resuelto.imagen_url ? (
                  <img
                    className="firma-prueba__sello-preview"
                    src={config.sello_resuelto.imagen_url}
                    alt={config.sello_resuelto.nombre}
                  />
                ) : (
                  <span>{config.sello_resuelto.nombre}</span>
                )}
              </Field>
            ) : (
              <Alert variant="warning" title="Sin sello de área">
                Se usará un recuadro solo con nombre y cargo. Configure el sello en
                {' '}
                <a href="/funcionarios/sellos">Funcionarios → Sellos de firma</a>.
              </Alert>
            )}

            {signatureMode === 'atendida' ? (
              <Field
                label="Código OTP"
                hint="6 dígitos de Google Authenticator del certificado FirmaGob (RA). No es el MFA de inicio de sesión de SGAF."
                required
              >
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  disabled={loading}
                />
              </Field>
            ) : (
              <Alert variant="info" title="Desatendida">
                No se envía OTP. Use RUT de prueba CERT <code>22.222.222-2</code> si firma-dep está en ambiente test.
              </Alert>
            )}

            <Alert variant="info" title={signatureMode === 'atendida' ? 'Propósito General' : 'Desatendida'}>
              {signatureMode === 'atendida'
                ? 'Cada firma exige OTP del certificado. La llamada real la hace el sidecar firma-dep.'
                : 'Solo para pruebas técnicas. La bandeja RC siempre firma en modo atendida.'}
            </Alert>
          </div>
        </div>
      </Modal>
    </div>
  )
}
