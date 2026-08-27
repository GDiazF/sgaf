# firma-dep

Backend reusable de firma documental para aplicaciones DEP.

## Idea base

- Cada aplicacion cliente envia un PDF base.
- `firma-dep` se encarga del flujo comun:
  - preview
  - footer de validacion
  - QR
  - firma visible
  - integracion con FirmaGob
- La app cliente sigue siendo dueña de su `validationUrl`, su negocio y su almacenamiento.

## Endpoints iniciales

- `GET /api/v1/health`
- `GET /api/v1/signatures/capabilities`
- `POST /api/v1/signatures/preview-pdf`
- `POST /api/v1/signatures/sign-pdf`
- `POST /api/v1/signatures/sign-pdf-file`

## Variables de entorno

Usa `.env.example` como referencia.

### Seguridad basica

- `API_SECURITY_ENABLED=true`
  Activa o desactiva la validacion por API key.
- `API_CLIENT_KEYS=cliente-a:clave-secreta,cliente-b:otra-clave`
  Define que clientes pueden consumir la API.
- `API_ALLOW_LOCALHOST=true`
  Permite consumir la API desde `127.0.0.1` o `::1`.
- `API_ALLOWED_IPS=10.0.0.15,10.0.0.16`
  Permite definir una whitelist de IPs adicionales.
- `SWAGGER_ENABLED=true`
  Permite encender o apagar Swagger facilmente.

## Estado actual

La base ya quedo operativa con:

- proyecto Nest separado
- validacion de payloads
- Swagger en `/docs`
- previsualizacion real del PDF
- footer de validacion con QR
- integracion de firma con FirmaGob

## Flujo actual

- La app cliente envia el PDF en base64.
- `firma-dep` agrega el footer de validacion y el QR.
- Opcionalmente genera una previsualizacion del sello visible.
- Luego envia el PDF preparado a FirmaGob.
- Devuelve el PDF firmado a la aplicacion cliente.

## Formas de respuesta para integraciones

- `POST /api/v1/signatures/sign-pdf`
  Devuelve JSON con `signedPdfBase64`.
- `POST /api/v1/signatures/sign-pdf-file`
  Devuelve directamente el binario `application/pdf`.

## Como iniciarlo

1. Entra al proyecto:
   `cd C:\laragon\www\sistemas\firma-dep`
2. Instala dependencias si aun no estan:
   `npm install`
3. Levanta en desarrollo:
   `npm run start:dev`

## URLs locales

- API: `http://localhost:4010/api/v1`
- Swagger: `http://localhost:4010/docs`

## Headers de seguridad

Si `API_SECURITY_ENABLED=true`, las apps clientes deben enviar:

- `x-client-id`
- `x-api-key`

Ademas, la request debe venir desde:

- localhost, si `API_ALLOW_LOCALHOST=true`
- o una IP incluida en `API_ALLOWED_IPS`
