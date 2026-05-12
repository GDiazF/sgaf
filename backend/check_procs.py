import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from procedimientos.models import Procedimiento

procs = Procedimiento.objects.all()
print(f"Total procs: {len(procs)}")
for p in procs:
    print(f"ID: {p.id}, Title: {p.titulo}, Active: {p.activo}, File: {p.archivo.name}")
