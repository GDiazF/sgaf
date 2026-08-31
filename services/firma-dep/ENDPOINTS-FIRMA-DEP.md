# Endpoints de `firma-dep`

Este archivo explica, en lenguaje simple, para que sirve cada endpoint visible en Swagger o Postman.

## URL de Swagger

La documentacion visual de la API esta disponible en:

- `http://localhost:4010/docs`

Desde esa URL puedes:

- ver todos los endpoints
- revisar los body esperados
- ejecutar pruebas manuales
- inspeccionar respuestas del backend

### Como activarlo o desactivarlo

En el archivo `.env`:

- `SWAGGER_ENABLED=true`  -> Swagger visible
- `SWAGGER_ENABLED=false` -> Swagger apagado

## Seguridad de la API

La API puede protegerse con headers simples por cliente:

- `x-client-id`
- `x-api-key`

### Como activarlo o desactivarlo

En el archivo `.env`:

- `API_SECURITY_ENABLED=true`
- `API_SECURITY_ENABLED=false`

### Donde se configuran los clientes

En el archivo `.env`:

- `API_CLIENT_KEYS=cliente-a:clave-a,cliente-b:clave-b`

Ejemplo:

- `API_CLIENT_KEYS=cdp-backend:clave-super-segura,app-simple:otra-clave`

### Restriccion por IP o localhost

Tambien puedes limitar quien entra por origen de red:

- `API_ALLOW_LOCALHOST=true`
- `API_ALLOWED_IPS=10.0.0.15,10.0.0.16`

### Regla actual de seguridad

Si la seguridad esta activa:

- la request debe venir desde localhost permitido o desde una IP autorizada
- y ademas debe enviar `x-client-id` + `x-api-key` validos

## Log de auditoria

Cada preview y cada firma quedan registrados en:

- `logs/firma-dep-audit.log`

Ese archivo guarda, entre otros datos:

- fecha
- cliente que llamo
- endpoint o evento
- modo de firma
- nombre de archivo
- checksums
- resultado

## 1. `GET /api/v1/health`

### Para que sirve

Sirve para confirmar que el backend `firma-dep` esta encendido y respondiendo.

### Cuando usarlo

- Cuando quieres saber si la API esta levantada.
- Cuando estas probando si el servicio responde desde Postman, Swagger o desde otra aplicacion.
- Cuando una app cliente quiere hacer una verificacion rapida antes de empezar a firmar.

### Que hace

- No firma documentos.
- No llama a FirmaGob.
- Solo responde que el servicio esta disponible.

## 2. `GET /api/v1/signatures/capabilities`

### Para que sirve

Entrega un resumen del estado del servicio de firma.

### Cuando usarlo

- Cuando quieres saber si `firma-dep` esta habilitado.
- Cuando quieres validar en que ambiente esta corriendo: `test` o `production`.
- Cuando una app cliente necesita saber si el backend soporta preview, footer de validacion, QR y firma visible.

### Que hace

- No firma documentos.
- No modifica PDFs.
- No llama a FirmaGob.
- Solo entrega informacion de configuracion segura, sin exponer secretos.

## 3. `POST /api/v1/signatures/preview-pdf`

### Para que sirve

Genera una previsualizacion del PDF antes de firmarlo.

### Cuando usarlo

- Cuando quieres revisar como se vera el documento antes de enviarlo a firma real.
- Cuando necesitas confirmar posicion del sello visual.
- Cuando quieres validar que el footer de validacion y el QR queden bien incrustados.

### Que hace

- Recibe un PDF en base64.
- Agrega el footer de validacion si viene activado.
- Agrega el QR si viene configurado.
- Genera una referencia visual del sello de firma.
- Devuelve otro PDF en base64 para revisar.

### Que NO hace

- No firma de verdad.
- No llama a FirmaGob.

## 4. `POST /api/v1/signatures/sign-pdf`

### Para que sirve

Firma un documento y devuelve la respuesta en JSON.

### Cuando usarlo

- Cuando una app quiere recibir el PDF firmado dentro de un JSON.
- Cuando necesitas trabajar con `signedPdfBase64`.
- Cuando la app cliente guarda, transforma o procesa la respuesta antes de descargar el archivo.

### Que hace

- Recibe un PDF en base64.
- Lo prepara internamente con footer de validacion y QR.
- Si corresponde, agrega configuracion de sello visible para FirmaGob.
- Lo envia a FirmaGob.
- Devuelve un JSON con informacion del proceso.
- Dentro del JSON puede venir:
  - `signedPdfBase64`
  - `preparedPdfBase64`
  - `status`
  - `metadata`

### Tipo de firma

Puede usarse en:

- firma desatendida
- firma atendida

En firma atendida se debe enviar `otp`.

## 5. `POST /api/v1/signatures/sign-pdf-atendida`

### Importante

Actualmente este endpoint no existe como ruta separada en el backend.

Lo que ves en Postman como `Sign PDF Atendida` es una prueba del mismo endpoint:

- `POST /api/v1/signatures/sign-pdf`

La diferencia esta en el body:

- `signature.mode = "atendida"`
- `signature.otp = "codigo OTP"`

### Para que sirve

Permite probar firma atendida usando el endpoint general de firmado.

## 6. `POST /api/v1/signatures/sign-pdf-file`

### Para que sirve

Firma un documento y devuelve directamente el archivo PDF firmado.

### Cuando usarlo

- Cuando quieres que otra aplicacion mande un PDF y reciba el PDF firmado listo.
- Cuando no quieres trabajar con base64 en la respuesta.
- Cuando quieres descargar el archivo firmado directamente desde Postman.
- Cuando una integracion entre sistemas necesita flujo de archivo a archivo.

### Que hace

- Recibe el PDF en base64.
- Lo prepara con footer de validacion y QR.
- Lo envia a FirmaGob.
- Devuelve directamente un archivo `application/pdf`.

### Diferencia con `sign-pdf`

- `sign-pdf` devuelve JSON
- `sign-pdf-file` devuelve el archivo PDF directamente

## Resumen rapido

### Si quieres saber si el backend esta vivo

Usa:

- `GET /health`

### Si quieres saber que soporta el servicio

Usa:

- `GET /signatures/capabilities`

### Si quieres revisar como quedara el PDF antes de firmar

Usa:

- `POST /signatures/preview-pdf`

### Si quieres firmar y recibir JSON

Usa:

- `POST /signatures/sign-pdf`

### Si quieres firmar y recibir el PDF directo

Usa:

- `POST /signatures/sign-pdf-file`

## Recomendacion practica

Para integracion entre aplicaciones, normalmente conviene este flujo:

1. La app envia el PDF a `firma-dep`
2. `firma-dep` lo prepara y lo firma
3. `firma-dep` devuelve el PDF firmado directo

En ese caso, el endpoint mas comodo suele ser:

- `POST /api/v1/signatures/sign-pdf-file`
