# 🚀 Bitácora de Migración a Producción SGAF

> [!NOTE]
> **Fecha de Migración:** 28 de Abril de 2026  
> **Objetivo:** Migrar el sistema antiguo de producción (código legacy descentralizado) hacia la nueva arquitectura dockerizada y limpia (rama `reingenieria`), asegurando cero pérdida de datos.

---

## 💾 Fase 1: Respaldo del Sistema Antiguo

Antes de tocar cualquier código, se aseguró la persistencia de la información crítica del servidor de producción original:

1. **🕵️ Identificación de Credenciales:** Se descubrieron las credenciales en duro usadas por la base de datos antigua a través de comandos internos (`docker exec sgaf_db env`).
2. **📦 Extracción de Base de Datos:** Se generó un respaldo "de oro" extrayendo la base de datos desde el contenedor de producción hacia un archivo `.sql` mediante el uso de `pg_dump`.
3. **🖼️ Resguardo Multimedia:** Se comprimió y protegió la carpeta de archivos y fotos con el comando `tar -czvf media_respaldo.tar.gz ~/sgaf/media`, garantizando que ningún contrato o avatar se perdiera en el proceso.

---

## 🧪 Fase 2: Validación en Entorno de Pruebas (Sandbox)

Para asegurar que los datos antiguos eran 100% compatibles con el nuevo código, se realizó un "simulacro" en el servidor de pruebas:

1. **📥 Inyección de Datos:** Se copió el archivo `.sql` al servidor de pruebas y se inyectó dentro de un contenedor PostgreSQL completamente vacío.
2. **🔄 Migraciones Exitosas:** Se ejecutó `python manage.py migrate`. Django adaptó perfectamente el modelo de datos viejo a las nuevas tablas estructurales (por ejemplo, añadiendo el campo `monto_consumido_previo` a los contratos sin perder su historial).
3. **✅ Verificación Visual:** Se comprobó desde el navegador que el sistema antiguo funcionaba de forma impecable montado sobre la nueva arquitectura.

---

## ⚙️ Fase 3: Migración "In Situ" del Servidor de Producción Antiguo

Con la certeza técnica de que los datos estaban a salvo y eran compatibles, se ejecutó la operación "a corazón abierto" en la IP de Producción (`10.0.100.119`):

1. **🛑 Apagado de Servicios:** Se detuvo el ecosistema antiguo con `docker compose down`.
2. **🌿 Cambio de Rama:** Se guardó el archivo `.env` antiguo en un cajón temporal (`git stash`) y se descargó la rama oficial (`git checkout reingenieria`).
3. **🧹 Limpieza Profunda:** 
   > [!WARNING]  
   > ⚠️ Se borraron más de 15 carpetas del código legacy usando el comando destructivo `git clean -fdx --exclude="media" --exclude=".env"`. Esto eliminó toneladas de basura histórica pero mantuvo estrictamente a salvo la carpeta de archivos (`~/sgaf/media`).

4. **📝 Estandarización del `.env`:** Se reescribió la configuración usando la nueva plantilla, prestando especial atención a estos detalles críticos:
   - 🗄️ **Base de Datos:** Se configuraron credenciales estandarizadas y seguras (`DB_NAME=sgaf_db`).
   - 🌐 **Puertos de Red:** Se cambió explícitamente el `FRONTEND_PORT=80` (en lugar de 5173 o 8080) para permitir acceso directo por URL sin necesidad de escribir puertos.
   - 📡 **Direccionamiento (IP):** Se ajustaron las variables de seguridad `ALLOWED_HOSTS`, `CORS` y, **críticamente**, la `VITE_API_URL` apuntándolas a `10.0.100.119` (evitando errores fatales de conexión a *localhost*).
   - 🔑 **Conservación de Sesiones:** Se rescató la antigua y robusta `SECRET_KEY` para no invalidar las contraseñas cacheadas ni las sesiones ya iniciadas de los usuarios.
   - 📧 **Notificaciones:** Se restauró la `EMAIL_HOST_PASSWORD` de Gmail para mantener intacto el sistema de alertas por correo.

5. **🏗️ Reconstrucción Absoluta:** Se eliminó el "disco duro virtual" viejo (`docker compose down -v`) y se reconstruyó la infraestructura desde cero (`docker compose up -d --build`).
6. **💉 Inyección Final:** Se introdujo el `.sql` de oro dentro del recién nacido contenedor `sgaf_db_prod` y se aplicaron las migraciones correspondientes.
7. **🗑️ Limpieza de Recursos:** Se eliminaron permanentemente los contenedores huérfanos del sandbox antiguo que ocupaban memoria innecesaria.

---

## 🛡️ Fase 4: Aseguramiento de Respaldos (Rclone + Cron)

Finalmente, se configuró el servidor para que sea auto-suficiente e indestructible frente a desastres:

1. **☁️ Conexión a la Nube:** Se reinició la configuración de `rclone` (dejando parámetros avanzados en blanco y rechazando auto-configuraciones) para vincular exitosamente una cuenta de Google Drive corporativa.
2. **📜 Script Personalizado:** Se adaptó el archivo `respaldo_automatico_sgaf.sh` al usuario correcto de producción (`slepiquique`) y a las rutas exactas del entorno vivo.
3. **⏰ Piloto Automático:** 
   > [!IMPORTANT]
   > Se programó el servicio del sistema operativo **Crontab** (`crontab -e`) para ejecutar silenciosamente los respaldos diarios de la base de datos y la media a las **09:00 AM** y **18:00 PM**, incorporando además una política inteligente de retención que elimina automáticamente de la nube los archivos con más de 14 días de antigüedad.

✨ *Resultado Final: El sistema SGAF pasó de ser un código frágil a una infraestructura moderna, dockerizada, auto-respaldada y lista para escalar en el tiempo.*
