from reportlab.lib.colors import HexColor

COLOR_VERDE = HexColor('#92D050')
COLOR_AMARILLO = HexColor('#FFD400')
COLOR_ROSADO = HexColor('#F68A91')
COLOR_ROJO = HexColor('#E33E41')
COLOR_CELESTE = HexColor('#48C1EB')
COLOR_AZUL = HexColor('#3E7AB7')
STRIP_COLORS = [
    COLOR_VERDE,
    COLOR_AMARILLO,
    COLOR_ROSADO,
    COLOR_ROJO,
    COLOR_CELESTE,
    COLOR_AZUL,
]


def draw_color_strips(canvas, doc):
    """
    Dibuja franjas corporativas arriba y abajo de la página.
    Usa canvas._pagesize para anclar a los bordes físicos.
    """
    canvas.saveState()
    page_w, page_h = canvas._pagesize
    h_strip = 12
    n = len(STRIP_COLORS)
    w_seg = page_w / float(n)
    for i, color in enumerate(STRIP_COLORS):
        canvas.setFillColor(color)
        canvas.rect(i * w_seg, page_h - h_strip, w_seg, h_strip, stroke=0, fill=1)
        canvas.rect(i * w_seg, 0, w_seg, h_strip, stroke=0, fill=1)
    canvas.restoreState()
