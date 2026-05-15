import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from funcionarios.models import Funcionario, Departamento
from tickets.models import Ticket, TicketCategory

def run():
    print("Buscando usuario en el departamento de Remuneraciones...")
    
    # Buscar el departamento de remuneraciones
    depto_remuneraciones = Departamento.objects.filter(nombre__icontains='remuneraciones').first()
    
    if not depto_remuneraciones:
        print("No se encontró el departamento de Remuneraciones. Buscando en Unidades...")
        from funcionarios.models import Unidad
        unidad_remu = Unidad.objects.filter(nombre__icontains='remuneraciones').first()
        if unidad_remu:
            depto_remuneraciones = unidad_remu.departamento
            print(f"Se usará el departamento: {depto_remuneraciones.nombre} (Unidad: {unidad_remu.nombre})")
        else:
            # Crear uno si no existe
            from funcionarios.models import Subdireccion
            sub, _ = Subdireccion.objects.get_or_create(nombre="Subdirección de Administración y Finanzas")
            depto_remuneraciones, _ = Departamento.objects.get_or_create(nombre="Departamento de Remuneraciones", subdireccion=sub)
            print("Se creó el Departamento de Remuneraciones.")

    # Obtener funcionario en ese departamento
    funcionario = Funcionario.objects.filter(departamento=depto_remuneraciones, user__isnull=False).first()
    
    if not funcionario:
        # Crear un funcionario temporal si no hay ninguno
        print("No se encontró un funcionario con usuario en Remuneraciones. Creando uno...")
        user, _ = User.objects.get_or_create(username='user_remuneraciones', defaults={
            'first_name': 'Funcionario',
            'last_name': 'Remuneraciones'
        })
        user.set_password('Sgap2026.')
        user.save()
        
        # Valid rut calculation
        def calcular_dv(rut):
            rut_str = str(rut)
            suma = 0
            multiplo = 2
            for r in reversed(rut_str):
                suma += int(r) * multiplo
                multiplo = multiplo + 1 if multiplo < 7 else 2
            dv_calculado = 11 - (suma % 11)
            if dv_calculado == 11: return '0'
            if dv_calculado == 10: return 'K'
            return str(dv_calculado)
            
        rut_base = 22222222
        dv = calcular_dv(rut_base)
        rut = f"{rut_base}-{dv}"
        
        funcionario, _ = Funcionario.objects.get_or_create(rut=rut, defaults={
            'nombre_funcionario': 'Funcionario de Remuneraciones',
            'user': user,
            'departamento': depto_remuneraciones
        })
        if not funcionario.user:
            funcionario.user = user
            funcionario.departamento = depto_remuneraciones
            funcionario.save()
    
    print(f"Funcionario seleccionado: {funcionario.nombre_funcionario} ({funcionario.departamento.nombre})")
    
    categorias = list(TicketCategory.objects.all())
    # Destinos usuales para tickets (TI o SSGG)
    destinos = list(Departamento.objects.exclude(id=depto_remuneraciones.id))
    estados = ['ABIERTO', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTO', 'CERRADO']
    prioridades = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
    
    tickets_creados = 0
    if categorias and destinos:
        print("Generando 10 tickets...")
        for i in range(10):
            categoria = random.choice(categorias)
            estado = random.choice(estados)
            prioridad = random.choice(prioridades)
            area_destino = random.choice(destinos)
            
            dias_atras = random.randint(0, 30)
            fecha_creacion = timezone.now() - timedelta(days=dias_atras)

            ticket = Ticket.objects.create(
                creado_por=funcionario.user,
                categoria=categoria,
                area_destino=area_destino,
                titulo=f"Ticket desde Remuneraciones #{i+1} - {categoria.nombre}",
                descripcion=f"Solicito ayuda con {categoria.nombre.lower()}. Generado automáticamente desde Remuneraciones.",
                prioridad=prioridad,
                estado=estado
            )
            
            Ticket.objects.filter(id=ticket.id).update(fecha_creacion=fecha_creacion)
            tickets_creados += 1
            
        print(f"Se generaron {tickets_creados} tickets de remuneraciones.")
    else:
        print("Error: No hay categorias o departamentos destino suficientes.")

if __name__ == '__main__':
    run()
