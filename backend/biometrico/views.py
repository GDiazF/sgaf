from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import BiometricoService
from .models import BiometricoConfig
from .serializers import BiometricoConfigSerializer

def normalizePrivilege(priv):
    if priv is None: return '0'
    val = str(priv).lower().strip()
    if val in ['0', 'empleado']: return '0'
    if 'registrar' in val or val == '2': return '2'
    if 'administrado' in val or 'admin' in val or val == '6': return '6'
    if 'super' in val or val == '14': return '14'
    return '0'

class BiometricoSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            service = BiometricoService()
            data = service.fetch_users_and_areas()
            return Response({
                "status": "success",
                "message": "Datos obtenidos correctamente del sistema biométrico.",
                "data": data
            })
        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=500)

class BiometricoLocalDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import BiometricoUsuario, BiometricoArea, BiometricoTerminal, BiometricoConfig
        
        usuarios = [u.raw_data for u in BiometricoUsuario.objects.all()]
        establecimientos = list(BiometricoArea.objects.all().values('area_code', 'area_name', 'last_sync'))
        
        # Forzar Not Authorized en la lista si no está presente
        if not any(e['area_code'] == '1' or e['area_name'] == 'Not Authorized' for e in establecimientos):
            establecimientos.append({
                'area_code': '1',
                'area_name': 'Not Authorized',
                'last_sync': None
            })
        
        terminales = BiometricoTerminal.objects.all()
        areas_dict_local = {t.terminal_name: t.raw_data for t in terminales}
        
        config = BiometricoConfig.load()
        
        return Response({
            "status": "success",
            "data": {
                'base_url': config.url,
                'usuarios': usuarios,
                'areas': areas_dict_local,
                'establecimientos': establecimientos
            }
        })

class BiometricoUsuarioEditView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, emp_id):
        try:
            from .services import BiometricoService
            from .models import BiometricoUsuario
            
            service = BiometricoService()
            
            # Limpiar datos para la API remota (ZKTeco BioTime)
            # El servidor biométrico lanza error 500 si recibe campos desconocidos o de solo lectura
            zk_payload = request.data.copy()
            zk_payload.pop('employee_area', None)
            zk_payload.pop('emp_code', None) # El código no suele ser editable vía PATCH
            
            # Asegurar tipos de datos correctos
            if 'dev_privilege' in zk_payload:
                try:
                    priv_val = int(zk_payload['dev_privilege'])
                    zk_payload['dev_privilege'] = priv_val
                    # En BioTime, privilegios > 0 suelen requerir is_admin = 1 (entero, no bool)
                    zk_payload['is_admin'] = 1 if priv_val > 0 else 0
                except:
                    pass
            
            if 'area' in zk_payload and isinstance(zk_payload['area'], list):
                from .models import BiometricoArea
                actual_ids = []
                for a_code in zk_payload['area']:
                    area_obj = BiometricoArea.objects.filter(area_code=str(a_code)).first()
                    if area_obj and area_obj.internal_id is not None:
                        actual_ids.append(int(area_obj.internal_id))
                    else:
                        try: actual_ids.append(int(a_code))
                        except: pass
                zk_payload['area'] = actual_ids

            # Si el usuario tiene departamento en su data original, lo incluimos para evitar errores de validación
            # Buscamos por emp_code (RUT) ya que es nuestra Primary Key local
            orig_emp_code = request.data.get('emp_code')
            local_u = BiometricoUsuario.objects.filter(emp_code=orig_emp_code).first() if orig_emp_code else None
            
            if local_u and local_u.raw_data:
                orig = local_u.raw_data
                # BioTime suele usar 'dept' como ID (entero) del departamento
                if 'dept' in orig and 'dept' not in zk_payload:
                    try: zk_payload['dept'] = int(orig['dept'])
                    except: pass
                elif 'dept_code' in orig and 'dept' not in zk_payload:
                    try: zk_payload['dept'] = int(orig['dept_code'])
                    except: pass
            
            # Si no hay dept aún, intentamos poner el 1 por defecto (Department)
            if 'dept' not in zk_payload:
                zk_payload['dept'] = 1
            
            # Rescate de Position (Cargo) - Es obligatorio en este sistema y debe ser el ID (integer)
            if local_u and local_u.raw_data:
                orig = local_u.raw_data
                # Intentamos obtener el ID numérico
                p_code = orig.get('position_code')
                if p_code and str(p_code).isdigit():
                    zk_payload['position'] = int(p_code)
                else:
                    zk_payload['position'] = 1 # Por defecto 'Position' suele ser ID 1
            else:
                zk_payload['position'] = 1

            # --- ESTRATEGIA DE DELTA (Solo enviar lo que cambió) ---
            # Esto evita que BioTime rechace el paquete por campos que ya tiene pero que no le gusta recibir de vuelta
            if local_u and local_u.raw_data:
                orig = local_u.raw_data
                delta_payload = {}
                
                # Comparar privilegios
                curr_priv = normalizePrivilege(orig.get('dev_privilege'))
                if str(zk_payload.get('dev_privilege')) != curr_priv:
                    delta_payload['dev_privilege'] = zk_payload.get('dev_privilege')
                    delta_payload['is_admin'] = zk_payload.get('is_admin', 0)
                
                # Comparar nombres y email (solo si no son vacíos o si cambiaron)
                for f in ['first_name', 'last_name', 'email']:
                    new_val = zk_payload.get(f, '')
                    if new_val != orig.get(f, ''):
                        delta_payload[f] = new_val
                
                # Comparar áreas
                orig_areas = sorted([str(a).strip() for a in str(orig.get('employee_area_code', '')).split(',') if str(a).strip()])
                new_areas = sorted([str(a).strip() for a in zk_payload.get('area', [])])
                if orig_areas != new_areas:
                    delta_payload['area'] = zk_payload.get('area')
                
                # El departamento y cargo siempre los enviamos por seguridad si hay cambios
                if delta_payload:
                    delta_payload['dept'] = zk_payload.get('dept')
                    delta_payload['position'] = zk_payload.get('position')
                    zk_payload = delta_payload
                else:
                    # Si no hay cambios, no hacemos nada o enviamos el original
                    pass

            updated_data = service.update_usuario(emp_id, zk_payload)
            
            # Actualizar DB Local también
            emp_code = updated_data.get('emp_code') or request.data.get('emp_code')
            if emp_code:
                local_u = BiometricoUsuario.objects.filter(emp_code=emp_code).first()
                if local_u:
                    if 'first_name' in request.data: local_u.first_name = request.data['first_name']
                    if 'last_name' in request.data: local_u.last_name = request.data['last_name']
                    if 'email' in request.data: local_u.email = request.data['email']
                    if 'employee_area' in request.data: local_u.employee_area = request.data['employee_area']
                    # Actualizamos el raw data con lo nuevo
                    local_u.raw_data = updated_data
                    local_u.save()
            
            return Response({"status": "success", "data": updated_data})
            
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class BiometricoUsuarioCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            from .services import BiometricoService
            from .models import BiometricoUsuario
            
            service = BiometricoService()
            
            # Obtener departamentos y posiciones para tener IDs reales válidos
            depts = service.fetch_master_data('departments')
            pos = service.fetch_master_data('positions')
            
            # Usamos el ID del primer departamento/cargo encontrado, o los conocidos (128/173) como fallback
            default_dept = depts[0].get('id') if depts else 128
            default_pos = pos[0].get('id') if pos else 173

            # Payload base según lo requerido por BioTime
            zk_payload = {
                'emp_code': request.data.get('emp_code'),
                'first_name': request.data.get('first_name', ''),
                'last_name': request.data.get('last_name', ''),
                'email': request.data.get('email', ''),
                'dev_privilege': int(request.data.get('dev_privilege', 0)),
                'is_admin': 1 if int(request.data.get('dev_privilege', 0)) > 0 else 0,
                'department': default_dept,
                'position': default_pos,
                'verify_mode': 0,
                'enable_att': True,
                'enable_holiday': True,
                'app_status': 0,
                'app_role': 1,
                'app_punch_status': 1,
                'area': request.data.get('area', [])
            }

            # Asegurar que el área sea lista de enteros (IDs reales de BioTime)
            if isinstance(zk_payload['area'], list):
                from .models import BiometricoArea
                actual_ids = []
                for a_code in zk_payload['area']:
                    area_obj = BiometricoArea.objects.filter(area_code=str(a_code)).first()
                    # Usamos el internal_id si lo tenemos, si no, el código original como número
                    if area_obj and area_obj.internal_id is not None:
                        actual_ids.append(int(area_obj.internal_id))
                    else:
                        try: actual_ids.append(int(a_code))
                        except: pass
                zk_payload['area'] = actual_ids

            created_data = service.create_usuario(zk_payload)
            
            # Guardar en DB Local
            BiometricoUsuario.objects.update_or_create(
                emp_code=str(zk_payload['emp_code']),
                defaults={
                    'first_name': zk_payload['first_name'],
                    'last_name': zk_payload['last_name'],
                    'email': zk_payload['email'],
                    'employee_area': request.data.get('employee_area', ''),
                    'raw_data': created_data
                }
            )
            
            return Response({"status": "success", "data": created_data})
            
        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=500)

class BiometricoConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = BiometricoConfig.load()
        serializer = BiometricoConfigSerializer(config)
        return Response(serializer.data)

    def put(self, request):
        config = BiometricoConfig.load()
        serializer = BiometricoConfigSerializer(config, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
