# 08 — Manual de integración FirmaGob en SGAF

Manual para **enseñar / explicar** cómo está implementada la firma digital en SGAF (SLEP Iquique).  
No sustituye los manuales oficiales de FirmaGob (API, OTP, operador); los complementa con la arquitectura **nuestra**.

**Audiencia:** TI, desarrolladores, o quien deba capacitar a otros equipos.  
**Operación diaria de firmantes:** ver [05 — Firma y permisos](./05-firma-y-permisos.md).

---

## 1. Idea en una frase

SGAF **no habla directo** con FirmaGob desde el navegador.  
El frontend habla con **Django**; Django habla con un sidecar **firma-dep** (NestJS); **firma-dep** es el único que guarda el secret y llama a la API pública de FirmaGob.

```
Usuario (OTP + PDF)
    → Frontend React (/firma, /firma-prueba)
        → Backend Django (bandeja, RC, validador SGAF-…)
            → firma-dep :4010 (JWT + layout + pie/QR)
                → API FirmaGob (Gobierno de Chile)
```

---

## 2. Qué es cada pieza

| Pieza | Tecnología | Rol |
|-------|------------|-----|
| **Frontend** | React + `@slep/ui` | Bandeja, colocar sello, OTP, laboratorio, validador público |
| **Backend** | Django + DRF | Cola `FirmaPendiente`, permisos, RC, registro `DocumentoFirmado` (`SGAF-…`) |
| **firma-dep** | NestJS en Docker | Credenciales FirmaGob, arma JWT, prepara PDF (footer/QR), sello visible (`layout`), POST a FirmaGob |
| **FirmaGob** | API estatal | Firma criptográfica con certificado del funcionario (Propósito General + OTP) |

### Por qué un sidecar (firma-dep)

1. **Secretos:** el `FIRMA_GOB_SECRET` no vive en el frontend ni se mezcla con lógica de negocio de pagos.
2. **Reutilizable:** el mismo patrón DEP (container Nest) sirve a SGAF y, en teoría, a otras apps.
3. **PDF:** pie de validación, QR y layout del sello se preparan **antes** de enviar a FirmaGob.

---

## 3. Credenciales y ambientes

Todo en el **`.env` de la raíz** del servidor (`~/sgaf/.env`), compartido por `backend` y `firma-dep`.

| Variable | Para qué |
|----------|----------|
| `FIRMA_GOB_ENVIRONMENT` | `production` o `test` (CERT/sandbox) |
| `FIRMA_GOB_API_TOKEN_KEY` | Token Key de la aplicación en la RA |
| `FIRMA_GOB_SECRET` | Secret para firmar el JWT |
| `FIRMA_GOB_DEFAULT_ENTITY` | Nombre de la institución (como en la RA) |
| `FIRMA_GOB_PURPOSE_ATTENDED` | Suele ser `Propósito General` |
| `FIRMA_DEP_URL` | Ej. `http://firma-dep:4010/api/v1` (Docker) |
| `FIRMA_DEP_CLIENT_ID` / `FIRMA_DEP_API_KEY` | Auth entre Django ↔ firma-dep |
| `API_CLIENT_KEYS` | Mismo par `clientId:apiKey` que consume firma-dep |
| `FRONTEND_URL` | Base del link del pie (`…/validar/SGAF-…`) |

**Producción:** RUT real del funcionario + OTP del certificado (Authenticator / RA).  
**CERT/lab:** RUTs de prueba del manual FirmaGob; no firman documentos reales del SLEP.

Documentación oficial de referencia en el repo:

- `docsmd/firmagob/20260225-IntegracionApiFirmav2.pdf` — protocolo API  
- `docsmd/firmagob/OTP_-_20260304_-_Configurar_OTP.pdf` — OTP  
- `docsmd/firmagob/20260219_-_CA_-_Manual_Operador_5.0_….pdf` — operador RA  

---

## 4. Flujo operativo (negocio)

### 4.1 Recepción conforme (caso principal)

1. Se emite una **RC** con firmante asignado (funcionario + grupo de firmantes).
2. Alguien con permiso pulsa **Enviar a firmar**.
3. SGAF genera el **PDF solo de la RC** (no fusiona boletas/comprobantes en el PDF a firmar).
4. Los comprobantes quedan como **anexos del expediente** (siguen en cada pago; se listan agrupados en la ficha de la RC).
5. Se crea un ítem en **Bandeja** (`FirmaPendiente`, código interno `FP-AAAA-NNNN`).
6. El firmante abre `/firma`, revisa, coloca el sello, ingresa **OTP** y firma.
7. Al éxito:
   - PDF firmado se guarda en la RC (`archivo_escaneado`) y la RC pasa a **Completada**.
   - Se registra un código público **`SGAF-AAAA-NNNN`** (validador SGAF).
   - El pie/QR del PDF apunta a `FRONTEND_URL/validar/SGAF-…`.

### 4.2 Laboratorio (`/firma-prueba`)

Solo TI / permiso de prueba. Sube un PDF arbitrario, prueba atendida (OTP) o desatendida (lab). No es el flujo de negocio de RC.

### 4.3 Validador público (`/validar`)

Cualquiera puede consultar si un código `SGAF-…` existe en SGAF (metadatos + hash). **No** reemplaza la validación criptográfica de FirmaGob; es el registro institucional nuestro.

Si el firmante **anula la firma** desde la bandeja, el mismo código responde con `valido: false` y estado **anulado** (motivo y fecha), sin desaparecer del registro.

### 4.4 Bloqueo post-firma y anulación por firmante

Tras firmar una RC (`FirmaPendiente` → `firmado`, RC `COMPLETADA`):

- Pagos / recepciones: bloqueadas edición, comprobantes, borrado de pagos y anulación de negocio de la RC.
- Desbloqueo: `POST …/pendientes/{id}/anular/` (solo firmante o superuser), con motivo; la RC vuelve a `EMITIDA` y el `DocumentoFirmado` queda marcado anulado. **No** libera pagos (a diferencia de anular la RC).

---

## 5. Flujo técnico (firma de un PDF)

Orden real al firmar desde la bandeja:

1. **Reservar** código `SGAF-…` en BD (para meterlo ya en el pie/QR).
2. Django arma el request a firma-dep: PDF en base64, RUT, OTP, márgenes del sello, imagen de fondo del sello (admin), URL de validación.
3. **firma-dep**:
   - Valida API key cliente.
   - Decodifica PDF, opcionalmente dibuja **footer + QR** en todas las páginas.
   - Arma **JWT** (run, entity, purpose, expiration) firmado con el secret.
   - Arma **layout XML** del sello visible (coordenadas + imagen) si aplica.
   - `POST` a `api.firma.digital.gob.cl` (o CERT) con token + files[].
4. FirmaGob responde el PDF firmado (base64).
5. Django **completa** el registro `DocumentoFirmado` (hash real), guarda archivo, actualiza bandeja y origen (RC).

Si FirmaGob falla, se **libera** la reserva `SGAF-…` para no dejar códigos huérfanos.

### Dos códigos (importante al enseñar)

| Código | Ejemplo | Uso |
|--------|---------|-----|
| Interno bandeja | `FP-2026-0008` | Cola SGAF |
| Validación pública | `SGAF-2026-0003` | Pie/QR y `/validar/…` |

**Siempre enseñar el `SGAF-…`** como código de validación.

---

## 6. Sello visible

- Configuración en Django admin: **Configuración de sello (FirmaGob)** (tamaño en pt, logo, % del logo).
- Sellos por área: modelo `SelloFirma` (unidad/depto/subdirección).
- FirmaGob dibuja el texto “Firmado por…” con su layout (`layer2`); nosotros enviamos la **imagen de fondo** y la **caja** (ancho/alto/posición).
- La posición la elige el usuario arrastrando el recuadro sobre la vista previa.

---

## 7. Límite de tamaño (FirmaGob)

La API FirmaGob limita la **solicitud** a **~5 MB** (PDF en base64 + layout).  
Por eso SGAF firma **solo la RC** y deja comprobantes fuera del PDF firmado.

| Situación | Qué hacer |
|-----------|-----------|
| RC liviana + boletas pesadas | OK: se firma la RC; anexos en expediente |
| PDF único &gt; ~3,5 MB binarios | Rechazo preventivo / error de FirmaGob 400 |
| Pendiente antiguo con paquete RC+anexos | **Reenviar a firmar** para regenerar solo la RC |

Detalle operativo: [06 — Problemas frecuentes](./06-problemas-frecuentes.md#firma).

---

## 8. Permisos y requisitos del firmante

Checklist (ver guía 05):

1. Permiso **Puede firmar digitalmente**.
2. Usuario vinculado a **funcionario activo** con RUT.
3. Pertenece a un **grupo de firmantes**.
4. Sello de área configurado (recomendado).
5. Certificado **Propósito General** vigente en RA + OTP configurado.
6. **Re-login** tras cambiar roles.

Laboratorio: permiso aparte de prueba; no hace falta ser firmante operativo.

---

## 9. Mapa de código (para desarrolladores)

| Ruta en el repo | Contenido |
|-----------------|-----------|
| `services/firma-dep/` | Sidecar NestJS (JWT, sign-pdf, preview, audit) |
| `backend/firma_digital/` | Modelos, bandeja, registry `SGAF-…`, cliente HTTP a firma-dep |
| `backend/firma_digital/dep_client.py` | Django → firma-dep |
| `backend/firma_digital/queue.py` | Encolar / firmar / rechazar / anular firma |
| `backend/servicios/rc_firma.py` | Armar PDF RC + meta de anexos + enviar a bandeja |
| `frontend/src/pages/firma/` | Bandeja, modal firmar, prueba, validar |
| `docker-compose.yml` | Servicio `firma-dep` + `backend` |

Endpoints útiles:

- Django: `firma-digital/pendientes/`, `…/firmar/`, `…/rechazar/`, `…/anular/`, `…/documento/`, `firma-digital/validar/…`
- firma-dep: `POST /api/v1/signatures/sign-pdf`, `GET /api/v1/health`

---

## 10. Guion sugerido para capacitar (30–40 min)

1. **Contexto (5 min):** qué es FirmaGob y por qué no se firma “en el navegador solo”.  
2. **Diagrama (5 min):** Frontend → Django → firma-dep → FirmaGob (sección 1–2).  
3. **Demo operativa (10 min):** emitir/enviar RC → bandeja → OTP → PDF con pie `SGAF-…` → validar.  
4. **Expediente (5 min):** dónde quedan los comprobantes vs el PDF firmado.  
5. **TI (5 min):** `.env`, producción vs CERT, logs `docker compose logs firma-dep`.  
6. **Errores típicos (5 min):** OTP, permisos, límite 5 MB, FP vs SGAF (guía 06).

---

## 11. Qué no es esta integración

- No almacena el certificado del funcionario en SGAF (está en la RA / dispositivo OTP).  
- No es firma desatendida de producción para RC (el flujo de negocio usa **atendida + OTP**).  
- El validador SGAF no sustituye la verificación criptográfica ante terceros que usen herramientas FirmaGob.  
- Firmar hojas sueltas y luego “pegar” anexos **no** deja un único PDF con firma válida sobre el paquete completo.

---

## 12. Referencias internas

| Guía | Tema |
|------|------|
| [05 — Firma y permisos](./05-firma-y-permisos.md) | Roles, bandeja, RC |
| [06 — Problemas frecuentes](./06-problemas-frecuentes.md) | Fallos OTP, 400, firma-dep |
| [02 — Primera instalación](./02-primera-instalacion.md) | Variables `.env` |
| `docsmd/firmagob/*.pdf` | Manuales oficiales API / OTP / operador |
