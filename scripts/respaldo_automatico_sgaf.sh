#!/bin/bash

# ==============================================================================
# SCRIPT DE RESPALDO AUTOMÁTICO - SGAF (VERSIÓN FINAL PRODUCCIÓN)
# ==============================================================================

# Configuraciones - AJUSTA LAS RUTAS SI ES NECESARIO
BACKUP_DIR="/home/svtest/sgaf/backups"
MEDIA_DIR="/home/svtest/sgaf/backend/media" 

DB_CONTAINER="sgaf_db_prod"
DB_USER="sgaf_user"
DB_NAME="sgaf_db"

DRIVE_REMOTE="drivesoporteti"
DB_REMOTE_FOLDER="SGAF_Backups"
MEDIA_REMOTE_FOLDER="SGAF_Media"

# Variables de tiempo
DATE=$(date +%Y-%m-%d_%H-%M)
FILENAME="backup_sgaf_${DATE}.sql"

# 1. Preparar carpetas
mkdir -p $BACKUP_DIR

# 2. Respaldo de Base de Datos
echo "Generando backup de Base de Datos..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/$FILENAME
gzip $BACKUP_DIR/$FILENAME
rclone copy $BACKUP_DIR/$FILENAME.gz $DRIVE_REMOTE:$DB_REMOTE_FOLDER

# 3. Respaldo de Media (Sincronización)
echo "Sincronizando archivos de Media..."
rclone sync $MEDIA_DIR $DRIVE_REMOTE:$MEDIA_REMOTE_FOLDER -v

# 4. Limpieza automática (14 días)
echo "Limpiando archivos antiguos..."
find $BACKUP_DIR -type f -name "backup_sgaf_*.sql.gz" -mtime +14 -delete
rclone delete $DRIVE_REMOTE:$DB_REMOTE_FOLDER --min-age 14d

echo "Proceso completado exitosamente: $(date)"
