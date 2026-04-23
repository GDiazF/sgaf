from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import GoogleUser, GoogleUploadLog, GoogleOrgUnit
from .serializers import GoogleUserSerializer, GoogleUploadLogSerializer, GoogleOrgUnitSerializer
import csv
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

class GoogleOrgUnitViewSet(viewsets.ModelViewSet):
    queryset = GoogleOrgUnit.objects.all().order_by('name')
    serializer_class = GoogleOrgUnitSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None # Desactivar paginación para obtener lista completa

class GoogleUserViewSet(viewsets.ModelViewSet):
    queryset = GoogleUser.objects.all().order_by('email')
    serializer_class = GoogleUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'org_unit_path': ['icontains', 'exact'],
        'status': ['exact'],
    }
    search_fields = ['email', 'first_name', 'last_name', 'employee_id']
    ordering_fields = ['email', 'first_name', 'last_name', 'last_sign_in']

    def get_queryset(self):
        queryset = super().get_queryset()
        exclude_alumnos = self.request.query_params.get('exclude_alumnos')
        if exclude_alumnos == 'true':
            queryset = queryset.exclude(org_unit_path__icontains='Alumnos')
            
        audit_filter = self.request.query_params.get('audit')
        if audit_filter == 'desuso':
            queryset = queryset.filter(Q(last_sign_in__isnull=True) | Q(last_sign_in=''))
        elif audit_filter == 'id_errors':
            queryset = queryset.filter(Q(employee_id__isnull=True) | Q(employee_id=''))
        elif audit_filter == 'duplicates':
            duplicate_ids = GoogleUser.objects.values('employee_id').annotate(count=Count('id')).filter(count__gt=1).exclude(employee_id__isnull=True).exclude(employee_id='').values('employee_id')
            queryset = queryset.filter(employee_id__in=duplicate_ids)

        return queryset

    @action(detail=False, methods=['get'])
    def summary_by_org(self, request):
        if GoogleOrgUnit.objects.count() == 0:
            initial_units = [
                "Administracion Central", "CENTRO DE CAPACITACION LABORAL",
                "COLEGIO DEPORTIVO TEC. PROF. ELENA DUVAUCHELLE A-11",
                "COLEGIO ESPANA E-79", "COLEGIO SIMON BOLIVAR",
                "ESC ALMIRANTE PATRICIO LYNCH D-90", "ESC ARTISTICA VIOLETA PARRA E-86",
                "ESC CALETA SAN MARCOS", "ESC CENTENARIO E-76", "ESC CHIPANA",
                "ESC EDUARDO LLANOS D-89", "ESC ESP FLOR DEL INCA F-81",
                "ESC GABRIELA MISTRAL D-72", "ESC LENGUAJE OASIS DEL SABER",
                "ESC PAULA JARAQUEMADA E-75", "ESC PLACIDO VILLARROEL D-92",
                "ESC PROFESOR MANUEL CASTRO RAMOS F-85", "ESC REPUB DE ITALIA F-88",
                "ESC REPUBLICA DE CROACIA E-70", "ESC THILDA PORTILLO E-78",
                "ESCUELA CALETA CHANAVAYITA", "Escuela Especial Oasis del Saber",
                "INS. COM. DE IQUIQUE BALDOMERO WOLNITZKI A-6",
                "LICEO BICENTENARIO DOMINGO STA. MARIA DE IQQ",
                "LICEO CEIA JOSE ALEJANDRO SORIA VARAS",
                "LICEO LIB. BERNADOR O`HIGGINS LA-7", "LICEO LUIS CRUZ MARTINEZ",
                "LICEO POLITEC. JOSE GUTIERREZ LA FUENTE LA-9", "LICEO TP DE ADULTOS",
            ]
            units_to_create = [GoogleOrgUnit(name=name) for name in initial_units]
            GoogleOrgUnit.objects.bulk_create(units_to_create)

        units = GoogleOrgUnit.objects.filter(is_active=True)
        summary = []
        for unit in units:
            qs = GoogleUser.objects.filter(org_unit_path__icontains=unit.name)
            total = qs.count()
            if total == 0: continue
            summary.append({
                'name': unit.name, 'total': total,
                'adm': qs.filter(org_unit_path__icontains='Administrativos').count(),
                'doc': qs.filter(org_unit_path__icontains='Docentes').count(),
                'asist': qs.filter(org_unit_path__icontains='Asistentes').count(),
                'alum': qs.filter(org_unit_path__icontains='Alumnos').count(),
            })
        return Response(sorted(summary, key=lambda x: x['total'], reverse=True))

    @action(detail=False, methods=['get'])
    def stats(self, request):
        total = GoogleUser.objects.count()
        duplicates = GoogleUser.objects.values('employee_id').annotate(count=Count('id')).filter(count__gt=1).exclude(employee_id__isnull=True).exclude(employee_id='')
        duplicate_count = sum(d['count'] for d in duplicates)
        inactivos = GoogleUser.objects.filter(Q(last_sign_in__isnull=True) | Q(last_sign_in='')).count()
        return Response({
            'administrativos': GoogleUser.objects.filter(org_unit_path__icontains='Administrativos').count(),
            'docentes': GoogleUser.objects.filter(org_unit_path__icontains='Docentes').count(),
            'asistentes': GoogleUser.objects.filter(org_unit_path__icontains='Asistentes').count(),
            'alumnos': GoogleUser.objects.filter(org_unit_path__icontains='Alumnos').count(),
            'desuso': inactivos, 'id_faltantes': GoogleUser.objects.filter(Q(employee_id__isnull=True) | Q(employee_id='')).count(),
            'id_duplicados': duplicate_count, 'total': total
        })

    @action(detail=False, methods=['post'])
    def upload_csv(self, request):
        file = request.FILES.get('file')
        if not file: return Response({'error': 'No se proporcionó archivo'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            try: decoded_file = file.read().decode('utf-8-sig').splitlines() # utf-8-sig maneja el BOM de Excel
            except UnicodeDecodeError:
                file.seek(0)
                decoded_file = file.read().decode('latin-1').splitlines()
            
            reader = csv.DictReader(decoded_file)
            
            # Mapeo flexible: intenta encontrar la columna aunque tenga espacios o cambios menores
            def get_col(row, possibilities):
                for p in possibilities:
                    if p in row: return row[p]
                return None

            new_users = []; emails_seen = set()
            for row in reader:
                # Buscamos el email con varias posibilidades comunes de Google
                email = get_col(row, ['Email Address [Required]', 'Email Address', 'email', 'Correo'])
                if not email or email in emails_seen: continue
                emails_seen.add(email)

                new_users.append(GoogleUser(
                    first_name=get_col(row, ['First Name [Required]', 'First Name', 'Nombre']),
                    last_name=get_col(row, ['Last Name [Required]', 'Last Name', 'Apellido']),
                    email=email,
                    org_unit_path=get_col(row, ['Org Unit Path [Required]', 'Org Unit Path', 'Unidad']),
                    status=get_col(row, ['Status [READ ONLY]', 'Status', 'Estado']),
                    last_sign_in=get_col(row, ['Last Sign In [READ ONLY]', 'Last Sign In', 'Último inicio']),
                    employee_id=get_col(row, ['Employee ID', 'ID', 'RUT']),
                    employee_title=get_col(row, ['Employee Title', 'Cargo']),
                    department=get_col(row, ['Department', 'Departamento']),
                    cost_center=get_col(row, ['Cost Center', 'Centro de costo'])
                ))

            with transaction.atomic():
                GoogleUser.objects.all().delete()
                GoogleUser.objects.bulk_create(new_users, batch_size=1000)
                GoogleUploadLog.objects.create(file_name=file.name, total_records=len(new_users))
            return Response({'message': 'Carga exitosa', 'total': len(new_users)})
        except Exception as e:
            return Response({'error': f"Error procesando CSV: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def last_upload(self, request):
        last = GoogleUploadLog.objects.order_by('-uploaded_at').first()
        return Response({'date': last.uploaded_at, 'file_name': last.file_name} if last else {'date': None})

class GoogleUploadLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GoogleUploadLog.objects.all().order_by('-uploaded_at')
    serializer_class = GoogleUploadLogSerializer
    permission_classes = [permissions.IsAuthenticated]
