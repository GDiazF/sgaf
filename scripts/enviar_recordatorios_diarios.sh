#!/bin/bash

# ==============================================================================
# SCRIPT DE ENVÍO DE RECORDATORIOS AUTOMÁTICOS - SGAF
# ==============================================================================

# Configuraciones - AJUSTA LAS RUTAS SI ES NECESARIO
PROJECT_DIR="/home/svtest/sgaf/backend"
LOG_FILE="/home/svtest/sgaf/logs/recordatorios.log"
BACKEND_CONTAINER="sgaf_backend_prod"

# Crear carpeta de logs si no existe
mkdir -p "$(dirname "$LOG_FILE")"

echo "--------------------------------------------------" >> $LOG_FILE
echo "Iniciando proceso de recordatorios: $(date)" >> $LOG_FILE

# 1. Entrar al directorio del proyecto (Opcional en Docker, pero bueno para contexto)
cd $PROJECT_DIR || { echo "Error: No se pudo encontrar el directorio $PROJECT_DIR" >> $LOG_FILE; exit 1; }

# 2. Ejecutar el comando de Django dentro del contenedor
echo "Ejecutando comando en contenedor $BACKEND_CONTAINER..." >> $LOG_FILE
docker exec $BACKEND_CONTAINER python manage.py enviar_recordatorios >> $LOG_FILE 2>&1

echo "Proceso finalizado: $(date)" >> $LOG_FILE
echo "--------------------------------------------------" >> $LOG_FILE
