import pandas as pd
df = pd.read_excel("telefonos_establecimientos (1).xlsx")
print("Unique Types:", df['Tipo'].unique())
print("Unique Observations:", df['Observaciones'].unique())
