# Guía Maestra de Despliegue: Sistema de Gestión de Llaves

Esta guía está diseñada para llevar el sistema desde un entorno de desarrollo a un entorno de **Producción Local** estable. Está escrita con el máximo detalle para que pueda ser seguida por principiantes o procesada por otra IA.

---

## 1. Arquitectura del Sistema
El sistema se compone de tres piezas fundamentales que deben trabajar juntas:
1.  **Base de Datos (PostgreSQL)**: El motor que guarda la información. Es más robusto que el SQLite actual.
2.  **Backend (Django API)**: El "cerebro" que procesa los datos y la lógica.
3.  **Frontend (React Web)**: La interfaz visual con la que interactúa el usuario.

---

## 2. Opción A: Despliegue con Docker (Recomendado)
Docker permite empaquetar todo para que funcione igual en cualquier computador. Usaremos **3 contenedores**.

### Paso 1: Requisitos Previos
*   Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) o Docker Engine (Linux).
*   Asegurarse de que Docker esté corriendo.

### Paso 2: Preparar los Archivos de Configuración
Crea estos archivos EXACTAMENTE en las rutas indicadas:

#### A. `/Dockerfile` (En la raíz del proyecto)
Este archivo le dice a Docker cómo construir el "cerebro" (Backend).
```dockerfile
# Usamos una versión ligera de Python
FROM python:3.11-slim

# Evita que Python genere archivos .pyc y permite ver logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Instalamos dependencias del sistema necesarias para conectar con la base de datos
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copiamos e instalamos las librerías de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn  # Servidor de producción para Django

# Copiamos todo el código del proyecto a la imagen
COPY . .

# Comando para iniciar el servidor de producción
# Reemplaza 'core' por el nombre de tu carpeta de settings si es distinto
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
```

#### B. `/frontend/Dockerfile` (Dentro de la carpeta frontend)
Este archivo compila la web para que sea ultra rápida.
```dockerfile
# Fase 1: Compilación
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Fase 2: Servidor Web (Nginx)
# Nginx es un servidor especializado en entregar archivos web
FROM nginx:stable-alpine
# Copiamos la web compilada al servidor Nginx
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### C. `/docker-compose.yml` (En la raíz del proyecto)
El "director de orquesta" que levanta los 3 contenedores a la vez.
```yaml
services:
  # 1. La Base de Datos
  db:
    image: postgres:16-alpine
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  # 2. El Backend (API)
  backend:
    build: .
    restart: always
    volumes:
      - ./media:/app/media  # Para no perder las fotos/logos
    env_file: .env
    depends_on:
      - db

  # 3. El Frontend (Web)
  frontend:
    build: ./frontend
    ports:
      - "80:80"  # Accederás por http://localhost/
    depends_on:
      - backend
    restart: always

volumes:
  postgres_data:
```

---

### Paso 3: Lanzamiento
1.  Abre una terminal en la carpeta del proyecto.
2.  Copia tu `.env.template` a un nuevo archivo llamado `.env` y rellena los datos de la base de datos.
3.  Ejecuta:
    ```bash
    docker-compose up --build -d
    ```
4.  Crea las tablas en la nueva base de datos:
    ```bash
    docker-compose exec backend python manage.py migrate
    ```
5.  Crea tu usuario administrador:
    ```bash
    docker-compose exec backend python manage.py createsuperuser
    ```

---

## 3. Opción B: Despliegue Manual (Sin Docker)
Si vas a usar un servidor local (Windows/Linux) directamente:

1.  **Base de Datos**: Instala PostgreSQL localmente. Crea una base de datos y un usuario.
2.  **Entorno Python**:
    *   Crea un entorno virtual: `python -m venv venv`
    *   Actívalo: `venv\Scripts\activate` (Windows)
    *   Instala: `pip install -r requirements.txt`
3.  **Configuración**:
    *   Crea el archivo `.env` con los datos de tu PostgreSQL local.
    *   Asegúrate de que `DEBUG=False` en producción.
4.  **Backend**: Inicia con `python manage.py runserver 0.0.0.0:8000` (o usa Gunicorn/Waitress).
5.  **Frontend**:
    *   Entra a `/frontend`.
    *   Ejecuta `npm install` y luego `npm run build`.
    *   Usa un servidor como **Nginx** o **Apache** para servir la carpeta `/frontend/dist`.

---

## 4. Mantenimiento y Logs
*   **Ver qué pasa adentro**: `docker-compose logs -f`
*   **Detener todo**: `docker-compose down`
*   **Actualizar cambios**: `docker-compose up --build -d`

---

> **Nota para otra IA**: Al procesar este despliegue, asegúrese de que el CORS en `settings.py` permita el dominio donde se aloje el frontend, y que la variable `API_URL` en el frontend apunte a la IP del servidor backend.
