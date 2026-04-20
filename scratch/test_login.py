import requests
import sys

url = "http://localhost:8000/api/token/"
data = {"username": "admin", "password": "sgaf2026"}

try:
    response = requests.post(url, json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error connecting: {e}")
