"""Resolución de sello visual según organigrama del funcionario."""
from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from funcionarios.models import Funcionario
    from .models import SelloFirma


@dataclass
class SelloResuelto:
    sello: 'SelloFirma'
    origen: str  # preferido | unidad | departamento | subdireccion

    def to_dict(self, request=None) -> dict:
        sello = self.sello
        url = None
        if sello.imagen:
            url = sello.imagen.url
            if request is not None:
                url = request.build_absolute_uri(url)
        return {
            'id': sello.id,
            'nombre': sello.nombre,
            'nivel': sello.nivel,
            'nivel_label': sello.nivel_label,
            'organo_nombre': sello.organo_nombre,
            'origen': self.origen,
            'imagen_url': url,
        }


def resolver_sello(funcionario: 'Funcionario | None') -> SelloResuelto | None:
    """
    Orden: preferido → unidad → departamento → subdirección.
    Solo sellos activos.
    """
    if funcionario is None:
        return None

    preferido = getattr(funcionario, 'sello_preferido', None)
    if preferido is not None and preferido.activo and preferido.imagen:
        return SelloResuelto(sello=preferido, origen='preferido')

    from .models import SelloFirma

    if funcionario.unidad_id:
        sello = (
            SelloFirma.objects.filter(unidad_id=funcionario.unidad_id, activo=True)
            .exclude(imagen='')
            .first()
        )
        if sello and sello.imagen:
            return SelloResuelto(sello=sello, origen='unidad')

    if funcionario.departamento_id:
        sello = (
            SelloFirma.objects.filter(
                departamento_id=funcionario.departamento_id, activo=True
            )
            .exclude(imagen='')
            .first()
        )
        if sello and sello.imagen:
            return SelloResuelto(sello=sello, origen='departamento')

    if funcionario.subdireccion_id:
        sello = (
            SelloFirma.objects.filter(
                subdireccion_id=funcionario.subdireccion_id, activo=True
            )
            .exclude(imagen='')
            .first()
        )
        if sello and sello.imagen:
            return SelloResuelto(sello=sello, origen='subdireccion')

    return None


def rut_to_firmagob_run(rut: str) -> str:
    """RUT chileno 12345678-9 → 12345678 (sin puntos, guión ni DV)."""
    if not rut:
        return ''
    clean = rut.replace('.', '').replace(' ', '').upper()
    if '-' in clean:
        clean = clean.split('-', 1)[0]
    return ''.join(c for c in clean if c.isdigit())
