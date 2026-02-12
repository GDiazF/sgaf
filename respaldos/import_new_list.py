import os
import django
import pandas as pd

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from establecimientos.models import Establecimiento

def import_data():
    file_path = "establecimientos (2).xlsx"
    df = pd.read_excel(file_path)
    
    mapping_tipo = {
        'Escuela': 'ESCUELA',
        'Jardín': 'JARDIN_INFANTIL',
        'Liceo': 'LICEO',
        'Sala Cuna': 'SALA_CUNA',
        'Administración': 'ADMINISTRACION',
        'Centro de Capacitación': 'CENTRO_CAPACITACION'
    }

    count = 0
    for _, row in df.iterrows():
        # Mapping Tipo
        tipo_str = row['Tipo']
        tipo_db = mapping_tipo.get(tipo_str, 'ESCUELA')
        
        # Mapping Activo
        activo = True
        if str(row['Activo']).lower() in ['no', 'falso', 'false', '0']:
            activo = False
            
        # Get or create establishment by RBD
        obj, created = Establecimiento.objects.update_or_create(
            rbd=row['RBD'],
            defaults={
                'nombre': row['Nombre'],
                'tipo': tipo_db,
                'director': row['Director'] if pd.notna(row['Director']) else "",
                'direccion': row['Dirección'] if pd.notna(row['Dirección']) else "",
                'email': row['Email'] if pd.notna(row['Email']) else "",
                'activo': activo
            }
        )
        if created:
            print(f"Creado: {obj.nombre}")
        else:
            print(f"Actualizado: {obj.nombre}")
        count += 1
    
    print(f"\nProceso finalizado. Total: {count} establecimientos.")

if __name__ == "__main__":
    import_data()
