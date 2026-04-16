# Manual de Respaldos: Base de Datos de Producción (PostgreSQL)

Este manual describe los pasos técnicos para generar, verificar y descargar copias de seguridad de la base de datos de producción (`sgaf_db`).

---

## 📍 Ubicación de los Respaldos
Los respaldos se almacenan de forma local en el servidor Ubuntu en la siguiente ruta:
` /home/slepiquique/respaldos/ `

---

## 🛠️ Procedimiento de Respaldo

### 1. Generación del Archivo SQL
Conéctate al servidor por SSH y ejecuta el siguiente bloque de comandos:

```bash
# Entrar a la carpeta de respaldos
cd ~/respaldos

# Crear el respaldo con fecha actual
docker exec -t sgaf_db pg_dump -U postgres key_system_db > respaldo_prod_$(date +%Y%m%d).sql
```

### 2. Compresión (Recomendado)
Para ahorrar espacio y facilitar la descarga, comprime el archivo generado:

```bash
gzip respaldo_prod_$(date +%Y%m%d).sql
```
*Esto generará un archivo terminado en `.sql.gz`.*

---

## 📥 Cómo descargar el respaldo a tu PC (Windows)

No necesitas estar dentro del servidor para esto. Abre una terminal **en tu computadora (PowerShell o CMD)** y ejecuta:

```powershell
# Reemplaza la fecha por la correcta
scp slepiquique@10.0.100.119:~/respaldos/respaldo_prod_20240416.sql.gz C:\Users\TuUsuario\Desktop\
```

---

## 🔄 Cómo restaurar un respaldo (Uso de emergencia)
Si alguna vez necesitas volver a cargar los datos de un respaldo en la base de datos (¡Cuidado! esto sobrescribe los datos actuales):

```bash
# 1. Descomprimir el archivo
gunzip respaldo_prod_XXXXXXXX.sql.gz

# 2. Cargar el archivo al contenedor
cat respaldo_prod_XXXXXXXX.sql | docker exec -i sgaf_db psql -U postgres key_system_db
```

---

## 💡 Recomendaciones de Seguridad
1.  **Frecuencia:** Se recomienda hacer un respaldo antes de cualquier actualización importante de código o base de datos.
2.  **Copia Externa:** No dejes los respaldos solo en el servidor Ubuntu. Descárgalos al menos una vez a la semana a tu PC local o a una nube.
3.  **Identificación:** El formato de nombre `YYYYMMDD` (AñoMesDía) te ayudará a ordenar los archivos fácilmente.
