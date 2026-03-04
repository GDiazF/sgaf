from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q

from establecimientos.models import Establecimiento
from .models import PersonalTI
from .serializers import PersonalTISerializer, CoberturaEstablecimientoSerializer


class PersonalTIViewSet(viewsets.ModelViewSet):
    queryset = PersonalTI.objects.select_related('establecimiento').all()
    serializer_class = PersonalTISerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['establecimiento', 'funcion', 'tipo_contrato', 'activo']
    search_fields = ['nombre_completo', 'rut', 'establecimiento__nombre']
    ordering_fields = ['nombre_completo', 'establecimiento__nombre', 'funcion']
    ordering = ['establecimiento__nombre', 'funcion']

    @action(detail=False, methods=['get'], url_path='cobertura')
    def cobertura(self, request):
        """
        Retorna TODOS los establecimientos activos con anotaciones de
        cuánto personal TI tienen asignado (incluyendo los que tienen 0).
        """
        establecimientos = (
            Establecimiento.objects
            .filter(activo=True)
            .annotate(
                total_personal=Count('personal_ti', filter=Q(personal_ti__activo=True)),
                coordinadores=Count(
                    'personal_ti',
                    filter=Q(personal_ti__activo=True, personal_ti__funcion='COORDINADOR_ENLACES')
                ),
                tecnicos=Count(
                    'personal_ti',
                    filter=Q(
                        personal_ti__activo=True,
                        personal_ti__funcion__in=['TECNICO_ENLACES', 'TECNICO_A_ENLACES', 'ENCARGADO_ENLACE']
                    )
                ),
            )
            .order_by('nombre')
        )

        # Anotación manual de tiene_personal
        data = []
        for e in establecimientos:
            data.append({
                'id': e.id,
                'rbd': e.rbd,
                'nombre': e.nombre,
                'activo': e.activo,
                'total_personal': e.total_personal,
                'coordinadores': e.coordinadores,
                'tecnicos': e.tecnicos,
                'tiene_personal': e.total_personal > 0,
            })

        return Response(data)
