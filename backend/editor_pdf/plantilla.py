import base64
import re

from django.utils import timezone

from funcionarios.models import Funcionario

from .models import PlantillaFirmaPdf

TEXTO_INICIAL = 'Firmado digitalmente por:\n{{nombre}}\nSLEP Iquique'

VARIABLES = (
    ('rut', 'RUT'),
    ('nombre', 'Nombre completo'),
    ('cargo', 'Cargo'),
    ('email', 'Correo'),
    ('usuario', 'Usuario'),
    ('anexo', 'Anexo'),
    ('telefono', 'Teléfono'),
    ('subdireccion', 'Subdirección'),
    ('departamento', 'Departamento'),
    ('unidad', 'Unidad'),
    ('fecha', 'Fecha de la firma'),
)

EJEMPLOS = {
    'rut': '12345678-9',
    'nombre': 'Nombre del funcionario',
    'cargo': 'Cargo',
    'email': 'nombre@slepiquique.cl',
    'usuario': 'usuario',
    'anexo': '1234',
    'telefono': '2272631234',
    'subdireccion': 'Subdirección',
    'departamento': 'Departamento',
    'unidad': 'Unidad',
}

TOKEN = re.compile(r'\{\{\s*([a-z0-9_]+)\s*\}\}', re.IGNORECASE)


def obtener_plantilla():
    plantilla, _created = PlantillaFirmaPdf.objects.get_or_create(
        pk=1,
        defaults={'texto': TEXTO_INICIAL},
    )
    return plantilla


def _funcionario_de(user):
    if not user or not user.is_authenticated:
        return None
    return (
        Funcionario.objects.select_related('subdireccion', 'departamento', 'unidad', 'user')
        .filter(user=user)
        .first()
    )


def _nombre(relacion):
    return relacion.nombre if relacion is not None else ''


def valores_de(user):
    funcionario = _funcionario_de(user)
    fecha = timezone.localdate().strftime('%d-%m-%Y')
    if funcionario is None:
        valores = dict(EJEMPLOS)
        valores['fecha'] = fecha
        return valores, False
    usuario = funcionario.user or user
    valores = {
        'rut': funcionario.rut or '',
        'nombre': funcionario.nombre_funcionario or '',
        'cargo': funcionario.cargo_nombre,
        'email': getattr(usuario, 'email', '') or '',
        'usuario': getattr(usuario, 'username', '') or '',
        'anexo': funcionario.anexo or '',
        'telefono': funcionario.numero_publico or '',
        'subdireccion': _nombre(funcionario.subdireccion),
        'departamento': _nombre(funcionario.departamento),
        'unidad': _nombre(funcionario.unidad),
        'fecha': fecha,
    }
    return valores, True


def render_plantilla(texto, valores):
    def reemplazo(match):
        return valores.get(match.group(1).lower(), '')

    return TOKEN.sub(reemplazo, texto or '')


def texto_para(user):
    plantilla = obtener_plantilla()
    valores, _con_ficha = valores_de(user)
    texto = render_plantilla(plantilla.texto, valores).strip()
    if texto:
        return texto
    return render_plantilla(TEXTO_INICIAL, valores)


def imagen_de(plantilla):
    if not plantilla.imagen:
        return '', ''
    crudo = bytes(plantilla.imagen)
    tipo = plantilla.imagen_tipo if plantilla.imagen_tipo in ('png', 'jpg') else 'png'
    return base64.b64encode(crudo).decode('ascii'), tipo


def guardar_imagen(plantilla, data, tipo):
    if tipo not in ('png', 'jpg'):
        raise ValueError('Use una imagen PNG o JPG.')
    if not isinstance(data, str) or not data.strip():
        raise ValueError('La imagen no llegó completa.')
    try:
        crudo = base64.b64decode(data, validate=True)
    except Exception as exc:
        raise ValueError('La imagen no es válida.') from exc
    if len(crudo) > 200_000:
        raise ValueError('La imagen debe ser pequeña, de hasta 200 KB.')
    if tipo == 'png' and not crudo.startswith(b'\x89PNG'):
        raise ValueError('El archivo no es un PNG válido.')
    if tipo == 'jpg' and not crudo.startswith(b'\xff\xd8'):
        raise ValueError('El archivo no es un JPG válido.')
    plantilla.imagen = crudo
    plantilla.imagen_tipo = tipo
