import os
import django
import pandas as pd
import numpy as np

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from establecimientos.models import Establecimiento, TelefonoEstablecimiento

def import_phones():
    file_path = "telefonos_establecimientos (1).xlsx"
    df = pd.read_excel(file_path)
    
    # First, clear existing phones to avoid duplicates if we are re-running
    TelefonoEstablecimiento.objects.all().delete()
    print("Limpieza de teléfonos antiguos completada.")

    count = 0
    # Group by RBD to handle principal designation
    grouped = df.groupby('RBD')
    
    for rbd, group in grouped:
        try:
            est = Establecimiento.objects.get(rbd=rbd)
        except Establecimiento.DoesNotExist:
            print(f"ERROR: Establecimiento con RBD {rbd} no encontrado.")
            continue
        except Exception as e:
            print(f"Error buscando RBD {rbd}: {e}")
            continue

        first_valid = True
        for _, row in group.iterrows():
            phone_val = row['Teléfono']
            
            # Skip if phone is NaN
            if pd.isna(phone_val):
                continue
            
            # Convert to string and clean (remove .0 from excel floats)
            phone_str = str(phone_val).split('.')[0].strip()
            
            if not phone_str:
                continue

            # Determine label
            label = "General"
            if pd.notna(row['Tipo']):
                label = str(row['Tipo']).strip()
            elif pd.notna(row['Observaciones']):
                label = str(row['Observaciones']).strip()

            # Create Record
            TelefonoEstablecimiento.objects.create(
                establecimiento=est,
                numero=phone_str,
                etiqueta=label,
                es_principal=first_valid # First valid phone becomes principal
            )
            
            first_valid = False # Subsequent ones are not principal
            count += 1
            
    print(f"\nProceso finalizado. Total: {count} teléfonos cargados.")

if __name__ == "__main__":
    import_phones()
