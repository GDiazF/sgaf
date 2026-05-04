from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from usuarios_google.models import GoogleUser
from biometrico.models import BiometricoUsuario
from django.db.models import Q
from collections import Counter

def normalize_rut(rut):
    if not rut: return None
    clean = "".join(c for c in str(rut) if c.isalnum()).upper()
    return clean.lstrip('0')

def normalize_email(email):
    if not email: return None
    return str(email).strip().lower()

class ConciliacionDataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        all_google = GoogleUser.objects.all()
        alumnos_q = Q(org_unit_path__icontains='Alumno') | Q(org_unit_path__icontains='ALUMNO')
        google_alumnos = all_google.filter(alumnos_q)
        google_staff = all_google.exclude(alumnos_q)

        staff_map_rut = {}
        staff_map_email = {}
        for gu in google_staff:
            nrut = normalize_rut(gu.employee_id)
            nemail = normalize_email(gu.email)
            if nrut: staff_map_rut[nrut] = gu
            if nemail: staff_map_email[nemail] = gu

        alumnos_map_rut = set()
        alumnos_map_email = set()
        for ga in google_alumnos:
            nrut = normalize_rut(ga.employee_id)
            nemail = normalize_email(ga.email)
            if nrut: alumnos_map_rut.add(nrut)
            if nemail: alumnos_map_email.add(nemail)

        bio_users = BiometricoUsuario.objects.all()

        results = []
        processed_google_ids = set()

        # Listas para detectar duplicados
        all_emails = []
        all_names = []

        # 1. Procesar Biométrico
        for bu in bio_users:
            nrut = normalize_rut(bu.emp_code)
            nemail = normalize_email(bu.email)
            
            if (nrut and nrut in alumnos_map_rut) or (nemail and nemail in alumnos_map_email):
                continue

            match = None
            if nrut and nrut in staff_map_rut:
                match = staff_map_rut[nrut]
            elif nemail and nemail in staff_map_email:
                match = staff_map_email[nemail]

            name_bio = f"{bu.first_name} {bu.last_name}".strip()
            
            record = {
                'rut': nrut or bu.emp_code,
                'nombre_bio': name_bio,
                'email_bio': bu.email,
                'area_bio': bu.employee_area,
                'biometrico_id': bu.emp_code,
                'google_id': None,
                'nombre_google': None,
                'email_google': None,
                'status_google': None,
                'org_unit_google': None,
                'match_status': 'BIO_ONLY'
            }

            if match:
                record['google_id'] = match.id
                record['nombre_google'] = f"{match.first_name} {match.last_name}".strip()
                record['email_google'] = match.email
                record['status_google'] = match.status
                record['org_unit_google'] = match.org_unit_path
                record['match_status'] = 'MATCHED'
                processed_google_ids.add(match.id)
            
            # Recolectar para duplicados
            final_name = record['nombre_google'] or record['nombre_bio']
            final_email = record['email_google'] or record['email_bio']
            if final_name: all_names.append(final_name.upper())
            if final_email: all_emails.append(final_email.lower())
            
            results.append(record)

        # 2. Agregar Google Staff no vinculado
        for gu in google_staff:
            if gu.id not in processed_google_ids:
                name_google = f"{gu.first_name} {gu.last_name}".strip()
                results.append({
                    'rut': normalize_rut(gu.employee_id) or gu.employee_id,
                    'nombre_bio': None,
                    'email_bio': None,
                    'area_bio': None,
                    'biometrico_id': None,
                    'google_id': gu.id,
                    'nombre_google': name_google,
                    'email_google': gu.email,
                    'status_google': gu.status,
                    'org_unit_google': gu.org_unit_path,
                    'match_status': 'GOOGLE_ONLY'
                })
                if name_google: all_names.append(name_google.upper())
                if gu.email: all_emails.append(gu.email.lower())

        # 3. Identificar Duplicados
        email_counts = Counter(all_emails)
        name_counts = Counter(all_names)
        
        duplicate_emails = [email for email, count in email_counts.items() if count > 1 and email]
        duplicate_names = [name for name, count in name_counts.items() if count > 1 and name]

        # Marcar registros como duplicados
        for r in results:
            r['is_duplicate_email'] = (r['email_google'] or r['email_bio'] or '').lower() in duplicate_emails
            r['is_duplicate_name'] = (r['nombre_google'] or r['nombre_bio'] or '').upper() in duplicate_names

        return Response({
            "count": len(results),
            "stats": {
                "duplicate_emails_count": len(duplicate_emails),
                "duplicate_names_count": len(duplicate_names),
            },
            "results": results
        })
