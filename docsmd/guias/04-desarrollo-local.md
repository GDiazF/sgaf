# 04 — Desarrollo local (sin Docker)

**Quién:** desarrollador que programa en su PC.  
**Resultado:** SGAF en `http://localhost:5173` con API en `http://localhost:8000`.

---

## Requisitos

- Python 3.10+
- Node.js 18+
- Git

---

## Terminal 1 — Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

Cree `backend/.env` (mínimo):

```env
DEBUG=True
SECRET_KEY=local-dev
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
CSRF_TRUSTED_ORIGINS=http://localhost:5173
FIRMA_DEP_URL=http://127.0.0.1:4010/api/v1
FIRMA_DEP_CLIENT_ID=sgaf-backend
FIRMA_DEP_API_KEY=dev-key
```

```powershell
python manage.py migrate
python manage.py runserver 8000
```

---

## Terminal 2 — Frontend

```powershell
cd frontend
npm install
```

Cree `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

```powershell
npm run dev
```

Abra **http://localhost:5173**

---

## Terminal 3 — Firma digital (solo si va a firmar)

```powershell
cd services\firma-dep
npm install
copy .env.example .env
# Editar .env con Token/Secret de FirmaGob (CERT o producción)
npm run start:dev
```

Credenciales FirmaGob van en `services/firma-dep/.env`, no en `backend/.env`.

---

## Resumen

| Terminal | Carpeta | Comando |
|----------|---------|---------|
| 1 | `backend` | `python manage.py runserver 8000` |
| 2 | `frontend` | `npm run dev` |
| 3 (opcional) | `services/firma-dep` | `npm run start:dev` |

---

## Subir cambios

→ [03 — Subir a GitHub](./03-subir-a-github.md)
