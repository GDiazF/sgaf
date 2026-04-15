# Manual de Despliegue - Sistema SGAF

Este documento detalla el proceso técnico, la arquitectura y los procedimientos de seguridad para el despliegue del Sistema de Gestión Administrativa y Financiera (SGAF).

---

## 1. Arquitectura del Sistema
El sistema utiliza una arquitectura de contenedores Docker:
- **Backend**: Django (Python 3.12).
- **Frontend**: React + Vite (Node 20).
- **Servidor Web**: Nginx (como Proxy Inverso).
- **Base de Datos**: PostgreSQL 16.

### Entornos
- **Producción**: `http://10.0.100.119` (Puerto 80). Carpeta en servidor: `/home/slepiquique/sgaf/`.
- **Sandbox**: `http://10.0.100.119:8080` (Puerto 8080). Carpeta en servidor: `/home/slepiquique/sgaf_sandbox/`.

---

## 2. Archivos de Configuración Críticos

### 📄 `.env` y `.env.sandbox`
Contienen las variables de entorno (claves secretas, credenciales de DB). 
**Importante**: El script de despliegue sube el archivo correspondiente desde tu PC local. Asegúrate de que las IPs y contraseñas sean las correctas antes de ejecutar.

### 📄 `docker-compose.yml` (Producción)
- Define los contenedores `sgaf_db`, `sgaf_backend` y `sgaf_frontend`.
- **Persistencia**: Mapea la base de datos a `/home/slepiquique/sgaf_pgdata` en el host. Esto garantiza que los datos no se borren al actualizar el código.

### 📄 `deploy_update.py` (Script de Despliegue de Producción)
Este script automatiza pasos clave:
1.  **Exclusión de Archivos**: Ignora `node_modules`, `dist` y `.git` para que la subida sea rápida.
2.  **Transferencia**: Empaqueta y sube el código vía `scp`.
3.  **Extracción remota**: Descomprime todo en `/home/slepiquique/sgaf/`.
4.  **Limpieza de Huérfanos**: Usa `docker compose down --remove-orphans`. Esto es CRÍTICO para liberar puertos (como el 80) si algún contenedor antiguo quedó "colgado".
5.  **Reconstrucción**: Ejecuta `docker compose up --build` para recompilar todo.

---

## 3. Procedimiento de Despliegue Seguro

### Paso 0: Respaldo de Seguridad (MANDATORIO)
Antes de cualquier despliegue en producción, genera un respaldo:
```powershell
ssh slepiquique@10.0.100.119 "docker exec sgaf_db pg_dump -U sgaf_user sgaf" > respaldo_sgaf_$(date +%F).sql
```
*Este comando crea un archivo .sql en tu PC local con toda la información actual.*

### Paso 1: Pruebas en Sandbox
1. Realiza tus cambios en VS Code.
2. Ejecuta: `python deploy_sandbox_now.py`.
3. Prueba en: `http://10.0.100.119:8080`.

### Paso 2: Paso a Producción
1. Si Sandbox está OK, ejecuta: `python deploy_update.py`.
2. El sistema se actualizará. No se perderán datos debido a que la carpeta `sgaf_pgdata` es independiente.

---

## 4. Gestión de Datos y Recuperación

### ¿Cómo se protegen los datos?
En el archivo `docker-compose.yml`, la base de datos tiene esta línea:
```yaml
volumes:
  - /home/slepiquique/sgaf_pgdata:/var/lib/postgresql/data
```
Esto significa que aunque borres la carpeta del programa (`/home/slepiquique/sgaf/`), la base de datos sobrevive en una carpeta diferente.

### Recuperación desde un Respaldo
Si necesitas volver atrás una base de datos:
```powershell
cat nombre_de_tu_respaldo.sql | ssh slepiquique@10.0.100.119 "docker exec -i sgaf_db psql -U sgaf_user sgaf"
```

---

---

## 6. Entorno de Desarrollo Local

Para probar cambios **sin afectar producción ni sandbox**, el sistema puede levantarse completamente en la PC del desarrollador usando SQLite en lugar de PostgreSQL.

### Archivos Clave para Desarrollo Local
| Archivo | Propósito |
|---|---|
| `run_local.py` | Script maestro de arranque local |
| `.env.local_dev` | Variables de entorno para desarrollo (SQLite, sin Docker) |
| `.env.prod_backup` | Respaldo automático del `.env` de producción |
| `db.sqlite3` | Base de datos local (solo para pruebas, nunca va al servidor) |

> ⚠️ **IMPORTANTE**: La base de datos local (SQLite) es independiente de producción. Los datos de prueba no afectan ni se mezclan con los datos reales.

### Primer Uso (Setup Inicial)
Solo se hace una vez. Reemplaza el `.env` de producción con uno para SQLite y crea el usuario `admin` de prueba:
```powershell
python run_local.py setup
```
Esto:
1. Crea `.env.local_dev` con configuración SQLite.
2. Hace backup del `.env` de producción en `.env.prod_backup`.
3. Reemplaza el `.env` activo por el local.
4. Ejecuta `migrate` para crear las tablas.
5. Crea el usuario de prueba `admin / admin1234`.

### Levantar el Sistema Local
Abrir **dos terminales** en la carpeta del proyecto:

**Terminal 1 — Backend Django:**
```powershell
python manage.py runserver 8000
```

**Terminal 2 — Frontend React:**
```powershell
cd frontend
npm run dev
```

Acceder en: `http://localhost:5173`

### Credenciales de Prueba Local
```
Usuario:    admin
Contraseña: admin1234
```

### Restaurar el `.env` de Producción
Antes de hacer cualquier despliegue al servidor, restaurar el `.env` original:
```powershell
python run_local.py restore
```

### Ciclo de Trabajo Recomendado
```
1. [Local]   python run_local.py       → Probar cambios en localhost:5173
2. [Sandbox] python deploy_sandbox_now.py → Validar en red interna
3. [Backup]  Ejecutar pg_dump en servidor antes del paso 4
4. [Prod]    python deploy_update.py    → Subir a producción
```

### Por qué el `.env` local usa SQLite y no PostgreSQL
El archivo `.env` de producción tiene `DB_HOST=db` (nombre del contenedor Docker). Fuera de Docker, ese host no existe y Django lanza un error de conexión. El `.env.local_dev` deja `DB_HOST=` vacío, lo que hace que Django use SQLite automáticamente.

---

## 5. Glosario de Comandos Útiles en el Servidor
- **Ver logs**: `docker compose logs -f --tail=100`
- **Ver contenedores**: `docker ps`
- **Reiniciar todo**: `docker compose restart`

---
*Manual generado el 14 de abril de 2026 para SGAF. Última actualización: 14 de abril de 2026.*
