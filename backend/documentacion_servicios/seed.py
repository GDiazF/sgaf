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
            'usa_folio': True,
            'prefijo_folio': 'SAN-',
            'aviso_solo_ultimo_por_establecimiento': True,
        },
    )
    if not created_san:
        updates = []
        if not san.aviso_solo_ultimo_por_establecimiento:
            san.aviso_solo_ultimo_por_establecimiento = True
            updates.append('aviso_solo_ultimo_por_establecimiento')
        if not san.usa_folio:
            san.usa_folio = True
            updates.append('usa_folio')
        if not (san.prefijo_folio or '').strip():
            san.prefijo_folio = 'SAN-'
            updates.append('prefijo_folio')
        if updates:
            san.save(update_fields=updates)

    campos_fum = [
        ('folio', 'Folio', 'folio', True, 0),
        ('proveedor', 'Proveedor', 'proveedor', True, 1),
        ('establecimiento', 'Establecimiento', 'establecimiento', True, 2),
        ('fecha_servicio', 'Fecha del servicio', 'date', True, 3),
        ('archivo', 'Documento / certificado', 'file', True, 4),
        ('observaciones', 'Observaciones', 'text', False, 5),
    ]
    campos_san = [
        ('folio', 'Folio', 'folio', True, 0),
        ('proveedor', 'Proveedor', 'proveedor', True, 1),
        ('establecimiento', 'Establecimiento', 'establecimiento', True, 2),
        ('fecha_servicio', 'Fecha del servicio', 'date', True, 3),
        ('archivo', 'Documento / certificado', 'file', True, 4),
        ('observaciones', 'Observaciones', 'text', False, 5),
    ]

    for tipo, campos in ((fum, campos_fum), (san, campos_san)):
        for clave, etiqueta, tipo_dato, obligatorio, orden in campos:
            campo, created = CampoDefinicion.objects.get_or_create(
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
            if not created and clave == 'folio':
                # Asegurar folio activo/obligatorio si el tipo ya existía sin él
                changed = []
                if not campo.activo:
                    campo.activo = True
                    changed.append('activo')
                if not campo.obligatorio:
                    campo.obligatorio = True
                    changed.append('obligatorio')
                if campo.orden != 0:
                    campo.orden = 0
                    changed.append('orden')
                if campo.tipo_dato != 'folio':
                    campo.tipo_dato = 'folio'
                    changed.append('tipo_dato')
                if changed:
                    campo.save(update_fields=changed)
