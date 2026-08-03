# Build Docker del frontend y Design System

Documento sobre por qué el build de producción del frontend depende de `design-system/` y cómo está configurado en Compose.

Relacionado: [Guía de primer despliegue Docker](./1.%20guia_primerdespliegue_docker.md) · [Design system guidelines](./design-system-guidelines.md)

---

## Problema

Al construir con `docker compose`, el frontend fallaba en `npm run build` con un error del tipo:

```text
Could not resolve "../../design-system/src/styles/index.css" from "src/main.jsx"
```

En desarrollo local funciona porque el monorepo tiene `frontend/` y `design-system/` juntos. En Docker, si el contexto de build es solo `./frontend`, la carpeta `design-system/` **no entra** a la imagen y Vite no puede resolver esa ruta.

---

## Dependencia del frontend con `@slep/ui`

El frontend usa el design system de tres formas:

| Uso | Dónde |
|-----|--------|
| Dependencia npm local | `frontend/package.json` → `"@slep/ui": "file:../design-system"` |
| Alias de Vite | `frontend/vite.config.js` → `../design-system/src/index.js` |
| Estilos globales | `frontend/src/main.jsx` → `../../design-system/src/styles/index.css` |

Todas asumen que, desde `frontend/`, existe `../design-system/`.

---

## Solución en Compose / Dockerfile

### Contexto de build

En `docker-compose.yml`, el servicio `frontend` usa la **raíz del repositorio** como contexto:

```yaml
frontend:
  build:
    context: .
    dockerfile: docker/frontend.Dockerfile
```

Así Docker puede enviar tanto `frontend/` como `design-system/`.

### Dockerfile (`docker/frontend.Dockerfile`)

1. Copia `design-system/` a `/app/design-system/`.
2. Copia e instala dependencias de `frontend/` en `/app/frontend/` (resuelve `file:../design-system`).
3. Copia el código del frontend y ejecuta `npm run build`.
4. Sirve el `dist` con nginx.

Estructura dentro del stage de build (igual que en local):

```text
/app/
  design-system/
  frontend/
```

### `.dockerignore`

Como el contexto es la raíz del repo, `.dockerignore` en la raíz excluye lo innecesario (backend, `node_modules`, media, datos de Postgres, etc.) para no inflar el contexto de build.

---

## Comandos útiles

Reconstruir solo el frontend:

```bash
docker compose build frontend --no-cache
```

Levantar todo de nuevo:

```bash
docker compose up -d --build
```

---

## Qué no cambiar sin cuidado

- No volver el contexto a `./frontend` sin otra forma de incluir `design-system` (por ejemplo multi-context o empaquetar `@slep/ui` de otra manera).
- No mover `design-system/` en el repo sin actualizar: `package.json` (`file:`), alias de Vite, import de CSS en `main.jsx` y el Dockerfile.
- El backend sigue con `context: ./backend`; su build no depende del design system.
