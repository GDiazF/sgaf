import os
import subprocess
import tarfile

# Configuración del servidor
SERVER_IP = "10.0.100.119"
REMOTE_USER = "slepiquique"
REMOTE_PATH = "/home/slepiquique/sgaf/"

# Carpetas y archivos a sincronizar
SYNC_ITEMS = [
    "core/",
    "remuneraciones/",
    "solicitudes_reservas/",
    "vehiculos/",
    "personal_ti/",
    "frontend/",
    "seed_remuneraciones.py",
    "docker-compose.yml"
]

def exclude_function(tarinfo):
    # Excluir carpetas pesadas y archivos de sistema
    excluded = ['node_modules', '.git', '__pycache__', '.env', 'db.sqlite3', 'dist']
    for pattern in excluded:
        if pattern in tarinfo.name:
            return None
    return tarinfo

def run_command(cmd):
    print(f"Exec: {cmd}")
    result = subprocess.run(cmd, shell=True)
    return result.returncode

def main():
    print(f"--- Empaquetando cambios (omitiendo node_modules)... ---")
    
    tar_name = "deploy_bundle.tar.gz"
    try:
        with tarfile.open(tar_name, "w:gz") as tar:
            for item in SYNC_ITEMS:
                if os.path.exists(item):
                    print(f"  Agregando {item}...")
                    tar.add(item, filter=exclude_function)
                else:
                    print(f"  Advertencia: {item} no encontrado.")
    except Exception as e:
        print(f"Error al empaquetar: {e}")
        return

    print(f"--- Subiendo paquete a {SERVER_IP} ---")
    ret = run_command(f"scp -o StrictHostKeyChecking=no {tar_name} {REMOTE_USER}@{SERVER_IP}:{REMOTE_PATH}")
    
    commands = [
        f"tar -xzf {tar_name}",
        f"rm {tar_name}",
        "docker exec -i sgaf_backend python manage.py migrate",
        "docker exec -i sgaf_backend python seed_remuneraciones.py",
        "docker compose up --build -d",
        "docker compose restart nginx"
    ]
    
    remote_cmds = " && ".join(commands)
    ssh_cmd = f'ssh -o StrictHostKeyChecking=no {REMOTE_USER}@{SERVER_IP} "cd {REMOTE_PATH} && {remote_cmds}"'
    
    print("--- Ejecutando comandos remotos (migraciones y reinicio) ---")
    run_command(ssh_cmd)
    
    if os.path.exists(tar_name):
        os.remove(tar_name)
        
    print("\n--- Despliegue completado ---")

if __name__ == "__main__":
    main()
