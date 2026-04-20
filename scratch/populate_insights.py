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

def populate():
    print("Iniciando población de datos para Insights...")

    # 1. Crear Subdirecciones
    subs = ['Subdirección de Finanzas', 'Subdirección de Educación', 'Subdirección de Planificación']
    sub_objs = []
    for s in subs:
        obj, _ = Subdireccion.objects.get_or_create(nombre=s)
        sub_objs.append(obj)

    # 2. Crear Departamentos
    depts = [
        ('Informática', sub_objs[0]),
        ('Tesorería', sub_objs[0]),
        ('RRHH', sub_objs[1]),
        ('Infraestructura', sub_objs[2]),
    ]
    dept_objs = []
    for d, s in depts:
        obj, _ = Departamento.objects.get_or_create(nombre=d, subdireccion=s)
        dept_objs.append(obj)

    # 3. Crear Recursos
    recursos = [
        ('Sala de Reuniones 1', 'SALA'),
        ('Sala de Directorio', 'SALA'),
        ('Camioneta Mitsubishi L200', 'VEHICULO'),
        ('Camioneta Toyota Hilux', 'VEHICULO'),
    ]
    rec_objs = []
    for n, t in recursos:
        obj, _ = RecursoReservable.objects.get_or_create(nombre=n, tipo=t)
        rec_objs.append(obj)

    # 4. Crear Usuarios y Funcionarios
    nombres = ['Juan Perez', 'Maria Garcia', 'Carlos Soto', 'Ana Lopez', 'Diego Arancibia']
    ruts = ['12345678-5', '12345677-7', '12345676-9', '12345675-0', '12345674-2']
    users = []
    for i, n in enumerate(nombres):
        username = n.lower().replace(' ', '')
        user, created = User.objects.get_or_create(username=username, email=f"{username}@slep.cl")
        if created:
            user.set_password('sgaf2026')
            user.save()
        
        # Asignar funcionario (Solo buscamos por usuario para evitar duplicados)
        dept = random.choice(dept_objs)
        func, created = Funcionario.objects.get_or_create(user=user, defaults={
            'nombre_funcionario': n,
            'rut': ruts[i],
            'subdireccion': dept.subdireccion,
            'departamento': dept,
            'estado': True
        })
        users.append(user)


    # 5. Crear Reservas Masivas
    print(f"Generando 40 reservas aleatorias...")
    for _ in range(40):
        user = random.choice(users)
        recurso = random.choice(rec_objs)
        # Fecha aleatoria en los últimos 30 días
        offset = random.randint(0, 30)
        start = timezone.now() - timedelta(days=offset)
        end = start + timedelta(hours=2)
        
        SolicitudReserva.objects.create(
            recurso=recurso,
            solicitante=user,
            titulo=f"Uso de {recurso.nombre}",
            descripcion="Reserva de prueba para estadísticas",
            fecha_inicio=start,
            fecha_fin=end,
            estado='APROBADA',
            nombre_funcionario=user.funcionario_profile.nombre_funcionario
        )

    print("¡Población completada con éxito!")

if __name__ == '__main__':
    populate()
