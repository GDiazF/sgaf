import os
import subprocess

# Configuración del servidor
SERVER_IP = "10.0.100.119"
REMOTE_USER = "slepiquique"
REMOTE_PATH = "/home/slepiquique/sgaf/"

# Carpetas y archivos a sincronizar
SYNC_ITEMS = [
    "solicitudes_reservas/",
    "core/serializers.py",
    "establecimientos/serializers.py",
    "contratos/serializers.py",
    "frontend/src/pages/reservas/ReservasDashboard.jsx",
    "frontend/src/pages/reservas/PublicReservas.jsx",
    "frontend/src/api.js",
    "docker-compose.yml"
]

def run_command(cmd):
    print(f"Exec: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
    else:
        print(f"Output: {result.stdout}")

def main():
    print(f"--- Empaquetando y Desplegando cambios en {SERVER_IP} ---")
    
    # Crear un archivo temporal con todos los cambios
    import tarfile
    tar_name = "deploy_bundle.tar.gz"
    with tarfile.open(tar_name, "w:gz") as tar:
        for item in SYNC_ITEMS:
            tar.add(item)
            
    print(f"Subiendo paquete {tar_name}...")
    run_command(f"scp -P 22 {tar_name} {REMOTE_USER}@{SERVER_IP}:{REMOTE_PATH}")
    os.remove(tar_name)
    
    # Desempaquetar y migrar
    # Usamos sudo si es necesario, pero el usuario parece tener permisos de Docker.
    # Intentaremos sin it (-i solamente) para evitar problemas de tty
    commands = [
        f"tar -xzf {tar_name}",
        f"rm {tar_name}",
        "docker exec -i sgaf_backend python manage.py makemigrations solicitudes_reservas",
        "docker exec -i sgaf_backend python manage.py migrate",
        "docker compose up --build -d",
        "echo Innovar#2026 | sudo -S rm -rf /home/slepiquique/sgaf/frontend/dist",
        "echo Innovar#2026 | sudo -S docker cp sgaf_backend:/app/frontend/dist /home/slepiquique/sgaf/frontend/",
        "docker compose restart nginx"
    ]
    
    # Ejecutar vía SSH
    remote_cmds = " && ".join(commands)
    ssh_cmd = f'ssh -p 22 {REMOTE_USER}@{SERVER_IP} "cd {REMOTE_PATH} && {remote_cmds}"'
    run_command(ssh_cmd)

    print("\n--- Despliegue completado ---")

if __name__ == "__main__":
    main()
