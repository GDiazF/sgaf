import django.db.models.deletion
from django.db import migrations, models


def forwards_migrate_cargos(apps, schema_editor):
    Funcionario = apps.get_model('funcionarios', 'Funcionario')
    Cargo = apps.get_model('funcionarios', 'Cargo')
    cache = {}
    for func in Funcionario.objects.exclude(cargo_texto='').exclude(cargo_texto__isnull=True):
        nombre = (func.cargo_texto or '').strip()
        if not nombre:
            continue
        key = nombre.casefold()
        cargo = cache.get(key)
        if cargo is None:
            cargo, _ = Cargo.objects.get_or_create(
                nombre=nombre,
                defaults={'orden': 0, 'activo': True},
            )
            cache[key] = cargo
        func.cargo = cargo
        func.save(update_fields=['cargo'])


def backwards_migrate_cargos(apps, schema_editor):
    Funcionario = apps.get_model('funcionarios', 'Funcionario')
    for func in Funcionario.objects.select_related('cargo').all():
        func.cargo_texto = func.cargo.nombre if func.cargo_id else ''
        func.save(update_fields=['cargo_texto'])


class Migration(migrations.Migration):

    dependencies = [
        ('funcionarios', '0009_grado_orden'),
    ]

    operations = [
        migrations.CreateModel(
            name='Cargo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=120, unique=True, verbose_name='Nombre')),
                ('orden', models.PositiveSmallIntegerField(db_index=True, default=0, verbose_name='Orden')),
                ('activo', models.BooleanField(default=True, verbose_name='Activo')),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('actualizado_en', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Cargo',
                'verbose_name_plural': 'Cargos',
                'ordering': ['orden', 'nombre'],
            },
        ),
        migrations.RenameField(
            model_name='funcionario',
            old_name='cargo',
            new_name='cargo_texto',
        ),
        migrations.AddField(
            model_name='funcionario',
            name='cargo',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='funcionarios',
                to='funcionarios.cargo',
                verbose_name='Cargo',
            ),
        ),
        migrations.RunPython(forwards_migrate_cargos, backwards_migrate_cargos),
        migrations.RemoveField(
            model_name='funcionario',
            name='cargo_texto',
        ),
    ]
