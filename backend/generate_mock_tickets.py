import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Profile
from funcionarios.models import Funcionario, Departamento
from tickets.models import Ticket, TicketCategory

def run():
    # 1. Eliminar los falsos que creé antes (user_1 a user_10)
    users_falsos = User.objects.filter(username__startswith='user_')
    count_eliminados = users_falsos.count()
    if count_eliminados > 0:
        print(f"Limpiando {count_eliminados} usuarios de prueba antiguos...")
        for u in users_falsos:
            # Eliminar Funcionario vinculado si existe
            Funcionario.objects.filter(user=u).delete()
        users_falsos.delete()

    # 2. Obtener funcionarios reales sin usuario
    funcionarios_sin_user = Funcionario.objects.filter(user__isnull=True)
    print(f"Encontrados {funcionarios_sin_user.count()} funcionarios reales sin usuario asociado.")
    
    users_creados = 0
    for f in funcionarios_sin_user:
        username = f.rut.replace(".", "").replace("-", "").lower()
        
        user, created = User.objects.get_or_create(username=username, defaults={
            'first_name': f.nombre_funcionario.split()[0] if f.nombre_funcionario else "Funcionario",
            'last_name': " ".join(f.nombre_funcionario.split()[1:]) if f.nombre_funcionario and len(f.nombre_funcionario.split()) > 1 else "",
        })
        
        if created:
            user.set_password('Sgap2026.')
            user.save()
            Profile.objects.get_or_create(user=user)
            
        f.user = user
        f.save()
        users_creados += 1
        
    print(f"Se crearon y vincularon {users_creados} cuentas de usuario para funcionarios reales.")
    
    # 3. Crear tickets usando los funcionarios reales
    categorias = list(TicketCategory.objects.all())
    departamentos = list(Departamento.objects.all())
    estados = ['ABIERTO', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTO', 'CERRADO']
    prioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
    
    funcionarios_validos = list(Funcionario.objects.filter(user__isnull=False))
    
    if funcionarios_validos and categorias and departamentos:
        print("Generando nuevos tickets para los funcionarios reales...")
        tickets_creados = 0
        for _ in range(40):
            func = random.choice(funcionarios_validos)
            creador = func.user
            categoria = random.choice(categorias)
            estado = random.choice(estados)
            prioridad = random.choice(prioridades)
            area_destino = random.choice(departamentos)
            
            dias_atras = random.randint(0, 30)
            fecha_creacion = timezone.now() - timedelta(days=dias_atras)

            ticket = Ticket.objects.create(
                creado_por=creador,
                categoria=categoria,
                area_destino=area_destino,
                titulo=f"Solicitud: {categoria.nombre}",
                descripcion=f"Ticket generado para pruebas en el KPI, vinculado al funcionario: {func.nombre_funcionario}.",
                prioridad=prioridad,
                estado=estado
            )
            
            Ticket.objects.filter(id=ticket.id).update(fecha_creacion=fecha_creacion)
            tickets_creados += 1
            
        print(f"Se generaron {tickets_creados} tickets exitosamente.")
    else:
        print("Faltan departamentos o categorias para crear tickets.")

if __name__ == '__main__':
    run()
