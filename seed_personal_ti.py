import os
import django
import sys

# Agregar el directorio actual al path
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from personal_ti.models import FuncionTI, ContratoTI

def seed_data():
    # Sembrar Funciones
    funciones = [
        ('Técnico de Enlaces', '#3b82f6'),
        ('Coordinador(a) de Enlaces', '#8b5cf6'),
        ('Encargado(a) Enlace', '#f59e0b'),
        ('Técnico/a Enlace', '#06b6d4'),
    ]
    for nom, col in funciones:
        f, created = FuncionTI.objects.get_or_create(nombre=nom, defaults={'color': col})
        if created: print(f"Función creada: {nom}")

    # Sembrar Contratos
    contratos = [
        ('24', 'Profesor Titular', '#10b981'),
        ('25', 'Profesor Contrata', '#14b8a6'),
        ('27', 'Asistentes Educación Plazo Fijo', '#f97316'),
        ('28', 'Asistentes Educación Plazo Indefinido', '#6366f1'),
    ]
    for cod, nom, col in contratos:
        c, created = ContratoTI.objects.get_or_create(codigo=cod, defaults={'nombre': nom, 'color': col})
        if created: print(f"Contrato creado: {cod} - {nom}")

if __name__ == '__main__':
    seed_data()
