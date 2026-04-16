# Manual de Actualización: SGAF Producción (Ubuntu)

Este manual describe el proceso para actualizar el entorno de **Producción** (`10.0.100.119`) de forma profesional, utilizando Git y el script de seguridad automatizado.

---

## 🔒 Seguridad Primero (Antes de empezar)
1.  **Backup:** Realiza un respaldo de la base de datos de producción (Ver `MANUAL_RESPALDOS_DB.md`).
2.  **Validación en Sandbox:** NUNCA actualices producción sin haber probado los mismos cambios exitosamente en el Sandbox.

---

## 🛠️ Configuración Inicial (Solo la primera vez)
Si Producción no tiene Git activado, ejecuta estos comandos en `/home/slepiquique/sgaf/`:

```bash
# 1. Iniciar repositorio
git init
git remote add origin https://github.com/GDiazF/sgaf
git fetch origin

# 2. Configurar rama master
git checkout -b master
git branch --set-upstream-to=origin/master master

# 3. Sincronizar (CUIDADO: Esto iguala el código a lo que esté en GitHub)
git reset --hard origin/master

# 4. Autorizar el script
chmod +x remote_update_production.sh
```

---

## 🔄 Flujo de Actualización Habitual

Una vez que Git está activado, el proceso para subir una nueva versión es:

1.  **En tu PC Local:**
    ```bash
    git add .
    git commit -m "Versión estable lista para producción"
    git push origin local:master -f
    ```

2.  **En el Servidor de Producción:**
    ```bash
    cd /home/slepiquique/sgaf/
    ./remote_update_production.sh
    ```

---

## 🛡️ Protecciones del Script de Producción
El script `remote_update_production.sh` incluye salvaguardas automáticas:
*   **Check de Volumen:** Si el disco virtual de datos (`sgaf_pgdata`) no está montado, el script se detiene inmediatamente.
*   **Check de Integridad:** Si tras el despliegue la base de datos se detecta vacía (0 tablas), el script apaga los contenedores para evitar que se cree información basura o se pierda la real.
*   **Exclusión de Secretos:** El archivo `.env` está protegido por el `.gitignore` y nunca será modificado por Git.

---

## 🆘 En caso de emergencia
Si tras actualizar algo falla de forma crítica:
1.  **Revertir código:** `git reset --hard HEAD~1` (vuelve a la versión anterior).
2.  **Restaurar DB:** Usa el último archivo SQL generado en la carpeta `~/respaldos`.
