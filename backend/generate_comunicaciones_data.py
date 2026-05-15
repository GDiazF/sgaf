import os
import django
import random
from datetime import timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from establecimientos.models import Establecimiento
from funcionarios.models import Funcionario, Unidad, Departamento, Subdireccion
from ejecutivos.models import AsignacionEjecutivo, GestionEstablecimiento, SubtareaGestion, HistorialGestion

User = get_user_model()

def generate_data():
    print("Limpiando datos de ejecutivos anteriores...")
    AsignacionEjecutivo.objects.all().delete()
    GestionEstablecimiento.objects.all().delete()

    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        print("No se encontró usuario administrador.")
        return

    # Asegurarnos de que el admin tenga un funcionario asociado para que pueda ver "Mis Establecimientos"
    admin_func = None
    if hasattr(admin_user, 'funcionario_profile'):
        admin_func = admin_user.funcionario_profile
    else:
        # Buscar o crear
        admin_func = Funcionario.objects.filter(rut='11111111-1').first()
        if not admin_func:
            admin_func = Funcionario.objects.create(
                user=admin_user,
                rut='11111111-1',
                nombre_funcionario='Administrador Sistema',
                cargo='Director General'
            )
        else:
            admin_func.user = admin_user
            admin_func.save()

    # Obtener una buena cantidad de funcionarios para ejecutivos
    funcionarios = list(Funcionario.objects.all().exclude(id=admin_func.id)[:10])
    funcionarios.append(admin_func) # Aseguramos que admin sea un ejecutivo

    establecimientos = list(Establecimiento.objects.all())
    unidades = list(Unidad.objects.all())
    
    if not establecimientos:
        print("No hay establecimientos. Por favor crear establecimientos primero.")
        return

    print(f"Asignando {len(establecimientos)} establecimientos a {len(funcionarios)} ejecutivos...")
    
    asignaciones = []
    # Repartimos los establecimientos entre los ejecutivos
    for i, est in enumerate(establecimientos):
        # Que el admin tenga al menos unos 5 establecimientos seguros para probar la vista "Mis Establecimientos"
        if i < 5:
            func = admin_func
        else:
            func = random.choice(funcionarios)
            
        asig = AsignacionEjecutivo.objects.create(
            funcionario=func,
            establecimiento=est,
            asignado_por=admin_user,
            vigente=True
        )
        asignaciones.append(asig)

    print("Simulando gestiones (tickets de acompañamiento) y seguimientos...")
    
    # Casos de uso reales
    casos = [
        {"req": "Problema con pago a docentes mes actual", "desc": "El director reporta que 3 profesores no han recibido sus remuneraciones íntegras.", "estado": "EN_PROCESO"},
        {"req": "Filtración de agua en pabellón central", "desc": "Se requiere visita técnica de operaciones urgente por inundación parcial.", "estado": "PENDIENTE"},
        {"req": "Dudas sobre proceso de matrícula", "desc": "Solicitan orientación sobre cómo registrar a alumnos extranjeros sin rut.", "estado": "RESPONDIDO"},
        {"req": "Solicitud de computadores para laboratorio", "desc": "Proyecto de renovación tecnológica. Faltan 15 equipos.", "estado": "EN_PROCESO"},
        {"req": "Licencia médica prolongada de auxiliar", "desc": "Necesitan reemplazo de auxiliar de aseo por 30 días.", "estado": "CERRADO"},
        {"req": "Corte de internet en área administrativa", "desc": "Soporte TI debe revisar los switches de la sala de profesores.", "estado": "PENDIENTE"},
        {"req": "Rendición de fondos SEP retrasada", "desc": "Finanzas requiere documentación adicional que el establecimiento no ha enviado.", "estado": "RESPONDIDO"}
    ]

    for asig in asignaciones:
        # Cada establecimiento tendrá entre 2 y 6 gestiones
        num_gestiones = random.randint(2, 6)
        
        for _ in range(num_gestiones):
            caso = random.choice(casos)
            unidad = random.choice(unidades) if unidades else None
            
            # Fechas retroactivas aleatorias
            fecha_creacion = timezone.now() - timedelta(days=random.randint(0, 30))
            
            gestion = GestionEstablecimiento.objects.create(
                establecimiento=asig.establecimiento,
                ejecutivo=asig.funcionario,
                creado_por=admin_user,
                requerimiento=caso["req"],
                descripcion=caso["desc"],
                unidad_requerida=unidad,
                estado=caso["estado"],
                respuesta="Se envió correo a la unidad correspondiente y se espera confirmación." if caso["estado"] in ['RESPONDIDO', 'CERRADO'] else ""
            )
            
            # Truco para sobreescribir auto_now_add
            GestionEstablecimiento.objects.filter(id=gestion.id).update(fecha_creacion=fecha_creacion)

            # Historial base
            HistorialGestion.objects.create(
                gestion=gestion,
                usuario=admin_user,
                accion="Creación de Gestión",
                detalles=f"Requerimiento levantado tras visita a terreno.",
            )

            # Si no está pendiente, simular algún movimiento
            if caso["estado"] != 'PENDIENTE':
                fecha_cambio = fecha_creacion + timedelta(days=random.randint(1, 3))
                HistorialGestion.objects.create(
                    gestion=gestion,
                    usuario=asig.funcionario.user if asig.funcionario.user else admin_user,
                    accion="Actualización de Estado",
                    detalles=f"El estado pasó a {caso['estado']}. Se derivó a {unidad.nombre if unidad else 'Soporte'}."
                )

                # Agregar subtareas
                subtarea1 = SubtareaGestion.objects.create(
                    gestion=gestion,
                    titulo="Llamar al director para confirmar recepción del caso",
                    completada=True,
                )
                subtarea2 = SubtareaGestion.objects.create(
                    gestion=gestion,
                    titulo="Solicitar informe a la unidad correspondiente",
                    completada=(caso["estado"] == 'CERRADO'),
                )

    print("¡Simulación completada con éxito! Revisa el Dashboard de Comunicaciones.")

if __name__ == '__main__':
    generate_data()
