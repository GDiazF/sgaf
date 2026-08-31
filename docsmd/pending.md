# Tareas Pendientes: Configuración de SSL/HTTPS (Puesta en Marcha)

Este documento detalla los pasos técnicos y decisiones operativas pendientes para habilitar el cifrado de transporte seguro (HTTPS) en el servidor de producción, conforme a las exigencias de seguridad de la **Ley N° 21.719** (Art. 14 quinquies).

---

## 📋 Estado Actual

Para facilitar el desarrollo, las pruebas locales y el despliegue en la IP de pruebas (`10.0.100.101`) sin necesidad de certificados, se ha configurado el sistema por defecto en **modo HTTP (puerto 80)**.
*   En [settings.py](file:///c:/Users/SLEP%20IQUIQUE/Desktop/Programas/SGAF_CC/backend/core/settings.py#L187) se estableció `SECURE_SSL_REDIRECT = False` por defecto.
*   El contenedor de Nginx en `docker-compose.yml` y su archivo de configuración `nginx.conf` solo escuchan y redirigen el puerto 80.

---

## 🚀 Pasos para Habilitar HTTPS en Producción

Cuando el sistema esté listo para entrar en producción al 100%, sigue estos pasos:

### 1. Obtener los Certificados SSL/TLS (Elegir una opción)

*   **Opción 1: Subdominio Público con Let's Encrypt (Recomendada)**
    *   Si el servidor tiene salida a Internet y un dominio público asignado (ej: `sgaf.slepiquique.cl`), genera certificados gratuitos usando Certbot en el host de Ubuntu.
*   **Opción 2: Certificado de la Entidad Certificadora del SLEP**
    *   Si la red es una intranet controlada por el departamento de TI, solicita al administrador de redes del SLEP que emita un certificado SSL oficial interno desde su Windows Server Active Directory Certificate Services (AD CS).
*   **Opción 3: Certificado Autofirmado (Self-Signed) con OpenSSL**
    *   Genera tus propios archivos de claves directamente en Ubuntu de forma gratuita:
        ```bash
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout sgaf.key -out sgaf.crt
        ```

---

### 2. Modificar la Configuración de Nginx (`docker/nginx/nginx.conf`)

Edita el archivo de configuración para escuchar en el puerto `443` y enlazar los certificados:

```nginx
server {
    listen 80;
    server_name sgaf.slepiquique.cl;
    return 301 https://$host$request_uri; # Redirecciona HTTP a HTTPS
}

server {
    listen 443 ssl;
    server_name sgaf.slepiquique.cl;

    ssl_certificate /etc/nginx/certs/sgaf.crt;
    ssl_certificate_key /etc/nginx/certs/sgaf.key;

    client_max_body_size 200M;

    # ... Mantener el resto de locations de API, Static y Media ...
}
```

---

### 3. Exponer el Puerto 443 en `docker-compose.yml`

Actualiza el servicio `frontend` en tu archivo `docker-compose.yml` para mapear el puerto de HTTPS y montar los certificados:

```yaml
  frontend:
    # ...
    ports:
      - "${FRONTEND_PORT:-80}:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./docker/nginx/certs:/etc/nginx/certs:ro # Carpeta que contiene sgaf.crt y sgaf.key
      - ./media:/app/media:ro
      - ./staticfiles:/app/staticfiles:ro
```

---

### 4. Activar el Redireccionamiento en Django (`.env`)

En el archivo `.env` del servidor de producción, activa la redirección forzada y las cookies seguras modificando o agregando la variable:

```env
SECURE_SSL_REDIRECT=True
```

---

### 5. Reiniciar Contenedores

Una vez realizados todos los pasos anteriores, reconstruye y levanta el sistema:

```bash
docker compose down
docker compose up -d --build
```
