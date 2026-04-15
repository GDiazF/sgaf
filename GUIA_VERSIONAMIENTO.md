# 🚀 Guía de Versionamiento y Publicación - SGAF

Esta guía explica cómo utilizar el sistema automático de versiones y subida a GitHub para el proyecto SGAF.

## 📌 Los Tres Pilares de Versión

El sistema utiliza el estándar **SemVer** (MAYOR.MENOR.PARCHE). Dependiendo del cambio que realices, el sistema actualizará el número correspondiente:

1.  **`fix:`** (Parche) -> Para arreglos de errores, ajustes visuales o cambios pequeños.
    *   *Ejemplo: `1.0.4` -> `1.0.5`*
2.  **`feat:`** (Menor) -> Para nuevas funcionalidades, nuevos módulos o herramientas.
    *   *Ejemplo: `1.0.5` -> `1.1.0`*
3.  **`release:`** (Mayor) -> Para cambios estructurales masivos o rediseños completos.
    *   *Ejemplo: `1.1.0` -> `2.0.0`*

---

## 🛠️ Cómo Publicar Cambios

Ya no es necesario hacer `git add`, `git commit` y `git push` por separado, ni cambiar los archivos de versión a mano. Sigue estos pasos:

1.  Asegúrate de estar en la carpeta **`frontend`** de tu terminal.
2.  Escribe el comando `npm run publish` seguido de tu mensaje con el formato `tipo: mensaje`.

### Ejemplos de uso:

#### ✅ Caso A: Arreglaste un error en una tabla
```bash
npm run publish fix: corregido error de selección en tabla de pagos
```

#### ✅ Caso B: Agregaste un nuevo módulo de reportería
```bash
npm run publish feat: implementada descarga de reportes en excel
```

#### ✅ Caso C: Hiciste un cambio total del sistema
```bash
npm run publish release: lanzamiento de la nueva interfaz institucional
```

---

## 🔍 ¿Qué sucede internamente?

Cuando ejecutas el comando, el sistema realiza automáticamente:
1.  **Actualiza `package.json`** con el nuevo número de versión.
2.  **Actualiza version.js y package.json** con el nuevo número de versión y la fecha.
3.  **Detecta tu rama actual** de Git.
4.  **Ejecuta Git:** Hace el "Add" y "Commit".
5.  **Push Estratégico:** Sube tus cambios desde cualquier rama local hacia la rama **`local`** de GitHub automáticamente.

---

## 👤 Información del Desarrollador

Toda la información de créditos y versión se visualiza en el sistema dentro del menú:
**Perfil -> Acerca del Sistema**

---

> [!IMPORTANT]
> Es fundamental mantener el formato **`tipo: mensaje`** (con los dos puntos) para que el sistema pueda identificar correctamente qué parte de la versión debe subir.
