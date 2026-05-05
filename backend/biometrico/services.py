import re
import requests
from .models import BiometricoConfig

class BiometricoService:
    def __init__(self):
        config = BiometricoConfig.load()
        self.base_url = config.url.rstrip('/')
        self.username = config.username
        self.password = config.password
        self.session = requests.Session()

    def login(self):
        """Realiza el login transparente extrayendo el token CSRF y enviando credenciales."""
        login_url = f"{self.base_url}/login/"
        
        # 1. Obtener la página para extraer CSRF Token
        response = self.session.get(login_url)
        response.raise_for_status()
        
        # Buscar token CSRF en el HTML
        csrf_token = ''
        match = re.search(r'name="csrfmiddlewaretoken"\s+value="([^"]+)"', response.text)
        if match:
            csrf_token = match.group(1)
        else:
            csrf_token = self.session.cookies.get('csrftoken', '')
            
        if not csrf_token:
            raise Exception("No se pudo obtener csrfmiddlewaretoken del sistema biométrico.")

        # 2. Hacer POST con las credenciales
        login_data = {
            'username': self.username,
            'password': self.password,
            'csrfmiddlewaretoken': csrf_token,
            'next': '/'
        }
        
        headers = {
            'Referer': login_url
        }
        
        post_response = self.session.post(login_url, data=login_data, headers=headers)
        post_response.raise_for_status()
        
        # Validar si el login falló revisando la URL resultante o el contenido
        if post_response.url.endswith('/login/') and 'error' in post_response.text.lower():
            raise Exception("Credenciales incorrectas para el sistema biométrico.")
            
        return True

    def fetch_areas(self):
        """Obtiene la lista de áreas/terminales desde su propio endpoint."""
        page = 1
        limit = 200
        all_areas = {}
        
        while True:
            url = f"{self.base_url}/iclock/terminal/table/?page={page}&limit={limit}"
            response = self.session.get(url)
            if not response.ok:
                break
                
            try:
                data = response.json()
            except:
                break
                
            items = data.get('data', [])
            if not items:
                if isinstance(data, list):
                    items = data
                else:
                    items = data.get('results', [])
                    
            if not items:
                break
                
            for item in items:
                # Armamos un diccionario llave-valor si logramos adivinar el nombre
                # Usamos el alias o nombre, o directamente el objeto completo
                name = item.get('alias') or item.get('terminal_name') or item.get('sn') or f"Terminal {len(all_areas)}"
                all_areas[name] = item
                
            if len(items) < limit:
                break
                
            page += 1
            
        return all_areas

    def fetch_users_and_areas(self):
        """Navega los endpoints y recolecta usuarios y áreas."""
        self.login()
        
        # 1. Obtener Áreas (Terminales)
        areas_dict = self.fetch_areas()
        
        # 2. Sincronizar Establecimientos desde los Terminales (y no desde usuarios)
        establecimientos_list = self.sync_areas_from_terminals(areas_dict.values())
        
        # 3. Obtener Usuarios
        page = 1
        limit = 200
        all_users = []
        
        while True:
            url = f"{self.base_url}/personnel/employee/table/?page={page}&limit={limit}"
            response = self.session.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            items = data.get('data', [])
            if not items:
                if isinstance(data, list):
                    items = data
                else:
                    items = data.get('results', [])
                    
            if not items:
                break
                
            for item in items:
                all_users.append(item)
            
            if len(items) < limit:
                break
                
            page += 1
            
        # 4. Sincronizar Usuarios en la Base de Datos Local
        self.sync_usuarios(all_users)
            
        return {
            'base_url': self.base_url,
            'usuarios': all_users,
            'areas': areas_dict,
            'establecimientos': establecimientos_list
        }

    def sync_usuarios(self, all_users):
        from .models import BiometricoUsuario
        from django.db import transaction
        
        seen_codes = set()
        
        with transaction.atomic():
            for u in all_users:
                code = u.get('emp_code')
                if not code or not str(code).strip():
                    continue
                    
                code_str = str(code).strip()
                seen_codes.add(code_str)
                
                BiometricoUsuario.objects.update_or_create(
                    emp_code=code_str,
                    defaults={
                        'first_name': u.get('first_name', ''),
                        'last_name': u.get('last_name', ''),
                        'email': u.get('email', ''),
                        'employee_area': u.get('employee_area', ''),
                        'raw_data': u
                    }
                )
                
            # Eliminar usuarios que ya no existen en el sistema biométrico
            if seen_codes:
                BiometricoUsuario.objects.exclude(emp_code__in=seen_codes).delete()

    def create_usuario(self, data):
        """Crea un usuario directamente en la API del sistema biométrico remoto."""
        self.login()
        url = f"{self.base_url}/personnel/api/employees/"
        csrf_token = self.session.cookies.get('csrftoken')
        
        headers = {
            'X-CSRFToken': csrf_token,
            'Referer': f"{self.base_url}/",
            'Content-Type': 'application/json'
        }
        
        response = self.session.post(url, json=data, headers=headers)
        
        if not response.ok:
            try:
                error_msg = response.json()
            except:
                error_msg = response.text[:200] + "..." if len(response.text) > 200 else response.text
            
            raise Exception(f"Error {response.status_code} al crear usuario. Detalle: {error_msg}. Payload: {data}")
            
        return response.json()

    def update_usuario(self, emp_id, data):
        """Actualiza un usuario directamente en la API del sistema biométrico remoto."""
        self.login()
        url = f"{self.base_url}/personnel/api/employees/{emp_id}/"
        csrf_token = self.session.cookies.get('csrftoken')
        
        headers = {
            'X-CSRFToken': csrf_token,
            'Referer': f"{self.base_url}/",
            'Content-Type': 'application/json'
        }
        
        # En BioTime y similares, la API REST soporta PATCH para actualización parcial.
        response = self.session.patch(url, json=data, headers=headers)
        
        if not response.ok:
            # Si falla, tratar de leer el error
            try:
                error_msg = response.json()
            except:
                # Si es HTML largo (error 500), resumimos
                error_msg = response.text[:200] + "..." if len(response.text) > 200 else response.text
            
            raise Exception(f"Error {response.status_code} del servidor biométrico. Detalle: {error_msg}. Payload enviado: {data}")
            
        return response.json()

    def fetch_biometric_areas(self):
        """Obtiene la lista completa de áreas desde la API REST, manejando paginación."""
        all_results = []
        page = 1
        while True:
            url = f"{self.base_url}/personnel/api/areas/?page={page}&page_size=100"
            try:
                response = self.session.get(url)
                if not response.ok: break
                data = response.json()
                results = data.get('data', [])
                if not results: results = data.get('results', [])
                if not results and isinstance(data, list): results = data
                
                if not results: break
                all_results.extend(results)
                
                if len(results) < 100: break
                page += 1
            except:
                break
        return all_results

    def fetch_master_data(self, endpoint):
        """Obtiene datos maestros (departamentos, posiciones) de la API."""
        url = f"{self.base_url}/personnel/api/{endpoint}/?page_size=10"
        try:
            response = self.session.get(url)
            if response.ok:
                data = response.json()
                results = data.get('data', [])
                if not results: results = data.get('results', [])
                if not results and isinstance(data, list): results = data
                return results
        except:
            pass
        return []

    def sync_areas_from_terminals(self, terminals):
        from .models import BiometricoArea, BiometricoTerminal
        from django.db import transaction
        
        # 1. Encontrar áreas desde los Terminales
        unique_areas = {}
        seen_terminals = set()
        
        for t in terminals:
            code = t.get('area_code')
            name = t.get('area_name')
            real_id = None
            if not name and 'area' in t:
                if isinstance(t['area'], dict):
                    name = t['area'].get('area_name', t['area'].get('name', ''))
                    if not code: code = t['area'].get('area_code', t['area'].get('id', ''))
                    real_id = t['area'].get('id')
                elif isinstance(t['area'], str): name = t['area']
            if not code: code = t.get('area_id')
            if code and name and str(code).strip():
                unique_areas[str(code)] = (str(name), real_id)
            
            code_term = t.get('sn') or t.get('id') or t.get('terminal_code')
            if code_term: seen_terminals.add(str(code_term))
        
        # 2. Obtener Áreas de la API (para incluir áreas sin terminales como "Not Authorized")
        api_areas = self.fetch_biometric_areas()
        for a in api_areas:
            a_code = a.get('area_code') or a.get('id')
            a_name = a.get('area_name') or a.get('name')
            a_real_id = a.get('id')
            if a_code and a_name:
                unique_areas[str(a_code)] = (str(a_name), a_real_id)
        
        # 3. Forzar Not Authorized si aún no está (ID 1 suele ser el default en ZKTeco)
        if '1' not in unique_areas:
            unique_areas['1'] = ('Not Authorized', 1)
                
        # 4. Escribir a la base de datos
        with transaction.atomic():
            # Guardar Áreas
            for code, info in unique_areas.items():
                BiometricoArea.objects.update_or_create(
                    area_code=code,
                    defaults={
                        'area_name': info[0],
                        'internal_id': info[1]
                    }
                )
            if unique_areas:
                BiometricoArea.objects.exclude(area_code__in=unique_areas.keys()).delete()
                
            # Guardar Terminales
            for t in terminals:
                code_term = t.get('sn') or t.get('id') or t.get('terminal_code')
                name_term = t.get('alias') or t.get('terminal_name') or t.get('name')
                if code_term:
                    BiometricoTerminal.objects.update_or_create(
                        terminal_code=str(code_term),
                        defaults={
                            'terminal_name': str(name_term) if name_term else f"Terminal {code_term}",
                            'raw_data': t
                        }
                    )
            if seen_terminals:
                BiometricoTerminal.objects.exclude(terminal_code__in=seen_terminals).delete()
            
        return list(BiometricoArea.objects.all().values('area_code', 'area_name', 'last_sync'))
