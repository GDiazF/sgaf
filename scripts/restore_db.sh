#!/bin/bash
# --------------------------------------------------------
# 恢复 SGAF PORTABLE - RESTORE ENGINE
# --------------------------------------------------------

if [ -z "$1" ]; then
    echo "❌ USO: ./restore_db.sh ruta/al/archivo/backup.sql.gz"
    exit 1
fi

FILE=$1
DB_CONTAINER="sgaf_db_prod"
DB_USER="sgaf_user"
DB_NAME="sgaf"

echo "⚠️ PRECAUCIÓN: Esto sobrescribirá la base de datos actual."
read -p "¿Estás seguro de continuar? (s/n): " confirm
if [[ $confirm != [sS] ]]; then exit 1; fi

echo "⌛ Restaurando base de datos..."

if [[ $FILE == *.gz ]]; then
    zcat $FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
else
    cat $FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME
fi

if [ $? -eq 0 ]; then
    echo "✅ Restauración completada con éxito."
else
    echo "❌ Error durante la restauración."
fi
