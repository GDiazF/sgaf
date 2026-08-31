"""Correos de contacto de un establecimiento (institucional + director/a)."""


def correos_envio_establecimiento(establecimiento) -> list[str]:
    """
    Devuelve correos únicos para envíos al colegio: institucional y director/a.
    Orden: email del establecimiento, luego email_director.
    """
    if not establecimiento:
        return []

    destinatarios: list[str] = []
    vistos: set[str] = set()
    for raw in (
        getattr(establecimiento, 'email', None),
        getattr(establecimiento, 'email_director', None),
    ):
        email = (raw or '').strip()
        if not email:
            continue
        key = email.lower()
        if key in vistos:
            continue
        vistos.add(key)
        destinatarios.append(email)
    return destinatarios
