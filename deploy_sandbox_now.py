import os
import subprocess
import tarfile
import time

# Configuración del servidor
SERVER_IP = "10.0.100.119"
REMOTE_USER = "slepiquique"
REMOTE_PATH = "/home/slepiquique/sgaf_sandbox/"

# Carpetas y archivos a sincronizar
SYNC_ITEMS = [
    "core/", "remuneraciones/", "solicitudes_reservas/", "vehiculos/",
    "personal_ti/", "frontend/", "funcionarios/", "impresoras/", "nginx/",
    "prestamo_llaves/", "licitaciones/", "orden_compra/", "tesoreria/",
    "establecimientos/", "contratos/", "servicios/", "procedimientos/",
    "manage.py", "Dockerfile", "docker-compose.sandbox.yml",
    "requirements.txt", ".env.sandbox"
]

def exclude_function(tarinfo):
    excluded = ['node_modules', '.git', '__pycache__', 'dist', '.venv', '.gemini']
    for pattern in excluded:
        if pattern in tarinfo.name:
            return None
    return tarinfo

def run_command(cmd, msg):
    print(f"\n>>> {msg}...")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        print(f"❌ Error en: {msg}")
        return False
    return True

def main():
    print("--- INICIANDO DESPLIEGUE ROBUSTO ---")
    tar_name = "sandbox_bundle.tar.gz"
    
    # 1. Empaquetar
    print("1. Empaquetando archivos locales...")
    with tarfile.open(tar_name, "w:gz") as tar:
        for item in SYNC_ITEMS:
            if os.path.exists(item):
                tar.add(item, filter=exclude_function)
    
    # 2. Subir
    if not run_command(f"scp -o StrictHostKeyChecking=no {tar_name} {REMOTE_USER}@{SERVER_IP}:{REMOTE_PATH}", "2. Subiendo paquete al servidor"):
        return

    # 3. Comandos Remotos
    remote_commands = [
        f"cd {REMOTE_PATH}",
        f"tar -xzf {tar_name}",
        f"rm {tar_name}",
        "docker compose -f docker-compose.sandbox.yml down --remove-orphans",
        "docker compose -f docker-compose.sandbox.yml up -d --build --remove-orphans",
        "docker exec -i sgaf_sandbox_backend python manage.py migrate"
    ]
    
    ssh_cmd = f'ssh -o StrictHostKeyChecking=no {REMOTE_USER}@{SERVER_IP} "{" && ".join(remote_commands)}"'
    
    if not run_command(ssh_cmd, "3. Ejecutando reconstrucción en servidor (paciencia, esto compila el frontend)"):
        return

    print("\n✨ DESPLIEGUE COMPLETADO CON ÉXITO")
    print("Prueba en: http://10.0.100.119:8080")

if __name__ == "__main__":
    main()
