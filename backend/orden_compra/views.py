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
from .models import OrdenCompraMP

# --- HELPERS REUTILIZADOS DE LICITACIONES (BASE COMÚN) ---

def find_items_recursive(obj):
    if not obj: return []
    if isinstance(obj, list): return obj
    if isinstance(obj, dict):
        if 'Listado' in obj and isinstance(obj['Listado'], list):
            return obj['Listado']
        for v in obj.values():
            res = find_items_recursive(v)
            if res: return res
    return []

def normalize_mp_oc(item, has_full_detail=False, fallback_date=None):
    """
    Normaliza una Orden de Compra de la API de Mercado Público.
    Soporta tanto la vista de lista como el detalle completo.
    """
    if not item: return {}
    
    comprador_raw = item.get('Comprador', {}) or {}
    prov_raw = item.get('Proveedor', {}) or {}
    fechas_raw = item.get('Fechas', {}) or {}
    
    items_listado = find_items_recursive(item.get('Items'))
    normalized_items = []
    for it in items_listado:
        normalized_items.append({
            'CodigoProducto': it.get('CodigoProducto') or it.get('Codigo', ''),
            'NombreProducto': it.get('Producto') or it.get('Nombre') or it.get('Descripcion') or 'S/N',
            'Descripcion': it.get('Especificacion') or it.get('Descripcion', ''),
            'Cantidad': it.get('Cantidad', 0),
            'UnidadMedida': it.get('UnidadMedida') or it.get('Unidad', ''),
            'PrecioNeto': it.get('PrecioNeto') or it.get('PrecioUnitario', 0),
            'Total': it.get('Total', 0),
            'Categoria': it.get('Categoria', '')
        })
    
    estado_map = {
        4: 'Enviada a Proveedor',
        6: 'Aceptada',
        9: 'Cancelada',
        10: 'Rechazada',
        12: 'Recepcion Conforme',
        14: 'Finalizada'
    }
    cod_est = item.get('CodigoEstado')
    estado_fallback = estado_map.get(cod_est, f'Estado {cod_est}') if cod_est else 'Desconocido'

    # Identificar Tipo de Compra basado en el Código de Licitación o Código de OC
    lic_code = item.get('CodigoLicitacion', '') or ''
    oc_code = item.get('Codigo', '') or item.get('CodigoExterno', '') or ''
    
    tipo_compra = "No especificado"
    if lic_code:
        if '-AG' in lic_code or '-AG' in oc_code: tipo_compra = "Compra Ágil"
        elif '-LP' in lic_code: tipo_compra = "Licitación Pública"
        elif '-LE' in lic_code: tipo_compra = "Licitación Especial"
        elif '-LS' in lic_code: tipo_compra = "Licitación Simplificada"
        elif '-CM' in lic_code: tipo_compra = "Convenio Marco"
        elif '-TD' in lic_code: tipo_compra = "Trato Directo"
        elif '-SE' in lic_code: tipo_compra = "Trato Directo (EMER)"
        elif '-LR' in lic_code: tipo_compra = "Licitación Pública (LR)"
        else: tipo_compra = "Licitación / Proceso MP"
    elif '-AG' in oc_code:
        tipo_compra = "Compra Ágil"
    elif '-TD' in oc_code:
        tipo_compra = "Trato Directo"

    return {
        'CodigoExterno': oc_code,
        'Nombre': item.get('Nombre', ''),
        'Descripcion': item.get('Descripcion', ''),
        'Estado': item.get('Estado') or item.get('EstadoNombre') or estado_fallback,
        'CodigoEstado': cod_est,
        'Tipo': item.get('Tipo') or item.get('TipoNombre', 'Orden de Compra'),
        'TipoCompraRepresentativo': tipo_compra,
        'CodigoLicitacion': lic_code,
        'Moneda': item.get('Moneda', 'CLP'),
        
        'Proveedor': {
            'Nombre': prov_raw.get('Nombre') or prov_raw.get('NombreProveedor') or item.get('NombreProveedor', ''),
            'RazonSocial': prov_raw.get('NombreSucursal') or prov_raw.get('RazonSocial', ''),
            'Rut': prov_raw.get('RutSucursal') or prov_raw.get('RutProveedor') or prov_raw.get('Rut') or item.get('RutProveedor', ''),
            'Codigo': prov_raw.get('CodigoProveedor') or prov_raw.get('Codigo', ''),
            'Contacto': prov_raw.get('NombreContacto', ''),
            'Mail': prov_raw.get('MailContacto', ''),
            'Fono': prov_raw.get('FonoContacto', ''),
            'Actividad': prov_raw.get('Actividad', ''),
            'Direccion': prov_raw.get('Direccion', ''),
            'Comuna': prov_raw.get('Comuna', ''),
        },
        
        'Comprador': {
            'NombreOrganismo': comprador_raw.get('NombreOrganismo') or comprador_raw.get('Nombre', ''),
            'NombreUnidad': comprador_raw.get('NombreUnidad', ''),
            'RutUnidad': comprador_raw.get('RutUnidad', ''),
        },
        
        'Fechas': {
            'FechaCreacion': fechas_raw.get('FechaCreacion') or item.get('FechaCreacion') or item.get('FechaEnvio') or fallback_date or '',
            'FechaAceptacion': fechas_raw.get('FechaAceptacion') or item.get('FechaAceptacion', ''),
            'FechaCancelacion': fechas_raw.get('FechaCancelacion') or item.get('FechaCancelacion', ''),
        },
        
        'Items': {
            'Cantidad': len(normalized_items),
            'Listado': normalized_items,
        },
        
        # Extras para el modal
        'Observacion': item.get('Observacion') or item.get('Descripcion', ''),
        'Financiamiento': item.get('Financiamiento', ''),
        'CondicionPago': item.get('CondicionPago', ''),
        
        '_source': 'MP_FULL' if has_full_detail else 'MP_BASIC',
        '_raw': item
    }

def mp_oc_request(params, user_ticket=None):
    """
    Helper específico para OC con rotación de tickets y manejo de Error 429.
    """
    tickets_pool = [user_ticket, "F23CBE04-6C9D-40C4-985C-7F5FCD6070B6", "F8537A18-6766-4DEF-9E59-426B4FEE2844"]
    tickets_pool = [t for t in tickets_pool if t and len(t) > 10]
    
    session = requests.Session()
    max_retries = 3 
    
    url = "https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json"
    
    for attempt in range(max_retries):
        try:
            active_ticket = tickets_pool[attempt % len(tickets_pool)]
            request_params = dict(params)
            request_params['ticket'] = active_ticket
            
            # Pequeño delay aleatorio para no saturar
            if attempt > 0:
                time.sleep(attempt * 2) 

            res = session.get(url, params=request_params, timeout=10, verify=False)
            
            if res.status_code == 200:
                js = res.json()
                # Si el JSON dice que el ticket no sirve, seguimos al siguiente
                if isinstance(js, str) and "Ticket" in js:
                    continue
                if 'Listado' in js: return js['Listado']
                if 'Codigo' in js: return [js]
                return []

            if res.status_code == 429:
                # Mercado Público nos está bloqueando por exceso de peticiones
                time.sleep(3 + attempt * 3) # Esperamos progresivamente
                continue
                
        except Exception:
            time.sleep(2)
            continue
            
    return []

# --- VISTAS ---

class VisorOCView(GenericAPIView):
    permission_classes = [AllowAny]
    
    def get(self, request, *args, **kwargs):
        try:
            fecha = request.query_params.get('fecha')
            codigo = request.query_params.get('codigo')
            ticket = request.query_params.get('ticket')
            codigo_organismo = request.query_params.get('CodigoOrganismo', '1820906')
            fecha_inicio = request.query_params.get('fecha_inicio')
            fecha_fin = request.query_params.get('fecha_fin')
            force = request.query_params.get('force', 'false').lower() == 'true'
            
            # --- CONSULTA LOCAL ---
            if not force and codigo_organismo == "1820906":
                if codigo:
                    local = OrdenCompraMP.objects.filter(codigo_externo=codigo).first()
                    if local: return Response([local.json_data])
                
                elif fecha_inicio and fecha_fin:
                    start_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                    end_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                    
                    # Para rangos, solo devolvemos local si tenemos una cantidad razonable de datos
                    # (si hay solo 1 o 2, probablemente la sincronizacion fue incompleta)
                    query = OrdenCompraMP.objects.filter(fecha_creacion__range=(start_dt, end_dt + timedelta(days=1)))
                    if query.count() > 10: 
                        return Response({
                            'resultados': [o.json_data for o in query],
                            'meta': {
                                'source': 'DATABASE', 
                                'total': query.count(),
                                'note': 'Datos locales. Use "Refrescar" para sincronización total.'
                            }
                        })

            # --- LÓGICA DE RANGO PARALELO ---
            if fecha_inicio and fecha_fin:
                start_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                end_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                delta = end_dt - start_dt
                target_dates = []
                for i in range(delta.days + 1):
                    target_dates.append((start_dt + timedelta(days=i)).strftime('%d%m%Y'))

                all_raw = []
                seen_ids = set()
                lock = threading.Lock()

                def fetch_day(d_str):
                    try:
                        return d_str, mp_oc_request({'fecha': d_str, 'CodigoOrganismo': codigo_organismo}, user_ticket=ticket)
                    except:
                        return d_str, []

                with ThreadPoolExecutor(max_workers=4) as executor:
                    futures = [executor.submit(fetch_day, d) for d in target_dates]
                    for f in as_completed(futures):
                        day_str, results = f.result()
                        with lock:
                            for r in results:
                                rid = r.get('Codigo') or r.get('CodigoExterno')
                                if rid and rid not in seen_ids:
                                    # Adjuntamos la fecha del escaneo como fallback
                                    r['_scan_date'] = datetime.strptime(day_str, '%d%m%Y').strftime('%Y-%m-%d')
                                    all_raw.append(r)
                                    seen_ids.add(rid)

                # PHASE 2: SMART DELTA FETCH
                # 1. Identify what we ALREADY have in DB
                all_codes = [r.get('Codigo') or r.get('CodigoExterno') for r in all_raw if (r.get('Codigo') or r.get('CodigoExterno'))]
                existing_ocs = {obj.codigo_externo: obj.json_data for obj in OrdenCompraMP.objects.filter(codigo_externo__in=all_codes)}
                
                final_results = []
                codes_to_fetch = []
                
                for raw in all_raw:
                    code = raw.get('Codigo') or raw.get('CodigoExterno')
                    if code in existing_ocs:
                        # Already have full detail in DB
                        final_results.append(existing_ocs[code])
                    else:
                        codes_to_fetch.append(raw)

                # 2. Fetch ONLY missing details from API (to avoid 429 and slowness)
                if codes_to_fetch:
                    # Limit to 40 to avoid hanging if range is too giant
                    to_fetch_now = codes_to_fetch[:40]
                    
                    def fetch_detail_sync(raw_item):
                        cid = raw_item.get('Codigo') or raw_item.get('CodigoExterno')
                        sdate = raw_item.get('_scan_date')
                        try:
                            # Detailed API Call
                            res = mp_oc_request({'codigo': cid}, user_ticket=ticket)
                            if res:
                                return normalize_mp_oc(res[0], True, fallback_date=sdate)
                        except: pass
                        return normalize_mp_oc(raw_item, False, fallback_date=sdate)

                    # Use 10 workers for high speed
                    with ThreadPoolExecutor(max_workers=10) as executor:
                        sync_futures = [executor.submit(fetch_detail_sync, it) for it in to_fetch_now]
                        for f in as_completed(sync_futures):
                            normed = f.result()
                            if normed: final_results.append(normed)
                    
                    # Add any overflow as basic (will be filled later)
                    if len(codes_to_fetch) > 40:
                        for it in codes_to_fetch[40:]:
                            final_results.append(normalize_mp_oc(it, False, fallback_date=it.get('_scan_date')))

                # 3. Background Persistence
                def persist_final_results_bg(data_list):
                    for norm in data_list:
                        try:
                            c = norm['CodigoExterno']
                            f_str = norm.get('Fechas', {}).get('FechaCreacion')
                            f_dt = None
                            if f_str:
                                try:
                                    clean = f_str.split('.')[0].replace('Z', '').replace(' ', 'T')
                                    f_dt = datetime.fromisoformat(clean) if 'T' in clean else None
                                except: pass
                            
                            if not f_dt and '-' in c:
                                try:
                                    yr = "".join(filter(str.isdigit, c.split('-')[-1]))
                                    if len(yr) == 2: f_dt = datetime(2000 + int(yr), 1, 1)
                                except: pass
                            
                            if f_dt and f_dt.tzinfo is None: f_dt = make_aware(f_dt)

                            OrdenCompraMP.objects.update_or_create(
                                codigo_externo=c,
                                defaults={
                                    'nombre': norm.get('Nombre', '')[:500],
                                    'monto_total': norm.get('MontoTotal'),
                                    'estado_nombre': norm.get('Estado', '')[:100],
                                    'fecha_creacion': f_dt,
                                    'json_data': norm
                                }
                            )
                        except: pass

                threading.Thread(target=persist_final_results_bg, args=(final_results,), daemon=True).start()

                # Sort results by date descending if possible
                try:
                    final_results.sort(key=lambda x: x.get('Fechas', {}).get('FechaCreacion', ''), reverse=True)
                except: pass

                return Response({
                    'resultados': final_results,
                    'meta': {
                        'source': 'API_ENRICHED',
                        'total': len(final_results),
                        'rango': f"{fecha_inicio} al {fecha_fin}"
                    }
                })

            # --- CONSULTA API SIMPLE (UN SOLO DÍA O CÓDIGO) ---
            params = {}
            if codigo: params['codigo'] = codigo
            else: 
                params['fecha'] = fecha or datetime.now().strftime('%d%m%Y')
                params['CodigoOrganismo'] = codigo_organismo
            
            raw_results = mp_oc_request(params, user_ticket=ticket)
            # Si buscamos por código, forzamos has_full_detail=True para que rellene todos los campos del modal
            final = [normalize_mp_oc(item, True if codigo else False) for item in raw_results]
            
            return Response(final)
            
        except Exception as e:
            print(traceback.format_exc())
            return Response({"error": str(e)}, status=503)
