# Generated manually for folio único por tipo

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('documentacion_servicios', '0005_alter_campodefinicion_dias_aviso_and_more'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='registroserviciodoc',
            constraint=models.UniqueConstraint(
                condition=~models.Q(folio=''),
                fields=('tipo', 'folio'),
                name='uniq_registro_doc_tipo_folio_no_vacio',
            ),
        ),
    ]
