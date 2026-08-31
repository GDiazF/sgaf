import atexit
import base64
import concurrent.futures
import mimetypes
import os
import re
import threading
import time
from html import escape

from bs4 import BeautifulSoup
from .page_sizes import resolve_page_mm
from .logos import resolve_logo_path
from .variables import known_variable_keys

VAR_RE = re.compile(r'\{\{\s*([a-zA-Z0-9_]+)\s*\}\}')


def _file_to_data_uri(path):
    if not path or not os.path.isfile(path):
        return ''
    mime = mimetypes.guess_type(path)[0] or 'image/png'
    with open(path, 'rb') as handle:
        encoded = base64.b64encode(handle.read()).decode('ascii')
    return f'data:{mime};base64,{encoded}'


def _substitute_text(html, context):
    keys = known_variable_keys()

    def repl(match):
        name = match.group(1)
        if name not in keys and name not in context:
            return match.group(0)
        value = context.get(name, '')
        if value is None:
            return ''
        # HTML confiable armado en el servidor (p. ej. listados de pagos)
        if name.endswith('_html'):
            return str(value)
        return escape(str(value), quote=False)

    return VAR_RE.sub(repl, html or '')


def _fragment_soup(html):
    soup = BeautifulSoup(f'<div id="__sgaf">{html or ""}</div>', 'html.parser')
    return soup, soup.find(id='__sgaf')


def _merge_style(el, **decls):
    current = el.get('style') or ''
    styles = {}
    for part in current.split(';'):
        if ':' not in part:
            continue
        prop, value = part.split(':', 1)
        styles[prop.strip().lower()] = value.strip()
    for prop, value in decls.items():
        if value is None:
            styles.pop(prop.lower(), None)
        else:
            styles[prop.lower()] = str(value)
    el['style'] = '; '.join(f'{k}: {v}' for k, v in styles.items() if v)


def _ensure_logo_img(soup, node, key, uri):
    if node.name != 'img':
        img = soup.new_tag('img')
        img['alt'] = node.get('alt') or key
        for attr in ('style', 'data-left', 'data-top', 'data-preview', 'class', 'width'):
            if node.get(attr) and not img.get(attr):
                img[attr] = node.get(attr)
        node.replace_with(img)
        node = img
    node['data-sgaf-logo'] = key
    if uri:
        node['src'] = uri
    node['alt'] = node.get('alt') or key
    width = node.get('width') or '140'
    node['width'] = width
    extras = {'position': 'absolute', 'width': f'{width}px', 'height': 'auto'}
    if node.get('data-left') and 'left:' not in (node.get('style') or '').replace(' ', ''):
        extras['left'] = f"{node.get('data-left')}%"
    if node.get('data-top') and 'top:' not in (node.get('style') or '').replace(' ', ''):
        extras['top'] = f"{node.get('data-top')}%"
    _merge_style(node, **extras)
    return node


def _layout_tables(root, soup):
    for table in root.find_all('table'):
        first_row = table.find('tr')
        if not first_row:
            continue
        widths = []
        cells = first_row.find_all(['th', 'td'], recursive=False)
        for cell in cells:
            span = max(1, int(cell.get('colspan') or 1))
            raw = cell.get('colwidth') or ''
            parts = []
            for chunk in str(raw).split(','):
                chunk = chunk.strip()
                if chunk.isdigit():
                    parts.append(int(chunk))
            while len(parts) < span:
                parts.append(0)
            widths.extend(parts[:span])
        if not any(w > 0 for w in widths):
            continue
        existing = table.find('colgroup')
        if existing:
            existing.decompose()
        colgroup = soup.new_tag('colgroup')
        total = 0
        for width in widths:
            px = width if width > 0 else 32
            total += px
            col = soup.new_tag('col')
            col['style'] = f'width: {px}px'
            colgroup.append(col)
        table.insert(0, colgroup)
        indent = table.get('data-indent')
        _merge_style(table, width=f'{total}px')
        if indent and str(indent).isdigit() and int(indent) > 0:
            _merge_style(table, **{'margin-left': f'{indent}px'})


def _preserve_blank_paragraphs(root, soup):
    """TipTap guarda Enter como <p></p>; sin <br> el navegador/PDF los colapsa."""
    for p in root.find_all('p'):
        if p.find(['img', 'table', 'ul', 'ol', 'blockquote']):
            continue
        if p.get_text(strip=True):
            continue
        # Solo espacios / vacío / un br suelto → forzar línea visible
        meaningful = [
            child for child in p.children
            if getattr(child, 'name', None) not in (None, 'br')
            or (isinstance(child, str) and child.strip())
        ]
        if meaningful:
            continue
        p.clear()
        p.append(soup.new_tag('br'))


def _apply_logos(html, context):
    if not html:
        return html
    soup, root = _fragment_soup(html)
    if root is None:
        return html
    layer = soup.new_tag('div')
    layer['class'] = 'doc-logo-layer'
    for node in list(root.select('[data-sgaf-logo]')):
        key = node.get('data-sgaf-logo') or ''
        uri = context.get(key) or _file_to_data_uri(resolve_logo_path(key))
        node = _ensure_logo_img(soup, node, key, uri)
        layer.append(node.extract())
    if layer.contents:
        root.insert(0, layer)
    _layout_tables(root, soup)
    _preserve_blank_paragraphs(root, soup)
    return root.decode_contents()


def _row_mentions_pago_vars(tr):
    if (tr.get('data-sgaf-repeat') or '') == 'pagos':
        return True
    for el in tr.select('[data-sgaf-var]'):
        key = el.get('data-sgaf-var') or ''
        if key.startswith('pago_'):
            return True
    text = tr.get_text() or ''
    if '{{' in text and 'pago_' in text:
        return True
    return False


def _fill_fragment_with_context(fragment_html, context):
    """Sustituye {{ vars }} y spans data-sgaf-var dentro de un fragmento."""
    filled = _substitute_text(fragment_html or '', context)
    soup = BeautifulSoup(filled, 'html.parser')
    for el in soup.select('[data-sgaf-var]'):
        key = el.get('data-sgaf-var') or ''
        if key in context:
            value = context.get(key)
            if value is None:
                value = ''
            if key.endswith('_html'):
                el.clear()
                el.append(BeautifulSoup(str(value), 'html.parser'))
            else:
                el.string = str(value)
            # Quitar aspecto de chip en PDF
            classes = [c for c in (el.get('class') or []) if c != 'sgaf-var']
            if classes:
                el['class'] = classes
            elif 'class' in el.attrs:
                del el['class']
    return soup


def _expand_repeating_pago_rows(html, pagos_rows):
    """
    Si una fila de tabla usa variables pago_* (o data-sgaf-repeat=pagos),
    se clona una vez por cada boleta y se rellenan esas variables.
    """
    rows_data = list(pagos_rows or [])
    if not rows_data:
        rows_data = [{}]

    soup, root = _fragment_soup(html)
    if root is None:
        return html or ''

    for table in root.find_all('table'):
        for tr in list(table.find_all('tr')):
            if not _row_mentions_pago_vars(tr):
                continue
            parent = tr.parent
            if parent is None:
                continue
            for reg in rows_data:
                clone_soup = _fill_fragment_with_context(str(tr), reg)
                new_tr = clone_soup.find('tr')
                if new_tr is None:
                    continue
                if 'data-sgaf-repeat' in new_tr.attrs:
                    del new_tr['data-sgaf-repeat']
                tr.insert_before(new_tr)
            tr.decompose()

    return root.decode_contents()


def fill_html(html, context):
    pagos_rows = context.get('_pagos_rows') if isinstance(context, dict) else None
    body = html or ''
    if pagos_rows is not None:
        body = _expand_repeating_pago_rows(body, pagos_rows)
    filled = _substitute_text(body, context)
    return _apply_logos(filled, context)


def _page_css(width_mm, height_mm, margins):
    top, right, bottom, left = margins
    return f"""
      html, body {{
        margin: 0;
        padding: 0;
        color: #111;
        font-family: "Calibri", "Source Sans 3", "Segoe UI", sans-serif;
        font-size: 11pt;
        line-height: 1.35;
      }}
      .doc-body {{
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: {width_mm}mm;
        min-height: {height_mm}mm;
        padding: {top}mm {right}mm {bottom}mm {left}mm;
        background: #fff;
        overflow-x: hidden;
        overflow-wrap: anywhere;
        word-wrap: break-word;
        word-break: break-word;
      }}
      .sgaf-var {{
        background: transparent;
        border: 0;
        padding: 0;
        font: inherit;
        color: inherit;
        white-space: normal;
        overflow-wrap: anywhere;
        word-break: break-word;
      }}
      p {{
        margin: 0 0 0.4em;
        min-height: 1.35em;
        line-height: 1.35;
        overflow-wrap: anywhere;
        word-break: break-word;
      }}
      h1 {{ font-size: 18pt; margin: 0 0 0.5em; }}
      h2 {{ font-size: 14pt; margin: 0 0 0.45em; }}
      h3 {{ font-size: 12pt; margin: 0 0 0.4em; }}
      ul {{
        list-style-type: disc;
        list-style-position: outside;
        padding-left: 1.75em;
        margin: 0 0 0.5em;
      }}
      ol {{
        list-style-type: decimal;
        list-style-position: outside;
        padding-left: 1.75em;
        margin: 0 0 0.5em;
      }}
      ul ul {{ list-style-type: circle; }}
      ul ul ul {{ list-style-type: square; }}
      ol ol {{ list-style-type: lower-alpha; }}
      ol ol ol {{ list-style-type: lower-roman; }}
      li {{ display: list-item; }}
      li p {{ margin: 0; }}
      table {{
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
        max-width: 100%;
        margin: 0.4em 0;
        box-sizing: border-box;
      }}
      table[style*="width:"] {{
        max-width: 100%;
      }}
      td, th {{
        border: 1px solid #333;
        padding: 4px 6px;
        vertical-align: top;
        max-width: 0;
        overflow-wrap: anywhere;
        word-wrap: break-word;
        word-break: break-word;
      }}
      table[data-borders='0'] td,
      table[data-borders='0'] th,
      table[data-borders='none'] td,
      table[data-borders='none'] th,
      table[data-borders='outer'] td,
      table[data-borders='outer'] th,
      table[data-borders='inner'] td,
      table[data-borders='inner'] th,
      table[data-borders='horizontal'] td,
      table[data-borders='horizontal'] th,
      table[data-borders='vertical'] td,
      table[data-borders='vertical'] th,
      table[data-borders='top'] td,
      table[data-borders='top'] th,
      table[data-borders='bottom'] td,
      table[data-borders='bottom'] th,
      table[data-borders='left'] td,
      table[data-borders='left'] th,
      table[data-borders='right'] td,
      table[data-borders='right'] th,
      table[data-borders='top-bottom'] td,
      table[data-borders='top-bottom'] th,
      table[data-borders='left-right'] td,
      table[data-borders='left-right'] th {{
        border-color: transparent;
      }}
      table[data-borders='outer'] tr:first-child > *,
      table[data-borders='top'] tr:first-child > *,
      table[data-borders='top-bottom'] tr:first-child > * {{
        border-top-color: #333;
      }}
      table[data-borders='outer'] tr:last-child > *,
      table[data-borders='bottom'] tr:last-child > *,
      table[data-borders='top-bottom'] tr:last-child > * {{
        border-bottom-color: #333;
      }}
      table[data-borders='outer'] tr > *:first-child,
      table[data-borders='left'] tr > *:first-child,
      table[data-borders='left-right'] tr > *:first-child {{
        border-left-color: #333;
      }}
      table[data-borders='outer'] tr > *:last-child,
      table[data-borders='right'] tr > *:last-child,
      table[data-borders='left-right'] tr > *:last-child {{
        border-right-color: #333;
      }}
      table[data-borders='inner'] td,
      table[data-borders='inner'] th {{
        border-color: #333;
      }}
      table[data-borders='inner'] tr:first-child > * {{ border-top-color: transparent; }}
      table[data-borders='inner'] tr:last-child > * {{ border-bottom-color: transparent; }}
      table[data-borders='inner'] tr > *:first-child {{ border-left-color: transparent; }}
      table[data-borders='inner'] tr > *:last-child {{ border-right-color: transparent; }}
      table[data-borders='horizontal'] td,
      table[data-borders='horizontal'] th {{
        border-top-color: #333;
        border-bottom-color: #333;
      }}
      table[data-borders='vertical'] td,
      table[data-borders='vertical'] th {{
        border-left-color: #333;
        border-right-color: #333;
      }}
      td p, th p {{
        overflow-wrap: anywhere;
        word-break: break-word;
        max-width: 100%;
      }}
      th {{ font-weight: 400; background-color: #f3f4f6; }}
      strong, b {{ font-weight: 700; }}
      td[data-height], th[data-height] {{
        overflow: hidden;
      }}
      td[data-height] p, th[data-height] p {{
        margin: 0;
        overflow: hidden;
      }}
      td[data-align='center'], th[data-align='center'] {{ text-align: center; }}
      td[data-align='right'], th[data-align='right'] {{ text-align: right; }}
      td[data-valign='middle'], th[data-valign='middle'] {{ vertical-align: middle; }}
      td[data-valign='bottom'], th[data-valign='bottom'] {{ vertical-align: bottom; }}
      img {{
        max-width: 100%;
        height: auto;
      }}
      .doc-logo-layer {{
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: {height_mm}mm;
        pointer-events: none;
        z-index: 0;
        overflow: visible;
      }}
      img[data-sgaf-logo], .sgaf-logo-var {{
        position: absolute;
        z-index: 0;
        max-width: none;
        height: auto;
        display: block;
        margin: 0;
      }}
      .sgaf-shape, [data-sgaf-shape] {{
        position: absolute;
        z-index: 0;
        box-sizing: border-box;
        margin: 0;
        pointer-events: none;
      }}
      .doc-body > :not(.doc-logo-layer):not(.doc-preview-sheets):not(.doc-preview-gutters) {{
        position: relative;
        z-index: 1;
      }}
      .sgaf-page-break, [data-sgaf-page-break] {{
        break-after: page;
        page-break-after: always;
        height: 0;
        margin: 0;
        border: 0;
        overflow: hidden;
      }}
      @media screen {{
        html, body {{
          background: #e8eaed;
        }}
        body {{
          padding: 16px 0 24px;
        }}
        .doc-body {{
          margin: 0 auto;
          box-shadow: none;
          background: transparent;
        }}
        .doc-body.doc-body--sheet {{
          background: #fff;
          box-shadow: 0 8px 24px rgba(17, 24, 39, 0.12);
        }}
        .sgaf-page-break, [data-sgaf-page-break] {{
          height: 0;
          margin: 1.5em 0;
          overflow: visible;
          border-top: 1px dashed #999;
        }}
      }}
      @media print {{
        html, body {{
          background: #fff;
        }}
        .doc-body {{
          margin: 0;
          box-shadow: none;
        }}
      }}
      @page {{
        size: {width_mm}mm {height_mm}mm;
        margin: 0;
      }}
    """


_FIT_PREVIEW_SCRIPT = """
<script>
(function () {
  var PAGE_GAP = 32;

  function mmToPx(mm) {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;height:' + mm + 'mm';
    document.body.appendChild(probe);
    var px = probe.offsetHeight;
    probe.remove();
    return Math.max(1, px);
  }

  function topInPage(el, pageEl) {
    return el.getBoundingClientRect().top - pageEl.getBoundingClientRect().top;
  }

  function sizeLogos() {
    document.querySelectorAll('img[data-sgaf-logo]').forEach(function (img) {
      var w = parseInt(img.getAttribute('width'), 10);
      if (w) {
        img.style.width = w + 'px';
        img.style.maxWidth = 'none';
        img.style.height = 'auto';
      }
    });
  }

  function isFlowBlock(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.classList.contains('doc-logo-layer')) return false;
    if (el.classList.contains('doc-preview-sheets')) return false;
    if (el.classList.contains('doc-preview-gutters')) return false;
    if (el.classList.contains('sgaf-shape') || el.hasAttribute('data-sgaf-shape')) return false;
    if (el.classList.contains('sgaf-page-break') || el.hasAttribute('data-sgaf-page-break')) return false;
    var pos = window.getComputedStyle(el).position;
    if (pos === 'absolute' || pos === 'fixed') return false;
    return true;
  }

  function clearAutoBreaks(root) {
    root.querySelectorAll('[data-sgaf-auto-break]').forEach(function (el) {
      el.style.marginTop = '';
      el.removeAttribute('data-sgaf-auto-break');
    });
  }

  function pageIndexAt(top, pageH) {
    return Math.max(0, Math.floor(top / (pageH + PAGE_GAP)));
  }

  function contentStart(index, pageH, padTop) {
    return index * (pageH + PAGE_GAP) + padTop;
  }

  function contentEnd(index, pageH, padBottom) {
    return index * (pageH + PAGE_GAP) + pageH - padBottom;
  }

  function previousFlowBottom(el, root, padTop) {
    var prev = el.previousElementSibling;
    while (prev && !isFlowBlock(prev) && !(prev.classList && prev.classList.contains('sgaf-page-break')) && !prev.hasAttribute('data-sgaf-page-break')) {
      prev = prev.previousElementSibling;
    }
    if (!prev) return padTop;
    var bottom = topInPage(prev, root) + prev.getBoundingClientRect().height;
    var mb = parseFloat(window.getComputedStyle(prev).marginBottom) || 0;
    return bottom + mb;
  }

  function targetFor(top, height, pageH, padTop, padBottom) {
    var index = pageIndexAt(Math.max(0, top), pageH);
    var start = contentStart(index, pageH, padTop);
    var end = contentEnd(index, pageH, padBottom);
    if (top < start - 0.5) return start;
    if (top >= end - 0.5) return contentStart(index + 1, pageH, padTop);
    if (top + height <= end + 0.5) return null;
    if (top <= start + 4) return null;
    return contentStart(index + 1, pageH, padTop);
  }

  function paginate(root, pageH, padTop, padBottom) {
    clearAutoBreaks(root);

    var breaks = [].slice.call(root.querySelectorAll('.sgaf-page-break, [data-sgaf-page-break]'));
    breaks.forEach(function (el) { el.style.height = '0px'; });
    breaks.forEach(function (el) {
      var top = topInPage(el, root);
      var index = pageIndexAt(top, pageH);
      var nextStart = contentStart(index + 1, pageH, padTop);
      el.style.height = Math.max(0, Math.round(nextStart - top)) + 'px';
    });

    for (var pass = 0; pass < 64; pass++) {
      var changed = false;
      var blocks = [].slice.call(root.children).filter(isFlowBlock);
      for (var i = 0; i < blocks.length; i++) {
        var el = blocks[i];
        var top = topInPage(el, root);
        var height = el.getBoundingClientRect().height;
        if (height <= 0) continue;
        var target = targetFor(top, height, pageH, padTop, padBottom);
        if (target == null) continue;
        var prevBottom = previousFlowBottom(el, root, padTop);
        var marginNeeded = Math.max(0, Math.round(target - prevBottom));
        var current = parseFloat(el.style.marginTop) || 0;
        if (Math.abs(marginNeeded - current) < 2) {
          var delta = Math.round(target - top);
          if (Math.abs(delta) < 2) continue;
          el.style.marginTop = Math.max(0, current + delta) + 'px';
          el.setAttribute('data-sgaf-auto-break', '1');
          changed = true;
          break;
        }
        el.style.marginTop = marginNeeded + 'px';
        el.setAttribute('data-sgaf-auto-break', '1');
        changed = true;
        break;
      }
      if (!changed) break;
    }

    blocks = [].slice.call(root.children).filter(isFlowBlock);
    for (i = 0; i < blocks.length; i++) {
      el = blocks[i];
      if (!el.hasAttribute('data-sgaf-auto-break')) continue;
      for (var j = 0; j < 8; j++) {
        top = topInPage(el, root);
        height = el.getBoundingClientRect().height;
        target = targetFor(top, height, pageH, padTop, padBottom);
        if (target == null) break;
        delta = Math.round(target - top);
        if (Math.abs(delta) < 2) break;
        current = parseFloat(el.style.marginTop) || 0;
        el.style.marginTop = Math.max(0, current + delta) + 'px';
      }
    }

    var contentBottom = root.scrollHeight;
    if (contentBottom <= pageH) return 1;
    return Math.max(1, Math.ceil((contentBottom - pageH) / (pageH + PAGE_GAP)) + 1);
  }

  function ensurePreviewSheets(body, count, pageH) {
    var host = body.querySelector('.doc-preview-sheets');
    if (!host) {
      host = document.createElement('div');
      host.className = 'doc-preview-sheets';
      host.setAttribute('aria-hidden', 'true');
      body.insertBefore(host, body.firstChild);
    }
    var gutters = body.querySelector('.doc-preview-gutters');
    if (!gutters) {
      gutters = document.createElement('div');
      gutters.className = 'doc-preview-gutters';
      gutters.setAttribute('aria-hidden', 'true');
      body.insertBefore(gutters, host.nextSibling);
    }
    while (host.children.length < count) {
      var sheet = document.createElement('div');
      sheet.className = 'doc-preview-sheet';
      host.appendChild(sheet);
    }
    while (host.children.length > count) host.lastChild.remove();
    while (gutters.children.length < Math.max(0, count - 1)) {
      var g = document.createElement('div');
      g.className = 'doc-preview-gutter';
      gutters.appendChild(g);
    }
    while (gutters.children.length > Math.max(0, count - 1)) gutters.lastChild.remove();

    [].forEach.call(host.children, function (sheet, index) {
      sheet.style.top = (index * (pageH + PAGE_GAP)) + 'px';
      sheet.style.height = pageH + 'px';
    });
    [].forEach.call(gutters.children, function (g, index) {
      g.style.top = (pageH + index * (pageH + PAGE_GAP)) + 'px';
      g.style.height = PAGE_GAP + 'px';
    });
    body.style.minHeight = (count * pageH + Math.max(0, count - 1) * PAGE_GAP) + 'px';
    var lastTop = (count - 1) * (pageH + PAGE_GAP);
    if (body.scrollHeight > lastTop + pageH && host.lastElementChild) {
      host.lastElementChild.style.height = (body.scrollHeight - lastTop) + 'px';
      body.style.minHeight = body.scrollHeight + 'px';
    }
  }

  function layout() {
    sizeLogos();
    var body = document.querySelector('.doc-body');
    var stage = document.querySelector('.doc-preview-stage');
    if (!body) return;

    // Quitar scale antes de medir: getBoundingClientRect queda escalado y
    // pageH/márgenes en px no, y la paginación deja de respetar el fin de hoja.
    body.style.transform = '';

    var pageH = mmToPx(parseFloat(body.getAttribute('data-page-h')) || 297);
    var padTop = mmToPx(parseFloat(body.getAttribute('data-margin-top')) || 20);
    var padBottom = mmToPx(parseFloat(body.getAttribute('data-margin-bottom')) || 20);

    var count = paginate(body, pageH, padTop, padBottom);
    ensurePreviewSheets(body, count, pageH);

    if (!stage) return;
    var scale = Math.min(1, (window.innerWidth - 24) / body.offsetWidth);
    body.style.transform = scale < 0.999 ? 'scale(' + scale + ')' : '';
    body.style.transformOrigin = 'top center';
    stage.style.height = Math.ceil(body.offsetHeight * scale) + 'px';
  }

  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  layout();
})();
</script>
"""


def wrap_document_html(cuerpo_html, *, width_mm, height_mm, margins, extra_css='', fit_preview=False):
    css = _page_css(width_mm, height_mm, margins) + (extra_css or '')
    top, right, bottom, left = margins
    stage_open = '<div class="doc-preview-stage">' if fit_preview else ''
    stage_close = '</div>' if fit_preview else ''
    if fit_preview:
        css += f"""
      .doc-preview-stage {{ display: block; }}
      .doc-preview-sheets {{
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        z-index: 0;
        pointer-events: none;
      }}
      .doc-preview-sheet {{
        position: absolute;
        left: 0;
        width: 100%;
        background: #fff;
        box-shadow: 0 8px 24px rgba(17, 24, 39, 0.12);
      }}
      .doc-preview-gutters {{
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        z-index: 3;
        pointer-events: none;
      }}
      .doc-preview-gutter {{
        position: absolute;
        left: 0;
        width: 100%;
        background: #e8eaed;
      }}
      @media screen {{
        .doc-body {{ margin: 0 auto; background: transparent; box-shadow: none; }}
      }}
        """
    script = _FIT_PREVIEW_SCRIPT if fit_preview else ''
    data_attrs = ''
    if fit_preview:
        data_attrs = (
            f' data-page-h="{height_mm}" data-margin-top="{top}"'
            f' data-margin-bottom="{bottom}" data-margin-left="{left}"'
            f' data-margin-right="{right}"'
        )
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>{css}</style>
</head>
<body>
  {stage_open}<div class="doc-body"{data_attrs}>{cuerpo_html or ''}</div>{stage_close}
  {script}
</body>
</html>"""


def plantilla_page_metrics(plantilla):
    width_mm, height_mm = resolve_page_mm(
        plantilla.tamano_pagina,
        plantilla.orientacion,
        plantilla.ancho_mm,
        plantilla.alto_mm,
    )
    margins = (
        float(plantilla.margen_superior_mm),
        float(plantilla.margen_derecho_mm),
        float(plantilla.margen_inferior_mm),
        float(plantilla.margen_izquierdo_mm),
    )
    return width_mm, height_mm, margins


def build_preview_html(plantilla, context):
    width_mm, height_mm, margins = plantilla_page_metrics(plantilla)
    cuerpo = fill_html(plantilla.cuerpo_html, context)
    return wrap_document_html(
        cuerpo,
        width_mm=width_mm,
        height_mm=height_mm,
        margins=margins,
        fit_preview=True,
    )


def _header_footer_template(html, context, kind):
    filled = fill_html(html, context)
    if not filled.strip():
        return '<div></div>'
    page_bits = ''
    if kind == 'footer':
        page_bits = (
            '<div style="font-size:9px;text-align:right;width:100%;">'
            '<span class="pageNumber"></span> / <span class="totalPages"></span>'
            '</div>'
        )
    return (
        '<div style="font-size:10px;width:100%;padding:0 12px;color:#111;">'
        f'{filled}{page_bits}</div>'
    )


# Un solo hilo posee Playwright: el sync API no admite varios hilos ni un event loop async.
# Con Gunicorn sync (N workers) cada proceso puede tener su propio Chromium; se cierra
# tras idle para no dejar ~100–200 MB de RAM por worker cuando nadie genera PDFs.
_PDF_BROWSER_IDLE_SECONDS = 300  # 5 minutos

_pdf_executor = concurrent.futures.ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix='sgaf-playwright-pdf',
)
_pw_runtime = None
_pw_browser = None
_pw_last_used = 0.0
_pw_idle_timer = None
_pw_lock = threading.Lock()


def _playwright_launch_args():
    # --disable-dev-shm-usage: en Docker /dev/shm suele ser 64MB y Chromium falla sin esto.
    args = ['--disable-dev-shm-usage', '--disable-gpu']
    if os.name != 'nt':
        args.append('--no-sandbox')
    return args


def _cancel_idle_timer():
    global _pw_idle_timer
    if _pw_idle_timer is not None:
        _pw_idle_timer.cancel()
        _pw_idle_timer = None


def _close_browser_only():
    global _pw_browser
    if _pw_browser is not None:
        try:
            _pw_browser.close()
        except Exception:
            pass
        _pw_browser = None


def _idle_close_browser():
    """Cierra Chromium si nadie lo usó en el periodo idle (libera RAM del worker)."""
    def _job():
        global _pw_last_used
        with _pw_lock:
            if _pw_browser is None:
                return
            idle_for = time.monotonic() - _pw_last_used
            if idle_for >= _PDF_BROWSER_IDLE_SECONDS - 1:
                _close_browser_only()

    try:
        _pdf_executor.submit(_job).result(timeout=30)
    except Exception:
        pass


def _schedule_idle_close():
    global _pw_idle_timer
    _cancel_idle_timer()
    timer = threading.Timer(_PDF_BROWSER_IDLE_SECONDS, _idle_close_browser)
    timer.daemon = True
    _pw_idle_timer = timer
    timer.start()


def _get_shared_browser():
    """Reutiliza Chromium entre descargas (cold start solo tras idle o 1ª vez)."""
    global _pw_runtime, _pw_browser, _pw_last_used

    if _pw_browser is not None:
        try:
            if _pw_browser.is_connected():
                _pw_last_used = time.monotonic()
                _schedule_idle_close()
                return _pw_browser
        except Exception:
            _pw_browser = None

    from playwright.sync_api import sync_playwright

    if _pw_runtime is None:
        _pw_runtime = sync_playwright().start()

    _close_browser_only()

    _pw_browser = _pw_runtime.chromium.launch(
        headless=True,
        args=_playwright_launch_args(),
    )
    _pw_last_used = time.monotonic()
    _schedule_idle_close()
    return _pw_browser


def _shutdown_shared_browser():
    global _pw_runtime, _pw_browser
    _cancel_idle_timer()
    with _pw_lock:
        _close_browser_only()
        if _pw_runtime is not None:
            try:
                _pw_runtime.stop()
            except Exception:
                pass
            _pw_runtime = None


atexit.register(_shutdown_shared_browser)


def _render_pdf_on_worker(
    html,
    width_mm,
    height_mm,
    top,
    right,
    bottom,
    left,
    display_hf,
    header_template,
    footer_template,
):
    with _pw_lock:
        browser = _get_shared_browser()
        page = browser.new_page()
        try:
            page.set_content(html, wait_until='domcontentloaded')
            return page.pdf(
                width=f'{width_mm}mm',
                height=f'{height_mm}mm',
                print_background=True,
                prefer_css_page_size=True,
                margin={
                    'top': f'{top}mm',
                    'right': f'{right}mm',
                    'bottom': f'{bottom}mm',
                    'left': f'{left}mm',
                },
                display_header_footer=display_hf,
                header_template=header_template,
                footer_template=footer_template,
            )
        finally:
            page.close()


def render_pdf_bytes(plantilla, context):
    width_mm, height_mm, margins = plantilla_page_metrics(plantilla)
    cuerpo = fill_html(plantilla.cuerpo_html, context)
    header_html = plantilla.encabezado_html or ''
    footer_html = plantilla.pie_html or ''
    display_hf = bool(header_html.strip() or footer_html.strip())

    html = wrap_document_html(cuerpo, width_mm=width_mm, height_mm=height_mm, margins=margins)

    top, right, bottom, left = (0.0, 0.0, 0.0, 0.0)
    if display_hf:
        top_m, right_m, bottom_m, left_m = margins
        if header_html.strip():
            top = max(top_m, 18)
        else:
            top = 0
        if footer_html.strip():
            bottom = max(bottom_m, 16)
        else:
            bottom = 0
        right, left = 0.0, 0.0

    header_template = (
        _header_footer_template(header_html, context, 'header') if display_hf else '<div></div>'
    )
    footer_template = (
        _header_footer_template(footer_html, context, 'footer') if display_hf else '<div></div>'
    )

    future = _pdf_executor.submit(
        _render_pdf_on_worker,
        html,
        width_mm,
        height_mm,
        top,
        right,
        bottom,
        left,
        display_hf,
        header_template,
        footer_template,
    )
    try:
        return future.result(timeout=90)
    except Exception:
        def _reset():
            global _pw_browser
            with _pw_lock:
                if _pw_browser is not None:
                    try:
                        _pw_browser.close()
                    except Exception:
                        pass
                    _pw_browser = None
        try:
            _pdf_executor.submit(_reset).result(timeout=10)
        except Exception:
            pass
        raise
