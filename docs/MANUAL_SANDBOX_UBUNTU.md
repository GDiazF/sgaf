# Manual de Despliegue: SGAF Docker Sandbox (Ubuntu)

Este manual describe el procedimiento para actualizar y mantener el entorno de **Sandbox** en el servidor Ubuntu (`10.0.100.119`), garantizando la integridad de la base de datos y la persistencia de los archivos multimedia (fotos, documentos, etc.).

---

## 🏗️ Arquitectura de Persistencia

Para evitar la pérdida de datos, el sistema utiliza dos mecanismos de almacenamiento que **no son afectados** por las actualizaciones de código o reinicios de contenedores:

1.  **Base de Datos (PostgreSQL):** Utiliza un volumen nombrado llamado `sgaf_sandbox_pgdata_v3`. Este disco virtual es independiente de los contenedores.
2.  **Archivos Media:** Se almacenan en la carpeta física `./media_sandbox` en el servidor. Esta carpeta está en el `.gitignore`, por lo que Git nunca la borrará al actualizar el código.

---

## 🛡️ Filtros de Seguridad Automáticos

Hemos implementado tres capas de protección para evitar que trabajes sobre una base de datos vacía por error:

### 1. Verificación de Volumen (Script)
Al inicio de cada actualización, el script verifica si el volumen `sgaf_sandbox_pgdata_v3` existe en el servidor. 
*   **Si falta:** Verás una alerta roja: `🚨 ALERTA: EL VOLUMEN NO EXISTE`.

### 2. Verificación de Contenido (Script)
Después de levantar los servicios, el script entra a la base de datos y cuenta las tablas.
*   **Si hay 0 tablas:** Verás el aviso: `⚠️ AVISO: LA BASE DE DATOS ESTÁ VACÍA`. Esto te permite saber de inmediato si los datos "desaparecieron" debido a un error de configuración en el archivo YAML.

### 3. Guardián de Logs (Django)
Si el servidor logra arrancar pero la base de datos está vacía, aparecerá un aviso gigante en los logs de Docker:
```bash
docker logs sgaf_sandbox_backend
```

---

## 🔄 Flujo de Trabajo (Deploy)

### Paso 1: Desde tu PC Local (Windows)
1.  **Guardar:** `git add .` y `git commit -m "Descripción"`.
2.  **Subir:** `git push origin local:master -f`.

### Paso 2: En el Servidor (Ubuntu)
1.  **Entrar:** `ssh slepiquique@10.0.100.119`.
2.  **Ejecutar:** `cd /home/slepiquique/sgaf_sandbox/` y `./remote_update_sandbox.sh`.

---

## 🆘 Solución de Problemas Comunes

### 1. "Permiso denegado" al ejecutar el script
Ejecuta: `chmod +x remote_update_sandbox.sh`.

### 2. Error 500 tras actualizar
Suele ser porque falta una librería. Revisa los logs: `docker logs sgaf_sandbox_backend --tail 50`. Asegúrate de haber subido el commit del archivo `requirements.txt`.

### 3. Olvido de contraseña de Admin
```bash
docker exec -it sgaf_sandbox_backend python manage.py changepassword admin
```

---

## ⚠️ Reglas de Oro (Para NO perder datos)
*   **NUNCA** ejecutes `docker compose down -v` (borra los datos).
*   **NUNCA** borres la carpeta `media_sandbox` manualmente.
*   **REVISA** siempre los avisos amarillos/rojos que imprime el script al actualizar.
