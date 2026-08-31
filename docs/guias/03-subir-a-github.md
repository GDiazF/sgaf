# 03 — Subir cambios a GitHub

**Quién:** desarrollador en Windows (o Mac) con Git instalado.  
**Cuándo:** probó cambios en su PC y quiere que lleguen al servidor.

---

## Flujo resumido

```
Probar en tu PC  →  git push  →  En el servidor: guía 01
```

---

## En tu PC (PowerShell o Git Bash)

### 1. Ver qué cambió

```bash
cd "C:\Users\...\SGAF_CC"
git status
```

### 2. Si cambiaste la base de datos (models.py)

Solo en tu PC, **nunca en el servidor**:

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

Incluya los archivos nuevos en `migrations/` en el commit.

### 3. Agregar y guardar

```bash
git add .
git commit -m "Describe brevemente el cambio"
```

### 4. Subir a GitHub

```bash
git push origin reingenieria
```

Si pide rama:

```bash
git push origin HEAD
```

---

## En el servidor

Siga [01 — Actualizar servidor](./01-actualizar-servidor.md).

| Tipo de cambio | En el servidor |
|----------------|----------------|
| Pantallas, menús, modales | `./scripts/deploy.sh --backup` (build frontend) |
| Solo API / migraciones | `git pull` + `./scripts/deploy.sh --backup` o `restart backend` |

---

## Versión de la app (opcional)

Antes del `git add`, en la carpeta `frontend`:

```bash
npm run fix    # corrección pequeña
npm run feat   # función nueva
npm run release # cambio grande
```

---

## Problemas con Git

→ [06 — Problemas frecuentes](./06-problemas-frecuentes.md#git)
