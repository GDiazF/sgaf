import pandas as pd
import os

file_path = "telefonos_establecimientos (1).xlsx"
if os.path.exists(file_path):
    df = pd.read_excel(file_path)
    print("Columnas:", df.columns.tolist())
    print("Primeras 5 filas:")
    print(df.head().to_string())
else:
    print(f"File {file_path} not found.")
