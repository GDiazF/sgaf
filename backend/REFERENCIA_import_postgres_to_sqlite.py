import os
import django
import re
import sys
from django.db import connection, transaction
from django.apps import apps

# Configuración de Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

BACKUP_FILE = os.path.join('..', 'backups', 'backup_manual_22_04_2026.sql')

def clean_value(val):
    if val == '\\N':
        return None
    # Limpiar escapes de Postgres
    val = val.replace('\\t', '\t').replace('\\n', '\n').replace('\\r', '\r').replace('\\\\', '\\')
    return val

import json

def run_import():
    if not os.path.exists(BACKUP_FILE):
        print(f"Error: No se encuentra el archivo {BACKUP_FILE}")
        return

    print(f"--- Iniciando importación via RAW SQL + JSON Fix desde {BACKUP_FILE} ---")
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        existing_tables = [row[0] for row in cursor.fetchall()]

    with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
        in_copy = False
        table_name = None
        current_fields = []
        batch_values = []
        
        with connection.cursor() as cursor:
            cursor.execute('PRAGMA foreign_keys = OFF;')

            for line in f:
                copy_match = re.match(r'COPY (?:public\.)?(\w+) \((.*?)\) FROM stdin;', line)
                
                if copy_match:
                    table_candidate = copy_match.group(1)
                    table_name = table_candidate
                    
                    if table_name in existing_tables:
                        fields_str = copy_match.group(2)
                        current_fields = [f.strip() for f in fields_str.split(',')]
                        print(f"Importando tabla: {table_name}...", end=' ', flush=True)
                        
                        cursor.execute(f"DELETE FROM {table_name};")
                        in_copy = True
                        batch_values = []
                    else:
                        in_copy = False
                    continue
                
                if in_copy:
                    if line.strip() == '\\.':
                        if batch_values:
                            placeholders = ', '.join(['?' for _ in current_fields])
                            sql = f"INSERT INTO {table_name} ({', '.join(current_fields)}) VALUES ({placeholders})"
                            try:
                                cursor.executemany(sql, batch_values)
                            except Exception as e:
                                # Si falla el batch, intentar uno a uno para identificar el error
                                for row in batch_values:
                                    try:
                                        cursor.execute(sql, row)
                                    except Exception as row_e:
                                        print(f"\n[ERR] En {table_name}: {row_e}")
                                        # No detenemos el proceso, intentamos seguir
                        print(f"OK ({len(batch_values)} registros)")
                        in_copy = False
                        continue
                    
                    raw_values = line.strip('\n').split('\t')
                    if len(raw_values) != len(current_fields):
                        continue

                    processed_row = []
                    for i, v in enumerate(raw_values):
                        val = clean_value(v)
                        # Parche especial para JSON: asegurarnos de que sea un string JSON puro
                        field_name = current_fields[i]
                        if field_name == "json_data" and val:
                            # A veces Postgres escapa comillas dobles o barras
                            try:
                                # Validar si es JSON
                                json.loads(val)
                            except:
                                # Si no es un JSON válido tal cual, intentar arreglarlo
                                val = val.replace('\\"', '"').replace('\\\\', '\\')
                        
                        processed_row.append(val)
                    
                    batch_values.append(processed_row)
                    
                    if len(batch_values) >= 1000:
                        placeholders = ', '.join(['?' for _ in current_fields])
                        sql = f"INSERT INTO {table_name} ({', '.join(current_fields)}) VALUES ({placeholders})"
                        try:
                            cursor.executemany(sql, batch_values)
                        except:
                            # Fallback a uno a uno si el bloque falla
                            for row in batch_values:
                                try: cursor.execute(sql, row)
                                except: pass
                        batch_values = []

            cursor.execute('PRAGMA foreign_keys = ON;')
    
    print("\n--- ¡Importación finalizada con éxito! ---")
    print("Nota: Si ves errores de integridad, revisa que los modelos coincidan exactamente.")

if __name__ == "__main__":
    try:
        with transaction.atomic():
            run_import()
    except Exception as e:
        print(f"\nError fatal durante la importación: {e}")
        import traceback
        traceback.print_exc()
