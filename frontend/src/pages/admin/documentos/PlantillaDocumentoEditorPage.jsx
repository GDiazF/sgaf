import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../../api'
import { usePermission } from '../../../hooks/usePermission'
import { useNotify } from '../../../hooks/useNotify'
import DocumentRichEditor, { DocumentToolbar } from '../../../components/documentos/DocumentRichEditor'
import { DocPageFrame } from '../../../components/documentos/DocPageFrame'
import { DocumentCatalogContext } from '../../../components/documentos/LogoNodeView'
import {
  PageHeader,
  Button,
  Icon,
  Field,
  Input,
  Select,
  Switch,
  Card,
  CardHeader,
  Modal,
  FormOverlay,
  PermissionBlock,
  useFormOverlay,
  formatApiFormError,
} from '@slep/ui'
import { pageCssVars } from '../../../components/documentos/pageMetrics.js'
import { htmlHasContent } from '../../../components/documentos/hfMetrics.js'
import { layoutEditorPagination } from '../../../components/documentos/layoutPageBreaks.js'
import { syncTableIndents } from '../../../components/documentos/tableLayout.js'

const emptyPlantilla = {
  nombre: '',
  descripcion: '',
  proposito: 'borrador',
  cuerpo_html: '<p></p>',
  encabezado_html: '',
  pie_html: '',
  tamano_pagina: 'carta',
  orientacion: 'portrait',
  ancho_mm: '',
  alto_mm: '',
  margen_superior_mm: 20,
  margen_inferior_mm: 20,
  margen_izquierdo_mm: 20,
  margen_derecho_mm: 20,
  activa: true,
  es_default: false,
}

const PlantillaDocumentoEditorPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { can } = usePermission()
  const { notify } = useNotify()
  const overlay = useFormOverlay()

  const canView = can('documentos.view_plantilladocumento')
  const canChange = can('documentos.change_plantilladocumento')

  const [plantilla, setPlantilla] = useState(emptyPlantilla)
  const [catalog, setCatalog] = useState({
    variables: [],
    page_sizes: [],
    propositos: [],
    propositos_ocupados: [],
  })
  const [loading, setLoading] = useState(true)
  const [slot, setSlot] = useState('cuerpo')
  const [toolbarEditor, setToolbarEditor] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [showHfBands, setShowHfBands] = useState(true)

  const editors = useRef({ cuerpo: null, encabezado: null, pie: null })

  const activateSlot = useCallback((id) => {
    setSlot((prev) => (prev === id ? prev : id))
    const next = editors.current[id]
    if (next) setToolbarEditor((prev) => (prev === next ? prev : next))
    requestAnimationFrame(() => {
      if (!next?.view) return
      layoutEditorPagination(next.view)
      syncTableIndents(next.view)
    })
  }, [])

  const onReadyCuerpo = useCallback((editor) => {
    editors.current.cuerpo = editor
    if (editor) setToolbarEditor(editor)
  }, [])
  const onReadyEncabezado = useCallback((editor) => {
    editors.current.encabezado = editor
  }, [])
  const onReadyPie = useCallback((editor) => {
    editors.current.pie = editor
  }, [])

  const loadCatalog = useCallback(async (proposito) => {
    const catRes = await api.get('documentos/catalogo/', {
      params: proposito ? { proposito } : undefined,
    })
    setCatalog((prev) => ({
      page_sizes: catRes.data?.page_sizes || prev.page_sizes || [],
      propositos: catRes.data?.propositos || prev.propositos || [],
      propositos_ocupados: catRes.data?.propositos_ocupados || prev.propositos_ocupados || [],
      variables: catRes.data?.variables || [],
    }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const tplRes = await api.get(`documentos/plantillas/${id}/`)
      const data = { ...emptyPlantilla, ...tplRes.data }
      if (data.proposito === 'general') data.proposito = 'borrador'
      if (data.proposito === 'recepcion_junji') data.proposito = 'recepcion_rlb_junji'
      if (
        data.proposito === 'recepcion_servicio_colegio' ||
        data.proposito === 'recepcion_servicio_jardin'
      ) {
        data.proposito = 'recepcion_servicio'
      }
      setPlantilla(data)
      await loadCatalog(data.proposito || 'borrador')
    } catch {
      notify({ variant: 'danger', text: 'No se pudo cargar la plantilla.' })
      navigate('/admin/documentos')
    } finally {
      setLoading(false)
    }
  }, [id, navigate, notify, loadCatalog])

  useEffect(() => {
    if (canView) load()
  }, [canView, load])

  const patch = (partial) => setPlantilla((prev) => ({ ...prev, ...partial }))

  const handlePropositoChange = async (value) => {
    const prev = plantilla.proposito
    patch({ proposito: value })
    try {
      await loadCatalog(value)
      if (!canChange) return
      await api.patch(`documentos/plantillas/${id}/`, { proposito: value })
      notify({ variant: 'success', text: 'Asignación actualizada.' })
      await loadCatalog(value)
    } catch (err) {
      patch({ proposito: prev })
      await loadCatalog(prev)
      const msg = err?.response?.data?.proposito
      const text = Array.isArray(msg) ? msg[0] : (msg || err?.response?.data?.detail || 'No se pudo cambiar la asignación.')
      notify({ variant: 'danger', text: String(text) })
    }
  }

  const insertVariable = (variable) => {
    const editor = editors.current[slot]
    if (!editor) return
    if (variable.type === 'image') {
      editor.chain().focus().insertLogoVariable({
        key: variable.key,
        label: variable.label,
        width: '140',
        previewUrl: variable.preview_url || '',
      }).run()
    } else {
      const chain = editor.chain().focus().insertTemplateVariable({
        key: variable.key,
        label: variable.label,
      })
      // Variables de fila: marcar la fila como repetible por cada boleta.
      if (String(variable.key || '').startsWith('pago_') && editor.isActive('table')) {
        const already = editor.getAttributes('tableRow').repeat === 'pagos'
        if (!already) chain.togglePagosRepeatRow()
      }
      chain.run()
    }
  }

  const payloadFromState = () => ({
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    proposito: plantilla.proposito || 'borrador',
    cuerpo_html: editors.current.cuerpo?.getHTML?.() ?? plantilla.cuerpo_html,
    encabezado_html: editors.current.encabezado?.getHTML?.() ?? plantilla.encabezado_html,
    pie_html: editors.current.pie?.getHTML?.() ?? plantilla.pie_html,
    tamano_pagina: plantilla.tamano_pagina,
    orientacion: plantilla.orientacion,
    ancho_mm: plantilla.tamano_pagina === 'personalizado' ? plantilla.ancho_mm || null : null,
    alto_mm: plantilla.tamano_pagina === 'personalizado' ? plantilla.alto_mm || null : null,
    margen_superior_mm: plantilla.margen_superior_mm,
    margen_inferior_mm: plantilla.margen_inferior_mm,
    margen_izquierdo_mm: plantilla.margen_izquierdo_mm,
    margen_derecho_mm: plantilla.margen_derecho_mm,
    activa: plantilla.activa,
  })

  const handleSave = async () => {
    try {
      await overlay.run(
        async () => {
          const res = await api.patch(`documentos/plantillas/${id}/`, payloadFromState())
          setPlantilla((prev) => ({ ...prev, ...res.data }))
        },
        {
          successDescription: 'Plantilla guardada.',
          formatError: (err) => formatApiFormError(err, 'No se pudo guardar.'),
        },
      )
    } catch {
      // overlay
    }
  }

  const handlePreview = async () => {
    setPreviewLoading(true)
    setPreviewOpen(true)
    try {
      const res = await api.post(`documentos/plantillas/${id}/preview/`, payloadFromState())
      setPreviewHtml(res.data.html || '')
    } catch {
      notify({ variant: 'danger', text: 'No se pudo generar la vista previa.' })
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handlePdf = async () => {
    try {
      const res = await api.post(`documentos/plantillas/${id}/preview-pdf/`, payloadFromState(), {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${plantilla.nombre || 'plantilla'}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      notify({ variant: 'danger', text: 'No se pudo generar el PDF. Verifique que Chromium de Playwright esté instalado.' })
    }
  }

  const handleExport = async () => {
    try {
      const res = await api.get(`documentos/plantillas/${id}/exportar/`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${(plantilla.nombre || 'plantilla').replace(/\s+/g, '-')}.sgaf-plantilla.json`
      link.click()
      window.URL.revokeObjectURL(url)
      notify({ variant: 'success', text: 'Plantilla exportada.' })
    } catch {
      notify({ variant: 'danger', text: 'No se pudo exportar la plantilla.' })
    }
  }

  const propositoMeta = (catalog.propositos || []).find(
    (item) => item.key === (plantilla.proposito || 'borrador'),
  )
  const variablesSubtitle = propositoMeta
    ? (
      plantilla.proposito === 'borrador'
        ? 'Borrador: se muestran TODAS las variables. Asigná un propósito para filtrar.'
        : `Catálogo de «${propositoMeta.label}» (${(catalog.variables || []).length} grupos).`
    )
    : 'Insertá variables según el propósito asignado.'

  const logosByKey = useMemo(() => {
    const map = {}
    for (const group of catalog.variables || []) {
      for (const variable of group.variables || []) {
        if (variable.type === 'image' && variable.preview_url) {
          map[variable.key] = variable.preview_url
        }
      }
    }
    return map
  }, [catalog])

  const cssVars = useMemo(
    () => pageCssVars(plantilla, catalog.page_sizes || []),
    [plantilla, catalog.page_sizes],
  )

  const headerInUse = htmlHasContent(plantilla.encabezado_html)
  const footerInUse = htmlHasContent(plantilla.pie_html)
  const hfOverlay = useMemo(
    () => ({
      show: showHfBands && slot === 'cuerpo',
      headerHtml: plantilla.encabezado_html || '',
      footerHtml: plantilla.pie_html || '',
      onEditHeader: () => activateSlot('encabezado'),
      onEditFooter: () => activateSlot('pie'),
    }),
    [
      showHfBands,
      slot,
      plantilla.encabezado_html,
      plantilla.pie_html,
      activateSlot,
    ],
  )

  useEffect(() => {
    for (const editor of Object.values(editors.current)) {
      if (editor?.view) {
        layoutEditorPagination(editor.view)
        syncTableIndents(editor.view)
      }
    }
  }, [cssVars])

  if (!canView) {
    return (
      <div className="page" data-od-id="plantilla-documento-editor-page">
        <PermissionBlock title="Acceso denegado" description="No tiene permiso para ver esta plantilla." />
      </div>
    )
  }

  return (
    <div className="page" data-od-id="plantilla-documento-editor-page" data-fill-viewport>
      <PageHeader
        icon="procedimientos"
        title={plantilla.nombre || 'Plantilla'}
        description="Maquetado tipo Word · variables y logos"
        breadcrumbs={[
          { label: 'Inicio', to: '/' },
          { label: 'Plantillas de documentos', to: '/admin/documentos' },
          { label: plantilla.nombre || 'Editor' },
        ]}
        linkComponent={Link}
        split
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => navigate('/admin/documentos')}>
              Volver
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePreview} disabled={loading}>
              <Icon name="eye" size="sm" /> Vista previa
            </Button>
            <Button variant="secondary" size="sm" onClick={handlePdf} disabled={loading}>
              <Icon name="download" size="sm" /> PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading}>
              <Icon name="download" size="sm" /> Exportar
            </Button>
            {canChange ? (
              <Button variant="primary" size="sm" onClick={handleSave} disabled={overlay.busy || loading}>
                <Icon name="check" size="sm" /> Guardar
              </Button>
            ) : null}
          </>
        }
      />

      {loading ? (
        <p>Cargando editor…</p>
      ) : (
        <div className="doc-editor">
          <FormOverlay
            status={overlay.status}
            title={overlay.title}
            description={overlay.description}
            onDismiss={overlay.dismiss}
          >
          <DocumentCatalogContext.Provider value={{ logosByKey }}>
          <DocumentToolbar
            editor={toolbarEditor}
            pageSetup={{
              plantilla,
              pageSizes: catalog.page_sizes || [],
              canChange,
              onChange: patch,
            }}
          />

          <ul className="tabs__list" role="tablist" aria-label="Secciones del documento">
            {[
              { id: 'cuerpo', label: 'Cuerpo' },
              { id: 'encabezado', label: 'Encabezado' },
              { id: 'pie', label: 'Pie de página' },
            ].map((tab) => (
              <li key={tab.id}>
                <button
                  type="button"
                  className={`tabs__btn${slot === tab.id ? ' is-active' : ''}`}
                  onClick={() => activateSlot(tab.id)}
                >
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          <div className="doc-editor__workspace">
            <div className="doc-editor__canvas-wrap">
              <DocPageFrame style={cssVars} hidden={slot !== 'cuerpo'} hfOverlay={hfOverlay}>
                <DocumentRichEditor
                  content={plantilla.cuerpo_html}
                  onChange={(html) => patch({ cuerpo_html: html })}
                  onReady={onReadyCuerpo}
                  onFocus={() => activateSlot('cuerpo')}
                  editable={canChange}
                  placeholder="Escriba el cuerpo del documento. Inserte variables desde el panel."
                />
              </DocPageFrame>
              <DocPageFrame
                className="doc-editor__hf"
                variant="header"
                style={cssVars}
                hidden={slot !== 'encabezado'}
              >
                <DocumentRichEditor
                  content={plantilla.encabezado_html}
                  onChange={(html) => patch({ encabezado_html: html })}
                  onReady={onReadyEncabezado}
                  onFocus={() => activateSlot('encabezado')}
                  editable={canChange}
                  compact
                  placeholder="Encabezado (18 mm, se repite en cada hoja del PDF). Logos de encabezado van aquí."
                />
              </DocPageFrame>
              <DocPageFrame
                className="doc-editor__hf"
                variant="footer"
                style={cssVars}
                hidden={slot !== 'pie'}
              >
                <DocumentRichEditor
                  content={plantilla.pie_html}
                  onChange={(html) => patch({ pie_html: html })}
                  onReady={onReadyPie}
                  onFocus={() => activateSlot('pie')}
                  editable={canChange}
                  compact
                  placeholder="Pie de página (12 mm). El PDF agrega el número de hoja."
                />
              </DocPageFrame>
            </div>

            <aside className="doc-editor__sidebar">
              <Card>
                <CardHeader title="Plantilla" subtitle="Nombre y estado" />
                <div className="doc-page-setup">
                  <Field label="Nombre" htmlFor="doc-nombre">
                    <Input
                      id="doc-nombre"
                      value={plantilla.nombre}
                      disabled={!canChange}
                      onChange={(e) => patch({ nombre: e.target.value })}
                    />
                  </Field>
                  <Field
                    label="Asignación / propósito"
                    htmlFor="doc-proposito"
                    hint={
                      propositoMeta?.description
                      || 'Define qué variables verás y qué módulo usará esta plantilla al descargar. Recepción de servicio admite varias variantes.'
                    }
                  >
                    <Select
                      id="doc-proposito"
                      value={plantilla.proposito || 'borrador'}
                      disabled={!canChange}
                      onChange={(e) => handlePropositoChange(e.target.value)}
                    >
                      {(catalog.propositos || []).map((item) => {
                        const multi = item.key === 'recepcion_servicio'
                        const ocupado = !multi
                          && (catalog.propositos_ocupados || []).includes(item.key)
                          && item.key !== (plantilla.proposito || 'borrador')
                          && item.key !== 'borrador'
                        return (
                          <option key={item.key} value={item.key} disabled={ocupado}>
                            {item.label}{ocupado ? ' (ya asignada)' : ''}
                          </option>
                        )
                      })}
                      {(catalog.propositos || []).length === 0 ? (
                        <>
                          <option value="borrador">Sin asignación (borrador)</option>
                          <option value="recepcion_roc">ROC — Recepción con contrato / OC</option>
                          <option value="recepcion_rcf">RCF — Recepción sin OC</option>
                          <option value="recepcion_rca">RCA — Compra ágil</option>
                          <option value="recepcion_rlb_unitario">RLB — Un registro (enviar a pago)</option>
                          <option value="recepcion_rlb">RLB — Recepción conforme (1 o más pagos)</option>
                          <option value="recepcion_rlb_junji">RLB — Monto JUNJI</option>
                          <option value="recepcion_servicio">Recepción de servicio</option>
                        </>
                      ) : null}
                    </Select>
                  </Field>
                  <Switch
                    label="Plantilla activa"
                    checked={!!plantilla.activa}
                    disabled={!canChange}
                    onChange={(e) => patch({ activa: e.target.checked })}
                  />
                  {plantilla.proposito === 'recepcion_servicio' ? (
                    <Switch
                      label="Predeterminada del sistema"
                      checked={!!plantilla.es_default}
                      disabled={!canChange}
                      onChange={(e) => patch({ es_default: e.target.checked })}
                    />
                  ) : null}
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Encabezado y pie"
                  subtitle="Zonas fijas que se repiten en cada hoja del PDF (18 mm / 12 mm)."
                />
                <div className="doc-page-setup">
                  <Switch
                    label="Mostrar zonas en la hoja"
                    checked={showHfBands}
                    disabled={!headerInUse && !footerInUse}
                    onChange={(e) => setShowHfBands(e.target.checked)}
                  />
                  <p className="doc-hf-status">
                    Encabezado: {headerInUse ? 'en uso' : 'vacío'}
                    {' · '}
                    Pie: {footerInUse ? 'en uso' : 'vacío'}
                  </p>
                  <div className="doc-hf-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => activateSlot('encabezado')}
                    >
                      Editar encabezado
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => activateSlot('pie')}
                    >
                      Editar pie
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Variables"
                  subtitle={variablesSubtitle}
                />
                {(catalog.variables || []).map((group) => (
                  <div key={group.key} className="doc-var-group">
                    <h3 className="doc-var-group__title">{group.label}</h3>
                    <div className={group.key === 'logos' ? 'doc-logo-grid' : 'doc-var-list'}>
                      {(group.variables || []).map((variable) => (
                        variable.type === 'image' ? (
                          <button
                            key={variable.key}
                            type="button"
                            className="doc-logo-tile"
                            disabled={!canChange}
                            title={variable.label}
                            onClick={() => insertVariable(variable)}
                          >
                            {variable.preview_url ? (
                              <img src={variable.preview_url} alt="" />
                            ) : (
                              <span className="doc-logo-tile__empty">Sin archivo</span>
                            )}
                            <span className="doc-logo-tile__name">{variable.label}</span>
                          </button>
                        ) : (
                          <div key={variable.key} className="doc-var-item">
                            <Button
                              type="button"
                              variant="quiet"
                              size="sm"
                              disabled={!canChange}
                              title={variable.hint || `{{ ${variable.key} }}`}
                              onClick={() => insertVariable(variable)}
                            >
                              {variable.label}
                            </Button>
                            {variable.hint ? (
                              <p className="doc-var-item__hint">{variable.hint}</p>
                            ) : null}
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            </aside>
          </div>
          </DocumentCatalogContext.Provider>
          </FormOverlay>
        </div>
      )}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Vista previa con datos de ejemplo"
        size="xl"
        footer={
          <Button variant="secondary" onClick={() => setPreviewOpen(false)}>Cerrar</Button>
        }
      >
        {previewLoading ? (
          <p>Generando vista previa…</p>
        ) : (
          <iframe
            title="Vista previa"
            srcDoc={previewHtml}
            className="doc-preview-frame"
          />
        )}
      </Modal>
    </div>
  )
}

export default PlantillaDocumentoEditorPage
