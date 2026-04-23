import os
import hashlib
import requests
import json
import time
import threading
import calendar
import traceback
from datetime import datetime, timedelta
from django.utils.timezone import make_aware
from concurrent.futures import ThreadPoolExecutor, as_completed
from rest_framework.views import APIView
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import LicitacionMP

# --- HELPERS DE APOYO ---

def find_items_recursive(obj):
    """Busca la lista de items en estructuras MP que a veces vienen nidificadas."""
    if not obj: return []
    if isinstance(obj, list): return obj
    if isinstance(obj, dict):
        if 'Listado' in obj and isinstance(obj['Listado'], list):
            return obj['Listado']
        # Buscar en hijos
        for v in obj.values():
            res = find_items_recursive(v)
            if res: return res
    return []

def normalize_mp_document(item, has_full_detail=False):
    """
    Normaliza un item crudo (Licitación u OC) de la API de Mercado Público
    en una estructura consistente y predecible para el frontend.
    """
    if not item: return {}
    
    comprador_raw = item.get('Comprador', {}) or {}
    fechas_raw = item.get('Fechas', {}) or {}
    # Intentar sacar items de varias formas
    items_listado = find_items_recursive(item.get('Items'))
    
    normalized_items = []
    for it in items_listado:
        normalized_items.append({
            'CodigoProducto': it.get('CodigoProducto') or it.get('Codigo', ''),
            'NombreProducto': (
                it.get('NombreProducto') or 
                it.get('Nombre') or 
                it.get('Descripcion') or 
                it.get('EspecificacionComprador') or 
                'S/N'
            ),
            'Cantidad': it.get('Cantidad', 0),
            'UnidadMedida': it.get('UnidadMedida') or it.get('Unidad', ''),
            'Categoria': it.get('Categoria') or it.get('NombreCategoria', ''),
            'PrecioNeto': it.get('PrecioNeto') or it.get('PrecioUnitario', 0),
            'EspecificacionComprador': it.get('EspecificacionComprador', ''),
            'Descripcion': it.get('Descripcion', ''),
        })
    
    return {
        'CodigoExterno': item.get('CodigoExterno') or item.get('Codigo', ''),
        'Nombre': item.get('Nombre', ''),
        'Descripcion': item.get('Descripcion', ''),
        'Estado': item.get('Estado') or item.get('EstadoNombre', ''),
        'CodigoEstado': item.get('CodigoEstado', ''),
        'Tipo': item.get('Tipo') or item.get('TipoNombre', ''),
        
        'MontoEstimado': item.get('MontoEstimado') or item.get('MontoTotal', 0),
        'Moneda': item.get('Moneda', 'CLP'),
        'TipoPago': item.get('TipoPago', ''),
        
        'Comprador': {
            'NombreOrganismo': comprador_raw.get('NombreOrganismo') or comprador_raw.get('Nombre', ''),
            'NombreUnidad': comprador_raw.get('NombreUnidad', ''),
            'RutUnidad': comprador_raw.get('RutUnidad', ''),
            'DireccionUnidad': comprador_raw.get('DireccionUnidad', ''),
            'ComunaUnidad': comprador_raw.get('ComunaUnidad', ''),
            'RegionUnidad': comprador_raw.get('RegionUnidad', ''),
            'NombreUsuario': comprador_raw.get('NombreUsuario', ''),
            'CargoUsuario': comprador_raw.get('CargoUsuario', ''),
            'MailUsuario': comprador_raw.get('MailUsuario', ''),
            'FonoUsuario': comprador_raw.get('FonoUsuario', ''),
            'NombreContacto': comprador_raw.get('NombreContacto', ''),
            'CargoContacto': comprador_raw.get('CargoContacto', ''),
            'MailContacto': comprador_raw.get('MailContacto', ''),
            'FonoContacto': comprador_raw.get('FonoContacto', ''),
        },
        
        'Fechas': {
            'FechaCreacion': fechas_raw.get('FechaCreacion') or item.get('FechaCreacion') or item.get('_QueryDate') or item.get('_RootFechaCreacion', ''),
            'FechaPublicacion': fechas_raw.get('FechaPublicacion') or item.get('FechaEnvio') or item.get('FechaCreacion', ''),
            'FechaCierre': fechas_raw.get('FechaCierre') or item.get('FechaCierre', ''),
            'FechaAdjudicacion': fechas_raw.get('FechaAdjudicacion', ''),
            'FechaEstimadaAdjudicacion': fechas_raw.get('FechaEstimadaAdjudicacion', ''),
            'FechaInicio': fechas_raw.get('FechaInicio', ''),
            'FechaFinal': fechas_raw.get('FechaFinal', ''),
            'FechaPubRespuestas': fechas_raw.get('FechaPubRespuestas', ''),
            'FechaVisitaTerreno': fechas_raw.get('FechaVisitaTerreno', ''),
            'FechaEntregaAntecedentes': fechas_raw.get('FechaEntregaAntecedentes', ''),
            'FechaActoAperturaTecnica': fechas_raw.get('FechaActoAperturaTecnica', ''),
            'FechaActoAperturaEconomica': fechas_raw.get('FechaActoAperturaEconomica', ''),
        },
        
        'Responsables': {
            'ResponsablePago': item.get('NombreResponsablePago', ''),
            'ResponsableContrato': item.get('NombreResponsableContrato', ''),
            'EmailResponsableContrato': item.get('EmailResponsableContrato', ''),
        },
        
        'Items': {
            'Cantidad': len(normalized_items),
            'Listado': normalized_items,
        },
        
        '_has_full_detail': has_full_detail,
        '_source': 'MP_FULL' if has_full_detail else 'MP_BASIC',
        '_raw': item # Para depuración
    }

def mercado_publico_request(endpoint, params, user_ticket=None):
    """
    Helper universal para consultas a MP con rotación de tickets y reintentos.
    """
    raw_pool = [user_ticket, "F23CBE04-6C9D-40C4-985C-7F5FCD6070B6", "F8537A18-6766-4DEF-9E59-426B4FEE2844"]
    # Limpiar y mantener orden (prioridad)
    tickets_pool = []
    for t in raw_pool:
        if t and len(t) > 10 and t not in tickets_pool:
            tickets_pool.append(t)
    
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ]
    
    session = requests.Session()
    
    import random
    current_ticket_idx = random.randint(0, len(tickets_pool) - 1)
    max_retries = 3 
    
    # --- LOGICA DE CACHE PERSISTENTE ---
    cache_key = None
    cache_dir = os.path.join(os.path.dirname(__file__), '_mp_cache')
    if not os.path.exists(cache_dir): os.makedirs(cache_dir)

    fecha_query = params.get('fecha')
    codigo_query = params.get('codigo')
    org_query = params.get('CodigoOrganismo')
    
    if endpoint == 'licitaciones' and (fecha_query or codigo_query):
        key_raw = f"{endpoint}_{fecha_query}_{codigo_query}_{org_query}"
        cache_key = hashlib.md5(key_raw.encode()).hexdigest()
        cache_path = os.path.join(cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_path):
            try:
                mtime = os.path.getmtime(cache_path)
                last_mod = datetime.fromtimestamp(mtime)
                is_today = fecha_query == datetime.now().strftime('%d%m%Y')
                expiry = timedelta(minutes=30) if is_today else timedelta(hours=24)
                
                if datetime.now() - last_mod < expiry:
                    with open(cache_path, 'r', encoding='utf-8') as f:
                        return json.load(f)
            except: pass

    for attempt in range(max_retries):
        try:
            session.headers.update({
                'User-Agent': user_agents[attempt % len(user_agents)],
                'Accept': 'application/json'
            })
            active_ticket = tickets_pool[current_ticket_idx % len(tickets_pool)]
            
            request_params = dict(params)
            request_params['ticket'] = active_ticket
            
            url = f"https://api.mercadopublico.cl/servicios/v1/publico/{endpoint}.json"
            print(f"DEBUG API: {endpoint} | Ticket {active_ticket[:8]} | Attempt {attempt+1}")
            
            res = session.get(url, params=request_params, timeout=10, verify=False)
            
            if res.status_code == 500 or (res.status_code == 200 and '"Codigo":10500' in res.text):
                current_ticket_idx += 1
                time.sleep(1.5 * (attempt + 1))
                continue

            if res.status_code == 203 or (res.status_code == 200 and '"Codigo":203' in res.text):
                current_ticket_idx += 1
                continue

            if res.status_code in [200, 201]:
                try:
                    js = res.json()
                    res_final = []
                    
                    if isinstance(js, list):
                        res_final = js
                    elif isinstance(js, dict):
                        codigo_err = js.get('Codigo')
                        if codigo_err and codigo_err not in [200, 201]:
                            current_ticket_idx += 1
                            continue

                        if 'Listado' in js:
                            listado = js['Listado']
                            if listado is None: res_final = []
                            else:
                                root_creation = js.get('FechaCreacion')
                                query_date = params.get('fecha')
                                for item in listado:
                                    if not isinstance(item, dict): continue
                                    if 'FechaCreacion' not in item:
                                        if query_date:
                                            try:
                                                d, m, y = query_date[:2], query_date[2:4], query_date[4:]
                                                item['_QueryDate'] = f"{y}-{m}-{d}T00:00:00"
                                            except: pass
                                        if root_creation:
                                            item['_RootFechaCreacion'] = root_creation
                                res_final = listado
                        elif 'CodigoExterno' in js or 'Codigo' in js: res_final = [js]
                        elif 'LicitacionDetalle' in js: res_final = [js['LicitacionDetalle']]
                        elif js.get('Cantidad') == 0: res_final = []
                        else:
                            res_final = []

                    if cache_key and res_final:
                        try:
                            with open(cache_path, 'w', encoding='utf-8') as f:
                                json.dump(res_final, f, ensure_ascii=False)
                        except: pass
                    
                    return res_final

                except Exception as parse_err:
                    pass
            
            current_ticket_idx += 1
            time.sleep(1)
        except Exception as e:
            current_ticket_idx += 1
            time.sleep(1)
    
    raise Exception(f"La API de Mercado Público no respondió tras {max_retries} intentos.")

class ListarDocumentosMPView(GenericAPIView):
    """
    Acceso universal a cualquier documento de Mercado Público (OC, Licitación, etc)
    """
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        codigo = (request.query_params.get('codigo') or "").strip()
        ticket = request.query_params.get('ticket')
        
        if not codigo:
            return Response({"error": "Debe proporcionar un código de documento"}, status=status.HTTP_400_BAD_REQUEST)

        # Inteligencia de Enrutamiento
        codigo_upper = codigo.upper()
        if '-AG' in codigo_upper:
            target_endpoints = ['licitaciones', 'ordenescompra']
        elif '-CM' in codigo_upper:
            target_endpoints = ['conveniosmarco', 'ordenescompra']
        elif any(x in codigo_upper for x in ['-LP', '-LE', '-LS', '-E2', '-D1', '-TP', '-L1']):
            target_endpoints = ['licitaciones', 'ordenescompra']
        elif '-PC' in codigo_upper:
            target_endpoints = ['plancompra', 'licitaciones']
        else:
            target_endpoints = ['ordenescompra', 'licitaciones']
        
        all_items_raw = []
        found_ep = None
        
        for ep in target_endpoints:
            time.sleep(0.2)
            res_list = mercado_publico_request(ep, {'codigo': codigo}, user_ticket=ticket)
            if res_list:
                all_items_raw = res_list
                found_ep = ep
                break
        
        if not all_items_raw:
            return Response({"error": "No se encontró el documento en MP."}, status=status.HTTP_404_NOT_FOUND)

        item = all_items_raw[0]
        is_lic = found_ep in ['licitaciones', 'conveniosmarco', 'plancompra'] or 'CodigoExterno' in item
        
        # Normalización básica
        final = normalize_mp_document(item, has_full_detail=True)
        return Response([final])

class VisorLicitacionesView(GenericAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, *args, **kwargs):
        try:
            fecha = request.query_params.get('fecha')
            codigo = request.query_params.get('codigo')
            estado = request.query_params.get('estado', 'todos').lower()
            ticket = request.query_params.get('ticket')
            codigo_organismo = request.query_params.get('CodigoOrganismo', '1820906')
            mes = request.query_params.get('mes')
            anio = request.query_params.get('anio')
            force = request.query_params.get('force', 'false').lower() == 'true'
            fecha_inicio = request.query_params.get('fecha_inicio')
            fecha_fin = request.query_params.get('fecha_fin')

            # --- CONSULTA LOCAL ---
            if not force and codigo_organismo == "1820906":
                if codigo:
                    local = LicitacionMP.objects.filter(codigo_externo=codigo).first()
                    if local and local.is_enriquecida:
                        return Response([local.json_data])
                
                elif (fecha_inicio and fecha_fin) or (mes and anio):
                    query = LicitacionMP.objects.all()
                    if fecha_inicio and fecha_fin:
                        start_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                        end_dt = datetime.strptime(fecha_fin, '%Y-%m-%d') + timedelta(days=1)
                        query = query.filter(fecha_creacion__range=(start_dt, end_dt))
                    else:
                        query = query.filter(fecha_creacion__year=anio, fecha_creacion__month=mes)
                    
                    if query.exists():
                        results = [l.json_data for l in query]
                        return Response({
                            'resultados': results,
                            'meta': {
                                'source': 'DATABASE',
                                'total_final': len(results),
                                'msg': 'Resultados recuperados de la base de datos local.'
                            }
                        })
                
                elif fecha:
                    try:
                        d, m, y = fecha[:2], fecha[2:4], fecha[4:]
                        dt_start = datetime.strptime(f"{y}-{m}-{d}", '%Y-%m-%d')
                        dt_end = dt_start + timedelta(days=1)
                        query = LicitacionMP.objects.filter(fecha_creacion__range=(dt_start, dt_end))
                        if query.exists():
                            return Response([l.json_data for l in query])
                    except: pass

            # --- LOGICA API ---
            if (fecha_inicio and fecha_fin) or (mes and anio):
                target_dates = []
                if fecha_inicio and fecha_fin:
                    start_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                    end_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                    delta = end_dt - start_dt
                    for i in range(delta.days + 1):
                        target_dates.append((start_dt + timedelta(days=i)).strftime('%d%m%Y'))
                else:
                    days_in_month = calendar.monthrange(int(anio), int(mes))[1]
                    limit_day = days_in_month
                    if int(anio) == datetime.now().year and int(mes) == datetime.now().month:
                        limit_day = datetime.now().day
                    for d in range(1, limit_day + 1):
                        target_dates.append(f"{str(d).zfill(2)}{str(mes).zfill(2)}{anio}")

                all_basic_results = []
                seen_ids = set()
                failed_dates = []
                lock = threading.Lock()
                
                def fetch_by_date(date_str):
                    try:
                        res = mercado_publico_request('licitaciones', {
                            'fecha': date_str,
                            'CodigoOrganismo': codigo_organismo
                        }, user_ticket=ticket)
                        return (date_str, res, None)
                    except Exception as e:
                        return (date_str, [], str(e))
                
                with ThreadPoolExecutor(max_workers=3) as executor:
                    futures_map = {executor.submit(fetch_by_date, d): d for d in target_dates}
                    for f in as_completed(futures_map):
                        d_str, day_results, err = f.result()
                        if err: failed_dates.append(d_str)
                        else:
                            with lock:
                                for r in day_results:
                                    rid = r.get('CodigoExterno')
                                    if rid and rid not in seen_ids:
                                        all_basic_results.append(r)
                                        seen_ids.add(rid)
                        time.sleep(0.3)

                if failed_dates:
                    retry_failed = sorted(failed_dates)
                    failed_dates = [] 
                    for d_str in retry_failed:
                        time.sleep(2)
                        _, day_results, err = fetch_by_date(d_str)
                        if err: failed_dates.append(d_str)
                        else:
                            with lock:
                                for r in day_results:
                                    rid = r.get('CodigoExterno')
                                    if rid and rid not in seen_ids:
                                        all_basic_results.append(r)
                                        seen_ids.add(rid)
                
                final = [normalize_mp_document(item, False) for item in all_basic_results]
                
                # PERSISTENCIA EN SEGUNDO PLANO
                def persist_results(results_raw):
                    for item in results_raw:
                        try:
                            codigo = item.get('CodigoExterno')
                            if not codigo: continue
                            norm = normalize_mp_document(item, False)
                            f_creacion_str = norm['Fechas']['FechaCreacion']
                            f_creacion = None
                            if f_creacion_str:
                                try:
                                    clean_iso = f_creacion_str.replace('Z', '').replace(' ', 'T')
                                    if 'T' not in clean_iso: clean_iso += 'T00:00:00'
                                    f_creacion = datetime.fromisoformat(clean_iso)
                                    if f_creacion.tzinfo is None: f_creacion = make_aware(f_creacion)
                                except: pass

                            LicitacionMP.objects.update_or_create(
                                codigo_externo=codigo,
                                defaults={
                                    'nombre': item.get('Nombre', '')[:500],
                                    'estado_nombre': item.get('EstadoNombre', '') or item.get('Estado', '')[:100],
                                    'codigo_estado': item.get('CodigoEstado'),
                                    'fecha_creacion': f_creacion,
                                    'json_data': norm
                                }
                            )
                        except: pass
                threading.Thread(target=persist_results, args=(all_basic_results,), daemon=True).start()

                return Response({
                    'resultados': final,
                    'meta': {
                        'dias_ok': len(target_dates) - len(failed_dates),
                        'dias_fallidos': len(failed_dates),
                        'total_bruto': len(all_basic_results),
                        'total_final': len(final),
                        'rango': f"{target_dates[0]} - {target_dates[-1]}",
                        'api_saturada': len(failed_dates) > (len(target_dates) / 2)
                    }
                })

            params = {}
            if codigo: params['codigo'] = codigo
            else: 
                params['fecha'] = fecha or datetime.now().strftime('%d%m%Y')
                params['CodigoOrganismo'] = codigo_organismo
            
            basic = mercado_publico_request('licitaciones', params, user_ticket=ticket)
            is_full = True if codigo else False
            final = [normalize_mp_document(item, is_full) for item in basic]
            return Response(final)
            
        except Exception as e:
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=503)
