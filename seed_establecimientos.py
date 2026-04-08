import os
import django
import random
import sys

# Ruta absoluta al proyecto para evitar confusiones de modulo
ROOT = r'c:\Users\SLEP IQUIQUE\Desktop\Programas\sgaf'
if ROOT not in sys.path:
    sys.path.append(ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
try:
    django.setup()
except Exception as e:
    print(f"Error en django.setup(): {e}")
    sys.exit(1)

from establecimientos.models import Establecimiento, TipoEstablecimiento

def populate():
    # 1. Crear tipos de establecimiento
    tipos_data = [
        ('Liceo', 'ESTABLECIMIENTO'),
        ('Escuela', 'ESTABLECIMIENTO'),
        ('Jardín Infantil', 'JARDIN'),
        ('OFICINA CENTRAL', 'OFICINA'),
    ]
    
    tipos_obj = []
    for nombre, area in tipos_data:
        t, _ = TipoEstablecimiento.objects.get_or_create(
            nombre=nombre,
            defaults={'area_gestion': area}
        )
        tipos_obj.append(t)

    # 2. Lista de nombres realistas
    nombres = [
        "Liceo Politécnico José Gutiérrez",
        "Escuela Eduardo Llanos",
        "Liceo Luis Cruz Martínez",
        "Escuela Gabriela Mistral",
        "Escuela Centenario",
        "Liceo Elena Duvauchelle",
        "Escuela Patricio Lynch",
        "Sala Cuna El Pionero",
        "Jardín Infantil Los Cariñositos",
        "Escuela Paula Jaraquemada",
        "Liceo Libertador O'Higgins",
        "Escuela Chipana",
        "Escuela Plácido Villarroel",
        "Liceo Bicentenario Domingo Santa María",
        "Jardín Estrellita del Mar",
        "Escuela de Sordos",
        "Liceo Artístico Violeta Parra",
        "Escuela República de Croacia",
        "Escuela Simón Bolívar",
        "Liceo Juan Pablo II",
    ]

    count = 0
    for i, nombre in enumerate(nombres):
        rbd = 1000 + i
        if Establecimiento.objects.filter(nombre=nombre).exists():
            continue
            
        Establecimiento.objects.create(
            rbd=rbd,
            nombre=nombre,
            tipo=random.choice(tipos_obj),
            director="Director Automático",
            direccion="Dirección Ejemplo 123",
            email=f"escuela{rbd}@slep.cl",
            activo=True
        )
        count += 1
    
    print(f"Población completada: {count} establecimientos creados.")

if __name__ == '__main__':
    populate()
