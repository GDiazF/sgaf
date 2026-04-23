#!/bin/bash
# --------------------------------------------------------
# 🗄️ SGAF PORTABLE - BACKUP ENGINE
# --------------------------------------------------------

# Cargar variables del .env si existe
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="./respaldos"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="sgaf_db_prod"
DB_USER=${DB_USER:-sgaf_user}
DB_NAME=${DB_NAME:-sgaf}
FILENAME="backup_${DB_NAME}_${TIMESTAMP}.sql"

mkdir -p $BACKUP_DIR

echo "⌛ Iniciando volcado de base de datos [$DB_NAME]..."

# Ejecutar respaldo
docker exec -t $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/$FILENAME

if [ $? -eq 0 ]; then
    echo "✅ Volcado completado. Comprimiendo..."
    gzip $BACKUP_DIR/$FILENAME
    echo "📦 Respaldo listo: $BACKUP_DIR/$FILENAME.gz"
    
    # Rotación: Borrar respaldos de más de 30 días
    find $BACKUP_DIR -name "*.gz" -type f -mtime +30 -delete
    echo "🧹 Rotación completada (se eliminaron archivos antiguos)."
else
    echo "❌ ERROR: El respaldo falló. Verifica que Docker esté corriendo."
    exit 1
fi
