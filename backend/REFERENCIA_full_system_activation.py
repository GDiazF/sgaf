import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from funcionarios.models import Funcionario
from conectividad.models import EscuelaRed
from vehiculos.models import Vehiculo
from impresoras.models import Printer
from bienestar.models import Beneficio
from core.models import LinkInteres

def run_activation():
    print("--- Auditoria y Activacion Total ---")
    
    # 1. Usuarios
    u_count = User.objects.all().update(is_active=True, is_staff=True)
    print(f"-> Usuarios activados y hechos staff: {u_count}")
    
    # 2. Funcionarios
    f_count = Funcionario.objects.all().update(estado=True)
    print(f"-> Funcionarios activados: {f_count}")
    
    # 3. Conectividad (Escuelas)
    e_count = EscuelaRed.objects.all().update(is_active=True)
    print(f"-> Escuelas de Red activadas: {e_count}")
    
    # 4. Vehiculos
    v_count = Vehiculo.objects.all().update(activo=True)
    print(f"-> Vehiculos activados: {v_count}")
    
    # 5. Impresoras
    i_count = Printer.objects.all().update(enabled=True)
    print(f"-> Impresoras activadas: {i_count}")
    
    # 6. Beneficios
    b_count = Beneficio.objects.all().update(estado='PUBLICADO')
    print(f"-> Beneficios publicados: {b_count}")
    
    # 7. Links de Interes
    l_count = LinkInteres.objects.all().update(activo=True)
    print(f"-> Links de interes activados: {l_count}")

    print("\n--- ¡El sistema esta totalmente despierto! ---")

if __name__ == "__main__":
    run_activation()
