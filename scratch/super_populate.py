import os
import sys
import django
import random
from datetime import datetime, timedelta
from django.utils import timezone

# Configurar Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from funcionarios.models import Subdireccion, Departamento, Unidad, Funcionario
from solicitudes_reservas.models import RecursoReservable, SolicitudReserva
from django.contrib.auth.models import User

def super_populate():
    print("Iniciando Super Población de Datos...")

    # 1. Limpiar datos previos de prueba (Opcional, pero recomendado para orden)
    # SolicitudReserva.objects.filter(descripcion="Reserva de prueba para estadísticas").delete()

    # 2. Estructura Jerárquica
    subs_data = {
        'Administración y Finanzas': ['Finanzas', 'RRHH'],
        'Educación y Gestión': ['Pedagogía', 'Vinculación'],
        'Planificación e Infraestructura': ['Proyectos', 'TIC']
    }
    
    unit_names = ['Área Norte', 'Área Sur']
    
    all_units = []
    
    for s_name, depts in subs_data.items():
        sub, _ = Subdireccion.objects.get_or_create(nombre=s_name)
        for d_name in depts:
            dept, _ = Departamento.objects.get_or_create(nombre=d_name, subdireccion=sub)
            for u_name in unit_names:
                unit, _ = Unidad.objects.get_or_create(nombre=f"{u_name} - {d_name}", departamento=dept)
                all_units.append(unit)

    # 3. Recursos
    recursos = [
        ('Auditorio Principal', 'SALA'),
        ('Sala de Videoconferencia', 'SALA'),
        ('Sala de Profesores', 'SALA'),
        ('Camioneta Mitsubishi L200 (1)', 'VEHICULO'),
        ('Camioneta Mitsubishi L200 (2)', 'VEHICULO'),
        ('Camioneta Toyota Hilux', 'VEHICULO'),
        ('Furgón Institucional', 'VEHICULO'),
    ]
    rec_objs = []
    for n, t in recursos:
        obj, _ = RecursoReservable.objects.get_or_create(nombre=n, tipo=t)
        rec_objs.append(obj)

    # 4. Funcionarios (3 por unidad)
    print(f"Creando funcionarios para {len(all_units)} unidades...")
    ruts_base = 10000000
    users = []
    
    for idx, unit in enumerate(all_units):
        for i in range(3):
            u_idx = (idx * 3) + i
            username = f"user_{u_idx}"
            user, created = User.objects.get_or_create(username=username, email=f"{username}@slep.cl")
            if created:
                user.set_password('sgaf2026')
                user.save()
            
            # RUT Válido (Simplificado para el script, asumiendo que 12345678-5 es base)
            # Usaremos una lista pequeña de DVs válidos o simplemente bypass si podemos
            rut_num = ruts_base + u_idx
            # Cálculo de DV para que no falle el save()
            s = 0
            m = 2
            for d in reversed(str(rut_num)):
                s += int(d) * m
                m = m + 1 if m < 7 else 2
            dv = 11 - (s % 11)
            dv_str = 'K' if dv == 10 else '0' if dv == 11 else str(dv)
            
            fullname = f"Funcionario {u_idx}"
            
            func, created = Funcionario.objects.get_or_create(user=user, defaults={
                'nombre_funcionario': fullname,
                'rut': f"{rut_num}-{dv_str}",
                'subdireccion': unit.departamento.subdireccion,
                'departamento': unit.departamento,
                'unidad': unit,
                'estado': True
            })
            users.append(user)

    # 5. Reservas Masivas (100)
    print("Generando 100 reservas históricas...")
    for _ in range(100):
        user = random.choice(users)
        recurso = random.choice(rec_objs)
        # Distribución en los últimos 60 días
        offset = random.randint(0, 60)
        start = timezone.now() - timedelta(days=offset)
        # Horas aleatorias para que no se pisen siempre
        start = start.replace(hour=random.randint(8, 17), minute=random.choice([0, 15, 30, 45]))
        end = start + timedelta(hours=random.randint(1, 4))
        
        SolicitudReserva.objects.create(
            recurso=recurso,
            solicitante=user,
            titulo=f"Reunión/Traslado {recurso.nombre}",
            descripcion="Reserva de prueba para estadísticas",
            fecha_inicio=start,
            fecha_fin=end,
            estado=random.choice(['APROBADA', 'FINALIZADA']),
            nombre_funcionario=user.funcionario_profile.nombre_funcionario
        )

    print("¡Super Población Completada!")

if __name__ == '__main__':
    super_populate()
