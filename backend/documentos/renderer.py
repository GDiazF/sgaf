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
    if isinstance(html, tuple):
        html = html[0] if html else ''
    elif not isinstance(html, str):
        html = str(html or '')

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
    if isinstance(html, tuple):
        html = html[0] if html else ''
    elif not isinstance(html, str):
        html = str(html or '')
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


def _media_url_to_path(url):
    """Convierte /media/... a ruta en disco."""
    from django.conf import settings

    if not url:
        return None
    text = str(url).strip()
    if text.startswith('data:'):
        return None
    media_root = str(settings.MEDIA_ROOT or '')
    media_url = (settings.MEDIA_URL or '/media/').rstrip('/')
    rel = None
    if text.startswith(media_url):
        rel = text[len(media_url):].lstrip('/\\')
    elif text.startswith('/media/'):
        rel = text[len('/media/'):].lstrip('/\\')
    if not rel or not media_root:
        return None
    path = os.path.join(media_root, rel.replace('/', os.sep))
    return path if os.path.isfile(path) else None


def _resolve_logo_data_uri(key, context, node=None):
    """Data URI obligatorio: preview (srcDoc) y encabezado PDF no cargan /media/."""
    if node is not None:
        for attr in ('data-preview', 'src'):
            raw = (node.get(attr) or '').strip()
            if raw.startswith('data:'):
                return raw
            path = _media_url_to_path(raw)
            if path:
                return _file_to_data_uri(path)

    if not key:
        return ''
    raw = ''
    if isinstance(context, dict):
        raw = context.get(key) or ''
    raw = str(raw).strip()
    if raw.startswith('data:'):
        return raw
    if raw and os.path.isfile(raw):
        return _file_to_data_uri(raw)
    path = resolve_logo_path(key)
    return _file_to_data_uri(path) if path else ''


def _ensure_logo_img(soup, node, key, uri, *, header_footer=False, page_metrics=None, hf_band_mm=18, pdf_print=False):
    if node.name != 'img':
        img = soup.new_tag('img')
        img['alt'] = node.get('alt') or key
        for attr in ('style', 'data-left', 'data-top', 'data-page', 'data-preview', 'class', 'width'):
            if node.get(attr) and not img.get(attr):
                img[attr] = node.get(attr)
        node.replace_with(img)
        node = img
    node['data-sgaf-logo'] = key
    if uri:
        node['src'] = uri
    elif node.get('src') and not str(node.get('src', '')).startswith('data:'):
        del node['src']
    node['alt'] = node.get('alt') or key
    width = node.get('width') or '140'
    node['width'] = width
    extras = {
        'position': 'absolute',
        'width': f'{width}px',
        'height': 'auto',
        'max-width': 'none',
        'display': 'block',
        'margin': '0',
        'pointer-events': 'none',
    }
    if header_footer:
        extras['z-index'] = '1'
    else:
        extras['z-index'] = '3'

    left_raw = node.get('data-left') or '0'
    top_raw = node.get('data-top') or '0'
    page_raw = node.get('data-page') or '1'

    if header_footer:
        left_pct = float(left_raw or 0)
        top_pct = float(top_raw or 0)
        if page_metrics:
            width_mm, _height_mm, margins = page_metrics
            top_m, right_m, bottom_m, left_m = margins
            band_h = max(1.0, float(hf_band_mm or 15))
            
            content_w = max(1.0, width_mm - left_m - right_m)
            
            # Posición horizontal relativa al área de contenido
            extras['left'] = f'{(left_pct / 100) * content_w}mm'
            
            # Posición vertical dentro del header (sin offset extra en PDF)
            # El margin-top del header ya lo posiciona correctamente
            extras['top'] = f'{(top_pct / 100) * band_h}mm'
            extras['max-height'] = f'{band_h}mm'
        else:
            if left_raw and 'left:' not in (node.get('style') or '').replace(' ', ''):
                extras['left'] = f'{left_raw}%'
            if top_raw and 'top:' not in (node.get('style') or '').replace(' ', ''):
                extras['top'] = f'{top_raw}%'
    elif page_metrics:
        width_mm, height_mm, margins = page_metrics
        top_m, right_m, bottom_m, left_m = margins
        content_w = max(1.0, width_mm - left_m - right_m)
        content_h = max(1.0, height_mm - top_m - bottom_m)
        page_idx = max(0, int(page_raw) - 1)
        left_pct = float(left_raw or 0)
        top_pct = float(top_raw or 0)
        if pdf_print:
            # Playwright aplica márgenes por hoja; coords relativas al área útil del cuerpo.
            extras['left'] = f'{(left_pct / 100) * content_w}mm'
            extras['top'] = f'{page_idx * height_mm + (top_pct / 100) * content_h}mm'
        else:
            extras['left'] = f'{left_m + (left_pct / 100) * content_w}mm'
            extras['top'] = f'{top_m + page_idx * height_mm + (top_pct / 100) * content_h}mm'
    else:
        if left_raw and 'left:' not in (node.get('style') or '').replace(' ', ''):
            extras['left'] = f'{left_raw}%'
        if top_raw and 'top:' not in (node.get('style') or '').replace(' ', ''):
            extras['top'] = f'{top_raw}%'

    _merge_style(node, **extras)
    return node


def _px_from_style(style, prop='width'):
    if not style:
        return None
    m = re.search(rf'{re.escape(prop)}:\s*(\d+(?:\.\d+)?)px', str(style))
    return int(float(m.group(1))) if m else None


def _colgroup_pixel_widths(table):
    colgroup = table.find('colgroup', recursive=False)
    if not colgroup:
        return []
    widths = []
    for col in colgroup.find_all('col', recursive=False):
        w = _px_from_style(col.get('style'))
        widths.append(w if w else 0)
    return widths


def _layout_tables(root, soup):
    for table in root.find_all('table'):
        first_row = table.find('tr')
        if not first_row:
            continue
        widths = []
        cells = first_row.find_all(['th', 'td'], recursive=False)
        for cell in cells:
            span = max(1, int(cell.get('colspan') or 1))
            raw = cell.get('colwidth') or cell.get('data-colwidth') or ''
            parts = []
            for chunk in str(raw).split(','):
                chunk = chunk.strip()
                if chunk.isdigit():
                    parts.append(int(chunk))
            while len(parts) < span:
                parts.append(0)
            widths.extend(parts[:span])
        if not any(w > 0 for w in widths):
            widths = _colgroup_pixel_widths(table)
        if not any(w > 0 for w in widths):
            table_width = _px_from_style(table.get('style'))
            if table_width and widths:
                per = max(32, table_width // max(1, len(widths)))
                widths = [per] * len(widths)
            elif table_width:
                continue
            else:
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


def _apply_logos(html, context, *, header_footer=False, page_metrics=None, hf_band_mm=18, pdf_print=False):
    if not html:
        return html
    soup, root = _fragment_soup(html)
    if root is None:
        return html
    layer = soup.new_tag('div')
    layer['class'] = 'doc-logo-layer'
    for node in list(root.select('[data-sgaf-logo]')):
        key = (node.get('data-sgaf-logo') or '').strip()
        uri = _resolve_logo_data_uri(key, context, node)
        node = _ensure_logo_img(
            soup, node, key, uri,
            header_footer=header_footer,
            page_metrics=page_metrics,
            hf_band_mm=hf_band_mm if header_footer else None,
            pdf_print=pdf_print,
        )
        slot = node.parent
        slot_classes = slot.get('class') if slot else None
        if slot and slot.name in ('div', 'span') and slot_classes and 'sgaf-logo-slot' in slot_classes:
            layer.append(slot.extract())
        else:
            layer.append(node.extract())
    if layer.contents:
        if header_footer:
            band = float(hf_band_mm or 18)
            layer['style'] = (
                f'position:relative;width:100%;min-height:{band}mm;box-sizing:border-box;'
                'overflow:visible;-webkit-print-color-adjust:exact;print-color-adjust:exact;'
            )
        else:
            layer['style'] = (
                'position:absolute;left:0;top:0;width:100%;bottom:0;min-height:100%;'
                'pointer-events:none;z-index:3;overflow:visible;'
            )
        root.insert(0, layer)
    _layout_tables(root, soup)
    _preserve_blank_paragraphs(root, soup)
    return root.decode_contents()


def _row_has_pago_var_keys(tr):
    for el in tr.select('[data-sgaf-var]'):
        key = el.get('data-sgaf-var') or ''
        if key.startswith('pago_'):
            return True
    text = tr.get_text() or ''
    return '{{' in text and 'pago_' in text


def _row_mentions_pago_vars(tr):
    # Solo filas con variables pago_*; el marcador repeat solo no basta.
    return _row_has_pago_var_keys(tr)


def _strip_orphan_pago_repeat_markers(html):
    """Quita data-sgaf-repeat=pagos en filas sin variables pago_* (restos del editor)."""
    soup, root = _fragment_soup(html)
    if root is None:
        return html or ''
    for tr in root.find_all('tr'):
        if (tr.get('data-sgaf-repeat') or '') != 'pagos':
            continue
        if _row_has_pago_var_keys(tr):
            continue
        del tr['data-sgaf-repeat']
    return root.decode_contents()


def _apply_sgaf_var_spans(root, context):
    """Rellena spans data-sgaf-var dentro de un fragmento BeautifulSoup."""
    if root is None or not context:
        return
    for el in root.select('[data-sgaf-var]'):
        key = el.get('data-sgaf-var') or ''
        if key not in context:
            continue
        value = context.get(key)
        if value is None:
            value = ''
        if key.endswith('_html'):
            el.clear()
            el.append(BeautifulSoup(str(value), 'html.parser'))
        else:
            el.string = str(value)
        classes = [c for c in (el.get('class') or []) if c != 'sgaf-var']
        if classes:
            el['class'] = classes
        elif 'class' in el.attrs:
            del el['class']
        if 'data-sgaf-var' in el.attrs:
            del el['data-sgaf-var']


def _fill_sgaf_var_spans(html, context):
    soup, root = _fragment_soup(html)
    if root is None:
        return html or ''
    _apply_sgaf_var_spans(root, context)
    return root.decode_contents()


def _fill_fragment_with_context(fragment_html, context):
    """Sustituye {{ vars }} y spans data-sgaf-var dentro de un fragmento."""
    filled = _substitute_text(fragment_html or '', context)
    soup = BeautifulSoup(filled, 'html.parser')
    _apply_sgaf_var_spans(soup, context)
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


def _count_pago_template_rows(html):
    soup, root = _fragment_soup(html)
    if root is None:
        return 0
    return sum(1 for tr in root.find_all('tr') if _row_mentions_pago_vars(tr))


def _context_for_global_fill(context, *, omit_pago_row_keys=False):
    if not isinstance(context, dict):
        return context
    if not omit_pago_row_keys:
        return context
    return {k: v for k, v in context.items() if not str(k).startswith('pago_')}


def fill_html(html, context, *, header_footer=False, page_metrics=None, hf_band_mm=18, pdf_print=False):
    pagos_rows = context.get('_pagos_rows') if isinstance(context, dict) else None
    body = html or ''
    expanded_pago_rows = 0
    if pagos_rows is not None and not header_footer:
        body = _strip_orphan_pago_repeat_markers(body)
        expanded_pago_rows = _count_pago_template_rows(body)
        body = _expand_repeating_pago_rows(body, pagos_rows)
    # Tras expandir filas pago_*, no volver a aplicar pago_* globales (siempre son del 1.er registro).
    global_ctx = _context_for_global_fill(
        context,
        omit_pago_row_keys=expanded_pago_rows > 0,
    )
    filled = _substitute_text(body, global_ctx)
    filled = _fill_sgaf_var_spans(filled, global_ctx)
    return _apply_logos(
        filled, context,
        header_footer=header_footer,
        page_metrics=page_metrics,
        hf_band_mm=hf_band_mm,
        pdf_print=pdf_print,
    )


def _page_css(width_mm, height_mm, margins, pdf_page_margins=None, has_header=False, has_footer=False):
    top, right, bottom, left = margins
    
    # Ajustar padding para incluir espacio del header/footer
    header_height = 15.0  # mm
    footer_height = 12.0  # mm
    header_spacing = 4.0  # mm
    footer_spacing = 4.0  # mm
    
    # El padding top debe incluir el espacio del header + spacing
    # para que el contenido empiece después del header
    top_padding = float(top)
    if has_header:
        top_padding = max(float(top), header_height + header_spacing)
    
    bottom_padding = float(bottom)
    if has_footer:
        bottom_padding = max(float(bottom), footer_height + footer_spacing)
    
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
        padding: {top_padding}mm {right}mm {bottom_padding}mm {left}mm;
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
        width: auto;
        max-width: 100%;
        margin: 0.4em 0;
        box-sizing: border-box;
      }}
      table:not([style*="width"]) {{
        width: 100%;
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
      td[data-border-width='2'], th[data-border-width='2'] {{
        border-width: 2px;
      }}
      td[data-border-width='3'], th[data-border-width='3'] {{
        border-width: 3px;
      }}
      td[data-border-sides='none'], th[data-border-sides='none'] {{
        border-color: transparent;
      }}
      td[data-border-sides='top'], th[data-border-sides='top'] {{
        border-color: transparent;
        border-top-color: #333;
      }}
      td[data-border-sides='bottom'], th[data-border-sides='bottom'] {{
        border-color: transparent;
        border-bottom-color: #333;
      }}
      td[data-border-sides='left'], th[data-border-sides='left'] {{
        border-color: transparent;
        border-left-color: #333;
      }}
      td[data-border-sides='right'], th[data-border-sides='right'] {{
        border-color: transparent;
        border-right-color: #333;
      }}
      td[data-border-sides='top,bottom'], th[data-border-sides='top,bottom'],
      td[data-border-sides='bottom,top'], th[data-border-sides='bottom,top'] {{
        border-color: transparent;
        border-top-color: #333;
        border-bottom-color: #333;
      }}
      td[data-border-sides='left,right'], th[data-border-sides='left,right'],
      td[data-border-sides='right,left'], th[data-border-sides='right,left'] {{
        border-color: transparent;
        border-left-color: #333;
        border-right-color: #333;
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
        bottom: 0;
        min-height: 100%;
        pointer-events: none;
        z-index: 3;
        overflow: visible;
      }}
      .sgaf-logo-slot {{
        display: block;
        width: 0;
        height: 0;
        overflow: visible;
        margin: 0;
        padding: 0;
        border: 0;
      }}
      img[data-sgaf-logo], .sgaf-logo-var {{
        position: absolute;
        z-index: 3;
        max-width: none;
        width: auto;
        height: auto;
        display: block;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
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
          margin: 0;
          padding: 0;
        }}
        .doc-body {{
          margin: 0 !important;
          padding: 0 !important;
          min-height: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
          box-shadow: none;
        }}
        .doc-logo-layer {{
          pointer-events: none;
        }}
        thead {{
          display: table-header-group;
        }}
        tfoot {{
          display: table-footer-group;
        }}
        tr {{
          break-inside: avoid;
          page-break-inside: avoid;
        }}
        .sgaf-page-break, [data-sgaf-page-break] {{
          break-after: page;
          page-break-after: always;
        }}
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
    document.querySelectorAll('.doc-preview-hf-band, .doc-hf-band__content').forEach(function (band) {
      band.querySelectorAll('img[data-sgaf-logo]').forEach(function (img) {
        var slot = img.closest('.sgaf-logo-slot');
        if (slot) {
          slot.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible;margin:0;padding:0;border:0;';
        }
        var left = img.getAttribute('data-left') || '0';
        var top = img.getAttribute('data-top') || '0';
        var w = img.getAttribute('width') || '140';
        img.style.cssText = 'position:absolute;left:' + left + '%;top:' + top + '%;width:' + w + 'px;height:auto;margin:0;max-width:none;';
      });
    });
  }

  function isFlowBlock(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'TEMPLATE') return false;
    if (el.classList.contains('doc-logo-layer')) return false;
    if (el.classList.contains('doc-preview-sheets')) return false;
    if (el.classList.contains('doc-preview-gutters')) return false;
    if (el.classList.contains('sgaf-logo-slot')) return false;
    if (el.classList.contains('sgaf-shape') || el.hasAttribute('data-sgaf-shape')) return false;
    if (el.classList.contains('sgaf-page-break') || el.hasAttribute('data-sgaf-page-break')) return false;
    var pos = window.getComputedStyle(el).position;
    if (pos === 'absolute' || pos === 'fixed') return false;
    return true;
  }

  function clearAutoBreaks(root) {
    root.querySelectorAll('[data-sgaf-auto-break]').forEach(function (el) {
      el.style.marginTop = '';
      el.style.paddingTop = '';
      el.style.borderTop = '';
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

  function sheetCountForFlow(flowBottom, pageH) {
    if (flowBottom <= pageH + 1) return 1;
    return Math.max(1, Math.ceil((flowBottom - pageH) / (pageH + PAGE_GAP)) + 1);
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

    for (var pass = 0; pass < 48; pass++) {
      var changed = false;
      var blocks = [].slice.call(root.children).filter(isFlowBlock);
      for (var i = 0; i < blocks.length; i++) {
        var el = blocks[i];
        var top = topInPage(el, root);
        var height = el.getBoundingClientRect().height;
        if (height <= 0) continue;
        var target = targetFor(top, height, pageH, padTop, padBottom);
        if (target == null) continue;
        var delta = Math.round(target - top);
        if (Math.abs(delta) < 2) continue;
        var prev = parseFloat(el.style.marginTop) || 0;
        el.style.borderTop = '0.01px solid transparent';
        el.style.marginTop = Math.max(0, prev + delta) + 'px';
        el.setAttribute('data-sgaf-auto-break', '1');
        changed = true;
        break;
      }
      if (!changed) break;
    }

    var flowBottom = 0;
    blocks = [].slice.call(root.children).filter(isFlowBlock);
    for (var j = 0; j < blocks.length; j++) {
      var block = blocks[j];
      var bottom = topInPage(block, root) + block.getBoundingClientRect().height;
      if (bottom > flowBottom) flowBottom = bottom;
    }
    return sheetCountForFlow(flowBottom, pageH);
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
      [].forEach.call(sheet.querySelectorAll('.doc-preview-hf-band'), function (b) { b.remove(); });
      var headerTpl = document.getElementById('doc-hf-header-tpl');
      if (headerTpl && body.getAttribute('data-hf-header')) {
        var hb = document.createElement('div');
        hb.className = 'doc-preview-hf-band doc-preview-hf-band--header';
        hb.innerHTML = headerTpl.innerHTML;
        sheet.appendChild(hb);
      }
      var footerTpl = document.getElementById('doc-hf-footer-tpl');
      if (footerTpl && body.getAttribute('data-hf-footer')) {
        var fb = document.createElement('div');
        fb.className = 'doc-preview-hf-band doc-preview-hf-band--footer';
        fb.innerHTML = footerTpl.innerHTML;
        sheet.appendChild(fb);
      }
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

  function stretchLogoLayer() {
    var body = document.querySelector('.doc-body');
    if (!body) return;
    var layer = body.querySelector('.doc-logo-layer');
    if (!layer) return;
    var h = Math.max(body.scrollHeight, body.offsetHeight);
    layer.style.height = h + 'px';
    layer.style.minHeight = h + 'px';
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
    var bodyStyle = window.getComputedStyle(body);
    var padTop = parseFloat(bodyStyle.paddingTop) || mmToPx(parseFloat(body.getAttribute('data-margin-top')) || 20);
    var padBottom = parseFloat(bodyStyle.paddingBottom) || mmToPx(parseFloat(body.getAttribute('data-margin-bottom')) || 20);

    var count = paginate(body, pageH, padTop, padBottom);
    ensurePreviewSheets(body, count, pageH);
    sizeLogos();
    stretchLogoLayer();

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


def wrap_document_html(
    cuerpo_html,
    *,
    width_mm,
    height_mm,
    margins,
    extra_css='',
    fit_preview=False,
    preview_header='',
    preview_footer='',
    has_header=False,
    has_footer=False,
):
    css = _page_css(width_mm, height_mm, margins, has_header=has_header, has_footer=has_footer) + (extra_css or '')
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
      .doc-preview-hf-band {{
        position: absolute;
        left: {left}mm;
        right: {right}mm;
        box-sizing: border-box;
        overflow: hidden;
        pointer-events: none;
        z-index: 2;
        border: 1px dashed #9ca3af;
        background: rgba(37, 99, 235, 0.06);
      }}
      .doc-preview-hf-band--header {{
        top: {top}mm;
        height: 15mm;
      }}
      .doc-preview-hf-band--footer {{
        bottom: {bottom}mm;
        height: 12mm;
      }}
      .doc-preview-hf-band p {{ margin: 0; }}
      .doc-preview-hf-band .sgaf-logo-slot {{
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        margin: 0;
        padding: 0;
        border: 0;
      }}
      .doc-preview-hf-band img[data-sgaf-logo] {{
        position: absolute;
        max-width: none;
        margin: 0;
      }}
      @media screen {{
        .doc-body {{ margin: 0 auto; background: transparent; box-shadow: none; }}
      }}
        """
    script = _FIT_PREVIEW_SCRIPT if fit_preview else ''
    data_attrs = ''
    hf_templates = ''
    
    if fit_preview:
        data_attrs = (
            f' data-page-h="{height_mm}" data-margin-top="{top}"'
            f' data-margin-bottom="{bottom}" data-margin-left="{left}"'
            f' data-margin-right="{right}"'
        )
        if preview_header.strip():
            data_attrs += ' data-hf-header="1"'
            hf_templates += f'<template id="doc-hf-header-tpl">{preview_header}</template>'
        if preview_footer.strip():
            data_attrs += ' data-hf-footer="1"'
            hf_templates += f'<template id="doc-hf-footer-tpl">{preview_footer}</template>'
    
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>{css}</style>
</head>
<body>
  {stage_open}<div class="doc-body"{data_attrs}>{hf_templates}{cuerpo_html or ''}</div>{stage_close}
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
    metrics = (width_mm, height_mm, margins)
    cuerpo = fill_html(plantilla.cuerpo_html, context, page_metrics=metrics)
    preview_header = ''
    preview_footer = ''
    has_header = bool((plantilla.encabezado_html or '').strip())
    has_footer = bool((plantilla.pie_html or '').strip())
    
    if has_header:
        preview_header = fill_html(
            plantilla.encabezado_html,
            context,
            header_footer=True,
            page_metrics=metrics,
            hf_band_mm=15,
        )
    if has_footer:
        preview_footer = fill_html(
            plantilla.pie_html,
            context,
            header_footer=True,
            page_metrics=metrics,
            hf_band_mm=12,
        )
    return wrap_document_html(
        cuerpo,
        width_mm=width_mm,
        height_mm=height_mm,
        margins=margins,
        fit_preview=True,
        preview_header=preview_header,
        preview_footer=preview_footer,
        # NO pasamos has_header/has_footer para que use los mismos márgenes que el PDF
        has_header=False,
        has_footer=False,
    )


def _pdf_playwright_margins(margins, *, has_header=False, has_footer=False):
    """Márgenes Playwright: solo para reservar espacio del header/footer.
    Los márgenes del contenido se manejan con padding en .doc-body"""
    # Playwright necesita espacio para renderizar el header/footer
    # pero los márgenes del contenido ya están en el CSS
    extra_top = 18.0 if has_header else 0.0
    extra_bottom = 14.0 if has_footer else 0.0
    return {
        'top': f'{extra_top}mm',
        'right': '0mm',
        'bottom': f'{extra_bottom}mm',
        'left': '0mm',
    }


def _header_footer_template(html, context, kind, page_metrics=None, pdf_print=False, band_height=None):
    # Usar altura por defecto o personalizada
    if band_height is None:
        band = 15 if kind == 'header' else 12
    else:
        band = band_height
    
    filled = fill_html(
        html, context,
        header_footer=True,
        page_metrics=page_metrics,
        hf_band_mm=band,
        pdf_print=pdf_print,
    )
    if not filled.strip():
        return '<div></div>'

    # Obtener los márgenes REALES de la plantilla
    if page_metrics:
        _width_mm, _height_mm, margins = page_metrics
        top_m, right_m, bottom_m, left_m = margins
    else:
        left_m, right_m = 20.0, 20.0
        top_m, bottom_m = 20.0, 20.0

    page_bits = ''
    if kind == 'footer':
        page_bits = (
            '<div style="font-size:9px;text-align:right;width:100%;box-sizing:border-box;">'
            '<span class="pageNumber"></span> / <span class="totalPages"></span>'
            '</div>'
        )
    
    min_h = f'{band}mm'
    
    # Para el header, agregar margin-top para respetar el margen vacío configurado
    # Para el footer, agregar margin-bottom
    margin_style = ''
    if kind == 'header':
        margin_style = f'margin-top:{top_m}mm;'
    elif kind == 'footer':
        margin_style = f'margin-bottom:{bottom_m}mm;'
    
    return (
        f'<div style="position:relative;width:100%;{margin_style}'
        f'padding:0 {right_m}mm 0 {left_m}mm;color:#111;'
        f'font-size:10pt;height:{min_h};box-sizing:border-box;'
        f'overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;">'
        f'{filled}{page_bits}</div>'
    )


_STRETCH_LOGOS_BEFORE_PDF = """
() => {
  const body = document.querySelector('.doc-body');
  if (!body) return;
  const layer = body.querySelector('.doc-logo-layer');
  if (layer) {
    const h = Math.max(body.scrollHeight, body.offsetHeight);
    layer.style.height = h + 'px';
    layer.style.minHeight = h + 'px';
  }
  document.querySelectorAll('img[data-sgaf-logo]').forEach((img) => {
    const w = parseInt(img.getAttribute('width'), 10);
    if (w) {
      img.style.width = w + 'px';
      img.style.maxWidth = 'none';
      img.style.height = 'auto';
    }
  });
}
"""


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
    margin_top,
    margin_right,
    margin_bottom,
    margin_left,
    display_hf,
    header_template,
    footer_template,
):
    with _pw_lock:
        browser = _get_shared_browser()
        page = browser.new_page()
        try:
            page.set_content(html, wait_until='networkidle')
            page.emulate_media(media='print')
            page.evaluate(_STRETCH_LOGOS_BEFORE_PDF)
            return page.pdf(
                width=f'{width_mm}mm',
                height=f'{height_mm}mm',
                print_background=True,
                prefer_css_page_size=True,
                margin={
                    'top': margin_top,
                    'right': margin_right,
                    'bottom': margin_bottom,
                    'left': margin_left,
                },
                display_header_footer=display_hf,
                header_template=header_template,
                footer_template=footer_template,
            )
        finally:
            page.close()


def render_pdf_bytes(plantilla, context):
    width_mm, height_mm, margins = plantilla_page_metrics(plantilla)
    metrics = (width_mm, height_mm, margins)
    
    header_html = plantilla.encabezado_html or ''
    footer_html = plantilla.pie_html or ''
    
    has_header = bool(header_html.strip())
    has_footer = bool(footer_html.strip())
    
    # Calcular márgenes de @page para PDF
    # Según el diagrama del usuario:
    # 1. Primero va el margen configurado (espacio vacío)
    # 2. Luego va el header (15mm para header, 12mm para footer)
    # 3. Luego va el spacing (3mm para header, 2mm para footer)
    # 4. Luego empieza el contenido del body
    top_m, right_m, bottom_m, left_m = margins
    
    header_height = 15.0  # Altura del header
    footer_height = 12.0  # Altura del footer
    header_spacing = 4.0  # Spacing después del header
    footer_spacing = 4.0  # Spacing antes del footer
    
    if has_header:
        # El margen de @page debe incluir: margen vacío + header + spacing
        # para que Playwright deje espacio para todo
        page_margin_top = float(top_m) + header_height + header_spacing
    else:
        page_margin_top = float(top_m)
    
    if has_footer:
        page_margin_bottom = float(bottom_m) + footer_height + footer_spacing
    else:
        page_margin_bottom = float(bottom_m)
    
    # CSS específico para PDF
    # Los márgenes de @page ya incluyen todo (header + spacing + margen usuario)
    # Entonces NO agregamos padding top/bottom al .doc-body
    pdf_css = f"""
    @page {{
      size: {width_mm}mm {height_mm}mm;
      margin-top: {page_margin_top}mm;
      margin-right: {right_m}mm;
      margin-bottom: {page_margin_bottom}mm;
      margin-left: {left_m}mm;
    }}
    @media print {{
      .doc-body {{
        padding-top: 0 !important;
        padding-bottom: 0 !important;
      }}
    }}
    """
    
    cuerpo = fill_html(plantilla.cuerpo_html, context, page_metrics=metrics, pdf_print=True)
    
    html = wrap_document_html(
        cuerpo, 
        width_mm=width_mm, 
        height_mm=height_mm, 
        margins=margins,
        extra_css=pdf_css,
        # NO pasamos has_header/has_footer para PDF porque el @page ya maneja el espacio
        has_header=False,
        has_footer=False,
    )
    
    # Preparar templates de header/footer para Playwright
    display_hf = has_header or has_footer
    
    header_template = '<div></div>'
    footer_template = '<div></div>'
    
    if has_header:
        header_template = _header_footer_template(
            header_html, context, 'header', 
            page_metrics=metrics, 
            pdf_print=True
        )
    
    if has_footer:
        footer_template = _header_footer_template(
            footer_html, context, 'footer', 
            page_metrics=metrics, 
            pdf_print=True
        )

    future = _pdf_executor.submit(
        _render_pdf_on_worker,
        html,
        width_mm,
        height_mm,
        f'{page_margin_top}mm',
        f'{right_m}mm',
        f'{page_margin_bottom}mm',
        f'{left_m}mm',
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
