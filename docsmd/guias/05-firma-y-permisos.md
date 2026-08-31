# 05 — Firma digital y permisos

**Quién:** administrador de usuarios en la web (Admin) o TI.  
**No requiere** terminal del servidor para el día a día.

---

## Qué hace cada cosa

| Función | Ruta | Quién la usa |
|---------|------|--------------|
| Bandeja de firmas | `/firma` | Firmantes operativos |
| Laboratorio de prueba | `/firma-prueba` | Solo TI / pruebas |
| Enviar RC a firmar | Pagos → Recepciones | Quien gestiona pagos |
| Validar documento | `/validar` | Público / cualquier usuario |

---

## Dar acceso a la bandeja de firmas

En SGAF: **Admin → Roles** (o Usuarios).

### Checklist del firmante

1. **Permiso** «Puede firmar digitalmente» en su rol.
2. **Funcionario** vinculado al usuario, estado **Activo**.
3. **Grupo de firmantes**: Funcionarios → Grupos → marcar «Grupo de firmantes» y asignar el funcionario al grupo.
4. **Sello de firma** configurado (Funcionarios → Sellos de firma, o en unidad/departamento).
5. Usuario **cierra sesión y vuelve a entrar**.

Sin los cuatro primeros puntos, no verá el menú «Bandeja de firmas».

---

## Dar acceso solo al laboratorio (TI)

Permiso «Puede usar firma digital (prueba)» — **independiente** de la bandeja. No des este permiso a todos los firmantes.

---

## Enviar una RC a firmar

1. Ir a **Pagos → pestaña Recepciones**.
2. RC en estado **Emitida**, con **firmante** asignado.
3. Clic en **Enviar a firmar** (genera PDF RC + anexos y lo pone en la bandeja del firmante).

El firmante recibe notificación y firma en **Bandeja de firmas** con OTP de su certificado FirmaGob (RA).

---

## Producción vs pruebas (CERT)

| Ambiente | RUT | OTP |
|----------|-----|-----|
| **Producción** | RUT real del firmante | OTP real de la RA |
| **CERT / laboratorio** | RUTs del manual FirmaGob | Según manual |

En producción **no funcionan** los RUT de prueba `11.111.111-1` / `22.222.222-2`.

---

## Configuración en el servidor (TI, una vez)

En `~/sgaf/.env`:

```env
FIRMA_GOB_ENVIRONMENT=production
FIRMA_GOB_API_TOKEN_KEY=...
FIRMA_GOB_SECRET=...
FIRMA_DEP_API_KEY=...
API_CLIENT_KEYS=sgaf-backend:...   # misma clave que FIRMA_DEP_API_KEY
API_ALLOW_PRIVATE_NETWORKS=true
```

Tras cambiar `.env`:

```bash
docker compose up -d --build firma-dep backend
```

---

## Problemas de firma

→ [06 — Problemas frecuentes](./06-problemas-frecuentes.md#firma)
