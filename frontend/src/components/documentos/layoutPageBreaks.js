import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const PAGE_GAP_PX = 32

/** @type {WeakMap<object, Set<Function>>} */
const chromeListeners = new WeakMap()

export function subscribePageChrome(page, listener) {
  if (!page) return () => {}
  let set = chromeListeners.get(page)
  if (!set) {
    set = new Set()
    chromeListeners.set(page, set)
  }
  set.add(listener)
  if (page._sgafChrome) listener(page._sgafChrome)
  return () => set.delete(listener)
}

function notifyPageChrome(page, detail) {
  page._sgafChrome = detail
  const set = chromeListeners.get(page)
  if (set) set.forEach((fn) => fn(detail))
}

function measureVar(page, name, fallback) {
  const value = getComputedStyle(page).getPropertyValue(name).trim() || fallback
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;height:${value}`
  page.appendChild(probe)
  const px = probe.offsetHeight
  probe.remove()
  return Math.max(1, px)
}

function topInPage(el, pageEl) {
  return el.getBoundingClientRect().top - pageEl.getBoundingClientRect().top
}

function heightOf(el) {
  return Math.max(0, el.getBoundingClientRect().height)
}

export function ensureSheets(page, count, pageH, gap = PAGE_GAP_PX, contentBottom = null) {
  const safeCount = Math.max(1, Math.round(count) || 1)
  const lastTop = (safeCount - 1) * (pageH + gap)
  let lastHeight = pageH
  let minHeight = safeCount * pageH + Math.max(0, safeCount - 1) * gap

  if (contentBottom != null && contentBottom > lastTop + pageH) {
    lastHeight = Math.ceil(contentBottom - lastTop)
    minHeight = Math.ceil(contentBottom)
  }

  minHeight = Math.max(minHeight, pageH)
  if (page.style.minHeight !== `${minHeight}px`) {
    page.style.minHeight = `${minHeight}px`
  }

  const detail = {
    count: safeCount,
    pageH: Math.round(pageH),
    gap,
    lastHeight: Math.round(lastHeight),
  }

  const prev = page._sgafChrome
  if (
    prev
    && prev.count === detail.count
    && prev.pageH === detail.pageH
    && prev.gap === detail.gap
    && prev.lastHeight === detail.lastHeight
  ) {
    return
  }
  notifyPageChrome(page, detail)
}

export function publishDefaultChrome(page) {
  if (!page || page.classList.contains('doc-editor__hf')) return
  const pageH = measureVar(page, '--doc-page-h', '297mm')
  ensureSheets(page, 1, pageH, PAGE_GAP_PX, pageH)
}

function isFlowDom(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.classList?.contains('sgaf-page-break')) return false
  if (el.classList?.contains('sgaf-logo-node') || el.classList?.contains('node-logoVariable')) return false
  if (el.classList?.contains('sgaf-shape-node') || el.classList?.contains('node-documentShape')) return false
  if (el.hasAttribute?.('data-sgaf-shape')) return false
  if (el.classList?.contains('doc-page__sheets') || el.classList?.contains('doc-page__gutters')) return false
  const pos = getComputedStyle(el).position
  if (pos === 'absolute' || pos === 'fixed') return false
  return true
}

function pageIndexAt(top, pageH, gap) {
  return Math.max(0, Math.floor(top / (pageH + gap)))
}

function pageContentStart(index, pageH, gap, padTop) {
  return index * (pageH + gap) + padTop
}

function pageContentEnd(index, pageH, gap, padBottom) {
  return index * (pageH + gap) + pageH - padBottom
}

function targetForBlock(top, height, pageH, padTop, padBottom) {
  const gap = PAGE_GAP_PX
  const index = pageIndexAt(Math.max(0, top), pageH, gap)
  const start = pageContentStart(index, pageH, gap, padTop)
  const end = pageContentEnd(index, pageH, gap, padBottom)

  if (top < start - 0.5) return start
  if (top >= end - 0.5) return pageContentStart(index + 1, pageH, gap, padTop)
  if (top + height <= end + 0.5) return null
  if (top <= start + 4) return null
  return pageContentStart(index + 1, pageH, gap, padTop)
}

function clearBreaks(pm) {
  pm.querySelectorAll('[data-sgaf-auto-break]').forEach((el) => {
    el.style.marginTop = ''
    el.style.paddingTop = ''
    el.style.borderTop = ''
    el.removeAttribute('data-sgaf-auto-break')
  })
  pm.querySelectorAll('.sgaf-page-break').forEach((el) => {
    el.style.height = '0px'
  })
}

function layoutExplicitBreaks(pm, page, pageH, padTop) {
  const breaks = [...pm.querySelectorAll('.sgaf-page-break')]
  for (const el of breaks) el.style.height = '0px'
  for (const el of breaks) {
    const top = topInPage(el, page)
    const index = pageIndexAt(top, pageH, PAGE_GAP_PX)
    const nextStart = pageContentStart(index + 1, pageH, PAGE_GAP_PX, padTop)
    el.style.height = `${Math.max(0, Math.round(nextStart - top))}px`
  }
}

/**
 * Paginación directa en el DOM (se reaplica en cada update del editor).
 * Respeta margen inferior y crea hojas nuevas vía ensureSheets.
 */
export function layoutEditorPagination(view) {
  const pm = view?.dom
  if (!pm?.isConnected) return
  const page = pm.closest('.doc-page')
  if (!page || page.classList.contains('doc-editor__hf')) return

  const pageH = measureVar(page, '--doc-page-h', '297mm')
  const pmStyle = getComputedStyle(pm)
  const padTop = parseFloat(pmStyle.paddingTop) || measureVar(page, '--doc-margin-top', '20mm')
  const padBottom = parseFloat(pmStyle.paddingBottom) || measureVar(page, '--doc-margin-bottom', '20mm')

  const observer = view.domObserver
  try {
    observer?.stop?.()
  } catch {
    /* ignore */
  }

  try {
    clearBreaks(pm)
    layoutExplicitBreaks(pm, page, pageH, padTop)

    for (let pass = 0; pass < 48; pass += 1) {
      let changed = false
      const blocks = [...pm.children].filter(isFlowDom)

      for (const el of blocks) {
        const top = topInPage(el, page)
        const height = heightOf(el)
        if (height <= 0) continue

        const target = targetForBlock(top, height, pageH, padTop, padBottom)
        if (target == null) continue

        const delta = Math.round(target - top)
        if (Math.abs(delta) < 2) continue

        const prev = Number.parseFloat(el.style.marginTop) || 0
        // border evita colapso de márgenes con el hermano anterior
        el.style.borderTop = '0.01px solid transparent'
        el.style.marginTop = `${Math.max(0, prev + delta)}px`
        el.setAttribute('data-sgaf-auto-break', '1')
        changed = true
        break
      }

      if (!changed) break
    }

    const pageTop = page.getBoundingClientRect().top
    let contentBottom = pm.getBoundingClientRect().bottom - pageTop
    for (const el of [...pm.children].filter(isFlowDom)) {
      contentBottom = Math.max(contentBottom, topInPage(el, page) + heightOf(el))
    }

    const sheetCount = contentBottom <= pageH + 1
      ? 1
      : Math.max(1, Math.ceil((contentBottom - pageH) / (pageH + PAGE_GAP_PX)) + 1)

    ensureSheets(page, sheetCount, pageH, PAGE_GAP_PX, contentBottom)
  } finally {
    try {
      observer?.start?.()
    } catch {
      /* ignore */
    }
  }
}

const paginationKey = new PluginKey('sgafPagination')

/** Extensión TipTap: pagina el cuerpo como Word. */
export const DocumentPagination = Extension.create({
  name: 'documentPagination',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: paginationKey,
        view: (editorView) => {
          let scheduled = false
          let ro = null

          const runAsync = () => {
            if (scheduled) return
            scheduled = true
            requestAnimationFrame(() => {
              scheduled = false
              layoutEditorPagination(editorView)
            })
          }

          // Tras cada transacción: layout síncrono (antes del paint)
          layoutEditorPagination(editorView)
          runAsync()

          if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(runAsync)
            const page = editorView.dom.closest('.doc-page')
            if (page) ro.observe(page)
            ro.observe(editorView.dom)
          }

          return {
            update: () => {
              layoutEditorPagination(editorView)
            },
            destroy: () => ro?.disconnect(),
          }
        },
        props: {
          // No dejar que PM “deshaga” nuestros margin-top de salto de hoja
          ignoreMutation(mutation) {
            const t = mutation.target
            if (!(t instanceof HTMLElement)) return false
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
              if (t.hasAttribute('data-sgaf-auto-break')) return true
              if (t.classList?.contains('sgaf-page-break')) return true
            }
            return false
          },
        },
      }),
    ]
  },
})
