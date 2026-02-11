import pandas as pd
df = pd.read_excel("establecimientos (2).xlsx")
print("Unique types:", df['Tipo'].unique())
