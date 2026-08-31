"""Construcción del XML layout de FirmaGob (AgileSignerConfig)."""
from __future__ import annotations

import base64
import html


def build_layout_xml(
    *,
    image_png: bytes,
    llx: int,
    lly: int,
    urx: int,
    ury: int,
    page: str | int = 'LAST',
) -> str:
    """
    XML oficial para embeber imagen visual de firma.

    Coordenadas en puntos PDF, origen esquina inferior izquierda.
    page: número 1-based o 'LAST'.
    """
    b64 = base64.b64encode(image_png).decode('ascii')
    page_val = str(page).strip() or 'LAST'
    return (
        '<AgileSignerConfig>'
        '<Application id="THIS-CONFIG">'
        '<pdfPassword/>'
        '<Signature>'
        '<Visible active="true" layer2="false" label="true" pos="1">'
        f'<llx>{int(llx)}</llx>'
        f'<lly>{int(lly)}</lly>'
        f'<urx>{int(urx)}</urx>'
        f'<ury>{int(ury)}</ury>'
        f'<page>{html.escape(page_val)}</page>'
        '<image>BASE64</image>'
        f'<BASE64VALUE>{b64}</BASE64VALUE>'
        '</Visible>'
        '</Signature>'
        '</Application>'
        '</AgileSignerConfig>'
    )
