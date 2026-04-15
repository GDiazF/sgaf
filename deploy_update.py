import os
import subprocess
import tarfile

# Configuracion del servidor
SERVER_IP = "10.0.100.119"
REMOTE_USER = "slepiquique"
REMOTE_PATH = "/home/slepiquique/sgaf/"

# Carpetas y archivos a sincronizar
SYNC_ITEMS = [
    "core/", "remuneraciones/", "solicitudes_reservas/", "vehiculos/",
    "personal_ti/", "frontend/", "funcionarios/", "impresoras/", "nginx/",
    "prestamo_llaves/", "licitaciones/", "orden_compra/", "tesoreria/",
    "establecimientos/", "contratos/", "servicios/", "procedimientos/",
    "manage.py", "Dockerfile", "docker-compose.yml",
    "requirements.txt", ".env"
]

def exclude_function(tarinfo):
    excluded = ['node_modules', '.git', '__pycache__', '.env.sandbox', 'db.sqlite3', 'dist', '.venv', '.gemini']
    for pattern in excluded:
        if pattern in tarinfo.name:
            return None
    return tarinfo

def run_command(cmd):
    print(f"Exec: {cmd}")
    result = subprocess.run(cmd, shell=True)
    return result.returncode

def main():
    print("--- INICIANDO ACTUALIZACION FINAL ROBUSTA (ARQUITECTURA SANDBOX) ---")
    
    tar_name = "prod_deploy_bundle.tar.gz"
    try:
        with tarfile.open(tar_name, "w:gz") as tar:
            for item in SYNC_ITEMS:
                if os.path.exists(item):
                    print(f"  Agregando {item}...")
                    tar.add(item, filter=exclude_function)
    except Exception as e:
        print(f"Error al empaquetar: {e}")
        return

    print(f"--- Subiendo paquete a Produccion ({SERVER_IP}) ---")
    run_command(f"scp -o StrictHostKeyChecking=no {tar_name} {REMOTE_USER}@{SERVER_IP}:{REMOTE_PATH}")
    
    # Comandos remotos (Limpieza de archivos innecesarios y reconstrucción)
    commands = [
        f"tar -xzf {tar_name}",
        f"rm {tar_name}",
        "docker compose down --remove-orphans",
        "docker compose up -d --build --remove-orphans",
        "docker exec -i sgaf_backend python manage.py migrate"
    ]
    
    remote_cmds = " && ".join(commands)
    ssh_cmd = f'ssh -o StrictHostKeyChecking=no -t {REMOTE_USER}@{SERVER_IP} "cd {REMOTE_PATH} && {remote_cmds}"'
    
    print("--- Ejecutando reconstruccion total en servidor ---")
    run_command(ssh_cmd)
    
    if os.path.exists(tar_name):
        os.remove(tar_name)
        
    print("\n--- ✅ PRODUCCION ACTUALIZADA Y SINCRONIZADA CON ÉXITO ---")

if __name__ == "__main__":
    main()
