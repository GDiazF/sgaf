import requests
import json

API_URL = "http://localhost:8000/api/"

def bulk_register_keys():
    try:
        # 1. Fetch all establishments
        response = requests.get(f"{API_URL}establecimientos/?page_size=1000")
        response.raise_for_status()
        data = response.json()
        establishments = data.get('results', data)

        registered_count = 0
        skipped_count = 0

        for est in establishments:
            name = est['nombre']
            est_id = est['id']

            # 2. Skip Casa Central
            if "CASA CENTRAL" in name.upper():
                print(f"Skipping: {name}")
                skipped_count += 1
                continue

            # 3. Register Key
            payload = {
                "nombre": f"LLAVES {name.upper()}",
                "establecimiento": est_id,
                "ubicacion": ""
            }

            key_response = requests.post(f"{API_URL}llaves/", json=payload)
            if key_response.status_code == 201:
                print(f"Registered key for: {name}")
                registered_count += 1
            else:
                print(f"Failed to register key for {name}: {key_response.text}")

        print(f"\nSummary:")
        print(f"Keys Registered: {registered_count}")
        print(f"Skipped: {skipped_count}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    bulk_register_keys()
