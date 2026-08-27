# Plantillas de documentos — propósitos y variables

Guía para entender el catálogo del editor y para **agregar un propósito nuevo** (módulo nuevo o existente).

## Modelo mental

```
Módulo / botón "Descargar PDF"
        ↓
   resuelve un propósito (clave)
        ↓
   plantilla activa con ese propósito
        ↓
   context builder rellena variables
        ↓
   Playwright genera el PDF
```

| Concepto | Qué es |
|----------|--------|
| **Propósito** | Una “ranura” de documento (ej. `recepcion_roc`, `recepcion_rlb`). Solo **una** plantilla asignada por propósito (salvo borrador). |
| **Borrador** (`borrador`) | Sin módulo. Muestra **todas** las variables. No se usa al descargar. Puede haber varios. |
| **Grupo de variables** | Bloque del panel (contrato, recepción RLB, firmante…). Cada propósito declara qué grupos ve. |
| **Variable** | Clave insertable (`{{ rc_folio }}`, `{{ pago_nro_cliente }}`, logos…). |
| **Fila repetible** (`pago_*`) | En tablas RLB: una fila modelo con variables `pago_*`; al PDF se clona por cada boleta. |

### Qué ve el usuario en el editor

El panel **Variables** depende del propósito de la plantilla:

- **Borrador** → catálogo completo (aviso en el subtítulo).
- **ROC** → compras + contrato.
- **RCF** → compras **sin** contrato.
- **RCA** → compras + contrato (compra ágil).
- **RLB** (unitario / recepción / JUNJI) → mismos grupos de pagos (`recepcion_pagos` con `pago_*`). Las 3 RLB comparten variables; cambia *quién* llama al PDF y con qué contexto.
- **Recepción de servicio** → una sola plantilla; `monto_junji` = 0 en colegio y valor en jardín (misma maqueta).

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `backend/documentos/propositos.py` | Lista de propósitos, grupos por propósito, resolvers (`proposito_from_*`). |
| `backend/documentos/variables.py` | Catálogo `VARIABLE_GROUPS` + muestras. |
| `backend/documentos/context_builders.py` | Objeto de negocio → dict de variables. |
| `backend/documentos/renderer.py` | Sustitución, filas `pago_*`, Playwright. |
| `backend/servicios/pdf/rc_adq.py` / `rc_rlb.py` | Puente “descargar” → plantilla + contexto (adquisiciones / RLB). |
| `backend/contratos/pdf_gestion.py` | Puente recepción de servicio (gestión operativa). |
| `backend/documentos/migrations/` | Alterar `choices` del campo `proposito` si agregás claves. |

---

## Cómo crear un propósito nuevo

Checklist (orden recomendado).

### 1. Definir la clave y la etiqueta

En `propositos.py`, agregá una entrada a `PROPOSITOS`:

```python
{
    'key': 'mi_modulo_acta',          # snake_case, estable
    'label': 'Acta — Mi módulo',
    'description': 'Se usa al descargar X desde Y.',
    'groups': _GROUPS_....,           # ver paso 2
    'asignable': True,
}
```

- Si renombrás una clave vieja, agregá alias en `PROPOSITO_ALIASES`.
- `borrador` es el único con `asignable: False` y `groups: None` (todas las variables).

### 2. Disponibilizar variables (grupos)

**Opción A — Reutilizar grupos existentes**  
Creá o reutilizá una lista `_GROUPS_...` con keys de `VARIABLE_GROUPS` en `variables.py`  
(`institucion`, `contrato`, `proveedor`, `establecimiento`, `recepcion`, `recepcion_pagos`, `firmante`, `sistema`, `libres`).

**Opción B — Grupo nuevo**  
1. En `variables.py`, agregá un bloque a `VARIABLE_GROUPS`:

```python
{
    'key': 'mi_grupo',
    'label': 'Mi grupo',
    'variables': [
        {'key': 'mi_campo', 'label': 'Mi campo', 'type': 'text'},
        # type 'image' → aparece en grilla de logos
    ],
},
```

2. Incluí `'mi_grupo'` en el `groups` del propósito.
3. Agregá valores de ejemplo en `SAMPLE_CONTEXT` (y filas en `_pagos_rows` solo si aplica listados).

**Variables de fila (tablas N filas)**  
Prefijo `pago_` (o el que definan + lógica en `renderer._expand_repeating_pago_rows`).  
El usuario maqueta **una** fila; el renderer la repite. Hay que llenar `_pagos_rows` en el context builder.

### 3. Context builder (datos reales)

En `context_builders.py`, función `context_from_<entidad>(...)` que devuelva un `dict` con **todas** las claves que la plantilla puede usar.

Si hay filas repetibles:

```python
ctx = { ... }
return _attach_pagos_rows(ctx, lista_de_registros)  # o equivalente
```

### 4. Resolver propósito desde el módulo

En `propositos.py`:

```python
def proposito_from_mi_entidad(obj, **kwargs):
    return 'mi_modulo_acta'
```

### 5. Cablear la descarga PDF

En el ViewSet / acción `generate_pdf` del módulo:

1. `proposito = proposito_from_mi_entidad(...)`
2. `plantilla = get_plantilla_activa(proposito)`
3. `context = context_from_...(obj, user=request.user)`
4. `render_pdf_bytes(plantilla, context)` → `FileResponse`

Patrón de referencia: `servicios/pdf/rc_adq.py`, `rc_rlb.py`.

### 6. Migración Django

El campo `PlantillaDocumento.proposito` tiene `choices`. Tras agregar la key:

```bash
cd backend
python manage.py makemigrations documentos -n proposito_mi_modulo_acta
python manage.py migrate
```

(La unicidad parcial “una plantilla por propósito ≠ borrador” ya está en el modelo.)

### 7. Frontend

- El catálogo `GET documentos/catalogo/?proposito=...` ya filtra por grupos: no hace falta lista hardcodeada si el select usa `catalog.propositos`.
- Revisá fallbacks del `<Select>` de propósito en:
  - `PlantillasDocumentosPage.jsx`
  - `PlantillaDocumentoEditorPage.jsx`  
  (solo por si el catálogo aún no cargó).

### 8. Probar

1. Crear plantilla → asignar el propósito nuevo → activar.
2. Verificar que el panel Variables muestre solo los grupos esperados.
3. Descargar PDF desde el módulo y confirmar valores / filas.

---

## Reglas rápidas

1. **Un propósito = un tipo de PDF descargable** (no mezclar ROC y RLB en el mismo).
2. **No inventar variables solo en el HTML** sin declararlas en `variables.py` y rellenarlas en el context builder.
3. **Borrador no se usa en producción de descarga**; sirve para diseñar o copiar.
4. Las tres RLB comparten variables a propósito; el `tipo` / endpoint cambia el listado o el alcance (1 vs N pagos), no el catálogo.

## Propósitos de gestión operativa

| Propósito | Cuándo | Endpoint |
|-----------|--------|----------|
| `recepcion_servicio` | Gestión **mensual**. PDF sin folio. El usuario elige el **periodo** (preselección: último abierto). Datos del periodo: montos, `nro_factura`, `fecha_servicio` (opc.). `monto_junji` = 0 si no es jardín; en jardín = monto total. Diario no aplica (usa Acta). | `GET contratos/rutas/{id}/recepcion-servicio/?periodo_id=` |

Variables específicas del periodo en la plantilla: `rs_periodo`, `rs_fecha_servicio`, `rs_nro_factura`, `rs_monto`, `monto_junji`.

El consolidado Excel del periodo sigue disponible; no hay PDF de cobro por plantilla TipTap.

## Dónde está el folio

El folio (`ROC-…`, `RLB-…`, etc.) lo asigna el **módulo al guardar** el registro. La plantilla solo muestra `{{ rc_folio }}` (u otra clave que el context exponga).
