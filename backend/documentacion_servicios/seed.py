"""Semillas idempotentes de tipos Fumigación y Sanitización."""


def seed_tipos_iniciales():
    from documentacion_servicios.models import CampoDefinicion, TipoRegistroServicio

    fum, _ = TipoRegistroServicio.objects.get_or_create(
        codigo='FUMIGACION',
        defaults={
            'nombre': 'Fumigación',
            'descripcion': 'Servicios de fumigación en establecimientos.',
            'activo': True,
            'orden': 0,
            'usa_folio': True,
            'prefijo_folio': 'FMS-',
        },
    )
    san, created_san = TipoRegistroServicio.objects.get_or_create(
        codigo='SANITIZACION_ESTANQUES',
        defaults={
            'nombre': 'Sanitización de estanques',
            'descripcion': 'Sanitización de estanques en establecimientos.',
            'activo': True,
            'orden': 1,
            'usa_folio': False,
            'prefijo_folio': '',
            'aviso_solo_ultimo_por_establecimiento': True,
        },
    )
    if not created_san and not san.aviso_solo_ultimo_por_establecimiento:
        san.aviso_solo_ultimo_por_establecimiento = True
        san.save(update_fields=['aviso_solo_ultimo_por_establecimiento'])

    campos_fum = [
        ('folio', 'Folio', 'folio', True, 0),
        ('proveedor', 'Proveedor', 'proveedor', True, 1),
        ('establecimiento', 'Establecimiento', 'establecimiento', True, 2),
        ('fecha_servicio', 'Fecha del servicio', 'date', True, 3),
        ('archivo', 'Documento / certificado', 'file', True, 4),
        ('observaciones', 'Observaciones', 'text', False, 5),
    ]
    campos_san = [
        ('proveedor', 'Proveedor', 'proveedor', True, 0),
        ('establecimiento', 'Establecimiento', 'establecimiento', True, 1),
        ('fecha_servicio', 'Fecha del servicio', 'date', True, 2),
        ('archivo', 'Documento / certificado', 'file', True, 3),
        ('observaciones', 'Observaciones', 'text', False, 4),
    ]

    for tipo, campos in ((fum, campos_fum), (san, campos_san)):
        for clave, etiqueta, tipo_dato, obligatorio, orden in campos:
            CampoDefinicion.objects.get_or_create(
                tipo=tipo,
                clave=clave,
                defaults={
                    'etiqueta': etiqueta,
                    'tipo_dato': tipo_dato,
                    'obligatorio': obligatorio,
                    'orden': orden,
                    'activo': True,
                },
            )
