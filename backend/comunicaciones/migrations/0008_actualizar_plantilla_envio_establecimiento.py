from django.db import migrations


CUERPO = (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.55;">'
    '<p>Estimado/a director/a,</p>'
    '<p>Junto con saludar cordialmente, envío adjunto el certificado correspondiente al último '
    'servicio de sanitización, desinsectación y desratización realizado en su establecimiento.</p>'
    '<p>Quedo atento ante cualquier consulta adicional.</p>'
    '<p>Atentamente,</p>'
    '<p>Departamento de SSGG, Operaciones y Soporte TI<br/>SLEP Iquique</p>'
    '{% if logo_cid %}'
    '<p style="margin-top:24px;">'
    '<img src="cid:{{ logo_cid }}" alt="SLEP Iquique" '
    'style="max-width:160px;height:auto;border:0;" />'
    '</p>'
    '{% endif %}'
    '</div>'
)

ASUNTO = 'Certificado {{ tipo_nombre }} — {{ establecimiento }}'


def actualizar_plantilla(apps, schema_editor):
    PlantillaCorreo = apps.get_model('comunicaciones', 'PlantillaCorreo')
    PlantillaCorreo.objects.update_or_create(
        proposito='DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO',
        defaults={
            'nombre': 'Documentación de servicios — envío al establecimiento',
            'asunto': ASUNTO,
            'cuerpo_html': CUERPO,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('comunicaciones', '0007_plantilla_envio_establecimiento'),
    ]

    operations = [
        migrations.RunPython(actualizar_plantilla, migrations.RunPython.noop),
    ]
