# Protocolo de Despliegue y Resolución de Errores - Sandbox
**Fecha de Creación:** 20 de abril de 2026
**Objetivo:** Evitar discrepancias de base de datos y persistencia de versiones antiguas.

---

## 🚨 1. Automatización de Archivos (Raíz + Frontend)
El script `npm run publish` ha sido actualizado (v1.2.5+) para incluir automáticamente la raíz del proyecto.
- **Antes:** Había que hacer `git add .` manualmente.
- **Ahora:** Solo ejecuta el comando de siempre desde la carpeta `frontend`:
```powershell
npm run publish "tipo: mensaje descriptivo"
```
*El script se encarga de subir `settings.py`, `requirements.txt` y los scripts de la raíz por ti.*

---

## 🗄️ 2. Garantía de Base de Datos (Postgres vs SQLite)
Para asegurar que el Sandbox use PostgreSQL y no el archivo local `db.sqlite3`:
1. **Configuración Blindada:** El archivo `core/settings.py` ahora prioriza las variables de entorno del sistema.
2. **Variables de Entorno:** El archivo `.env.sandbox` en el servidor DEBE contener:
   - `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`.
3. **Verificación Rápida:** Ejecutar siempre este comando después de un cambio de BD:
   ```bash
   docker exec -it sgaf_sandbox_backend python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['ENGINE'])"
   ```
   *Debe devolver: `django.db.backends.postgresql`*

---

## 🔄 3. Ciclo de Actualización Correcto en el Servidor
No basta con reiniciar los contenedores. Para aplicar cambios de librerías o de React:
1. **Fetch y Reset:** `git fetch origin && git reset --hard origin/local`
2. **Reconstrucción Total:** El script `remote_update_sandbox.sh` corregido ahora ejecuta:
   ```bash
   docker compose build --no-cache sandbox_backend sandbox_frontend
   ```
3. **Limpieza de Memoria:** Si los cambios no se ven, ejecutar `docker compose down` seguido de `docker compose up -d`.

---

## 🌐 4. Persistencia de Versiones UI (Caché)
Si el código en el servidor está actualizado pero la web muestra una versión vieja:
1. Asegurarse de que el build del frontend terminó sin errores.
2. **Limpiar Caché del Navegador:** Presionar `Ctrl + F5` (Windows) o `Cmd + Shift + R` (Mac).

---

## 🛠️ 5. Comandos de Emergencia
- **Ver Usuarios Reales (Postgres):** 
  `docker exec sgaf_sandbox_db psql -U sgaf_sandbox_user -d sgaf_sandbox_db -c "SELECT username FROM auth_user;"`
- **Ver Usuarios desde Django:**
  `docker exec -it sgaf_sandbox_backend python manage.py shell -c "from django.contrib.auth.models import User; print([u.username for u in User.objects.all()])"`
- **Ver Logs en tiempo real:**
  `docker compose -f docker-compose.sandbox.yml logs -f --tail=100`

---
*Este protocolo es un documento vivo. Actualízalo con cada nuevo "gotcha" encontrado.*
