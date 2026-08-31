from django.db import migrations


CUERPO = (
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.55;">'
    '<p>Estimado/a director/a,</p>'
    '<p>Junto con saludar cordialmente, envío adjunto el certificado correspondiente al servicio '
    'de <b>{{ tipo_nombre }}</b> realizado en su establecimiento'
    '{% if establecimiento %} (<b>{{ establecimiento }}</b>){% endif %}'
    '{% if fecha_servicio %} el {{ fecha_servicio }}{% endif %}.</p>'
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
    PlantillaCorreo.objects.filter(
        proposito='DOC_SERVICIOS_ENVIO_ESTABLECIMIENTO',
    ).update(
        asunto=ASUNTO,
        cuerpo_html=CUERPO,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('comunicaciones', '0008_actualizar_plantilla_envio_establecimiento'),
    ]

    operations = [
        migrations.RunPython(actualizar_plantilla, migrations.RunPython.noop),
    ]
