# Guía de Errores Conocidos y Soluciones - SGAF

Este documento recopila problemas comunes encontrados durante el desarrollo y despliegue del sistema y cómo resolverlos rápidamente.

---

## 1. Errores de Despliegue (Docker/SSH)

### ❌ Error: `Bind for 0.0.0.0:80 failed: port is already allocated`
- **Causa**: Un contenedor antiguo (ej. `sgaf_nginx`) o un servicio del servidor (ej. Apache/Nginx local) está ocupando el puerto 80.
- **Solución**: 
  1. Los scripts actuales ya usan `--remove-orphans`, pero si persiste, limpia manualmente:
     ```bash
     ssh slepiquique@10.0.100.119 "docker stop $(docker ps -q); docker rm $(docker ps -a -q)"
     ```
  2. Verifica si hay un Nginx instalado directamente en el sistema operativo:
     ```bash
     ssh slepiquique@10.0.100.119 "sudo systemctl stop nginx"
     ```

### ❌ Error: `rm: no se puede borrar 'frontend/dist/...': Permiso denegado`
- **Causa**: Los archivos fueron creados por el usuario `root` dentro de un contenedor y el usuario `slepiquique` no tiene permiso para borrarlos por fuera.
- **Solución**: 
  - Los scripts actualizados ya **ignoran** esta carpeta para evitar el error. 
  - Si necesitas borrarla manualmente en el servidor:
    ```bash
    ssh slepiquique@10.0.100.119 "sudo rm -rf /home/slepiquique/sgaf/frontend/dist"
    ```

---

## 2. Errores de Aplicación (Backend/Frontend)

### ❌ Error: `500 Internal Server Error` al iniciar sesión
- **Causa**: Generalmente es un problema de conexión con la base de datos (credenciales incorrectas en el `.env`).
- **Solución**: 
  1. Verifica el archivo `.env` local antes de subirlo.
  2. Revisa los logs del servidor para ver el error exacto de Django:
     ```bash
     ssh slepiquique@10.0.100.119 "cd sgaf && docker compose logs backend"
     ```

### ❌ Error: Los cambios en el código no se ven reflejados
- **Causa**: El navegador tiene archivos antiguos en caché o Docker usó una imagen antigua ("cached layer").
- **Solución**: 
  1. Forzar reconstrucción sin caché:
     ```bash
     # En el servidor
     docker compose build --no-cache frontend
     docker compose up -d
     ```
  2. Prueba en el navegador con `Ctrl + F5` o en una ventana de Incógnito.

---

## 3. Errores de Base de Datos

### ❌ Error: `Relation "tabla" does not exist`
- **Causa**: Faltan migraciones por aplicar en el servidor.
- **Solución**: 
  - El script lo hace automático, pero puedes forzarlo:
    ```bash
    ssh slepiquique@10.0.100.119 "docker exec -it sgaf_backend python manage.py migrate"
    ```

### ❌ Error: El contenedor de DB se reinicia constantemente
- **Causa**: Problemas de permisos en la carpeta `/home/slepiquique/sgaf_pgdata` o espacio en disco lleno.
- **Solución**: 
  1. Verifica el espacio: `df -h`.
  2. Revisa los logs de la DB: `docker compose logs db`.

---

## 4. Problemas de Archivos Estáticos y Media

### ❌ Error: Las imágenes subidas no se ven (404 Not Found)
- **Causa**: El volumen de `media` no está correctamente mapeado en Nginx o los permisos de carpeta son incorrectos.
- **Solución**: 
  1. Asegura que el `docker-compose.yml` tenga el volumen:
     `- /home/slepiquique/sgaf/media:/app/media`
  2. En el servidor, dale permisos de escritura:
     ```bash
     ssh slepiquique@10.0.100.119 "sudo chmod -R 777 /home/slepiquique/sgaf/media"
     ```

---

## 5. Errores de Desarrollo Local

### ❌ Error: `could not translate host name "db" to address`
- **Causa**: El `.env` de producción tiene `DB_HOST=db` (nombre del contenedor Docker). Al correr Django fuera de Docker, ese host no existe en la red local.
- **Solución**:
  1. Ejecuta el setup del entorno local (solo la primera vez):
     ```powershell
     python run_local.py setup
     ```
  2. Esto reemplaza el `.env` con uno que usa SQLite y hace backup del original.
  3. Para restaurar el `.env` de producción antes de desplegar:
     ```powershell
     python run_local.py restore
     ```

### ❌ Error: `401 Unauthorized` al intentar hacer login en local
- **Causa**: La base de datos SQLite local está vacía — no tiene usuarios porque los datos de producción están en PostgreSQL del servidor.
- **Solución**: Crear el usuario administrador local:
  ```powershell
  python manage.py shell -c "from django.contrib.auth.models import User; u,_=User.objects.get_or_create(username='admin'); u.set_password('admin1234'); u.is_superuser=True; u.is_staff=True; u.save(); print('Listo')"
  ```
  - **Usuario**: `admin` — **Contraseña**: `admin1234`

### ❌ Error: `no such table: auth_user` en SQLite local
- **Causa**: Las migraciones no se han ejecutado aún en el SQLite local.
- **Solución**:
  ```powershell
  python manage.py makemigrations
  python manage.py migrate
  ```

### ❌ Error: Los emojis generan `UnicodeEncodeError` en la terminal
- **Causa**: La terminal de Windows (PowerShell por defecto) usa cp1252 y no puede renderizar Unicode extendido.
- **Solución**: Es un error inofensivo de la terminal, no del sistema. Si el último mensaje fue `Exit code: 0`, el comando se ejecutó correctamente. También puedes forzar UTF-8:
  ```powershell
  $OutputEncoding = [System.Text.Encoding]::UTF8
  ```

---

## 6. Errores del Módulo de Reservas

### ❌ Reservas PENDIENTES vencidas aparecen en el historial
- **Causa** (comportamiento anterior): El sistema marcaba las reservas pendientes expiradas como `CANCELADA` en lugar de eliminarlas, generando ruido en el histórico.
- **Solución aplicada**: El sistema ahora las **elimina automáticamente** al cargarse la vista de reservas. No requiere acción manual.

### ❌ El botón "Eliminar Permanentemente" no aparece en una reserva
- **Causa**: El usuario no tiene el permiso especial `can_force_delete_reserva`.
- **Solución**:
  1. Iniciar sesión como superusuario.
  2. Ir a **Administración → Gestión de Roles**.
  3. Crear o editar un grupo y asignarle el permiso:
     `solicitudes_reservas | Puede eliminar reservas activas (PENDIENTE o APROBADA) mal solicitadas`
  4. Asignar ese grupo al usuario correspondiente.
  - Nota: El botón solo aparece para reservas en estado `PENDIENTE` o `APROBADA`. Para estados `FINALIZADA`, `RECHAZADA` o `CANCELADA` no aplica.

### ❌ Error `403 Forbidden` al llamar al endpoint `force-delete`
- **Causa**: El usuario intentó llamar directamente al endpoint `DELETE /api/reservas/solicitudes/{id}/force-delete/` sin tener el permiso `can_force_delete_reserva`.
- **Solución**: Asignar el permiso como se describe arriba. Solo los superusuarios pueden saltarse esta restricción.

---
*Este manual se irá actualizando a medida que se detecten nuevos incidentes. Última actualización: 14 de abril de 2026.*
