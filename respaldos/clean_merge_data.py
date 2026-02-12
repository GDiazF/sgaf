import json

def clean_data():
    try:
        with open('merge_data.json', 'rb') as f:
            content = f.read()
            decoded = content.decode('utf-8', 'ignore')
            data = json.loads(decoded)
            
        cleaned = []
        for d in data:
            # Skip TelefonoEstablecimiento as it might cause conflicts if IDs overlap or if fields differ
            if d['model'] == 'establecimientos.telefonoestablecimiento':
                continue
            
            # Ensure no grupo_firmante field is sent to RecepcionConforme if it's null/missing in source
            if d['model'] == 'servicios.recepcionconforme':
                d['fields'].pop('grupo_firmante', None)
            
            # We KEEP the logo field for Establecimiento
            cleaned.append(d)
                
        with open('merge_data_final.json', 'w', encoding='utf-8') as f:
            json.dump(cleaned, f, indent=2)
        print("Successfully cleaned data into merge_data_final.json")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clean_data()
