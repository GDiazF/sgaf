from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from .models import Ticket, TicketCategory, TicketMessage, TicketAttachment, TicketHistory, SupportAgent, TicketUserActivity
from .serializers import (
    TicketSerializer, TicketCategorySerializer, TicketMessageSerializer, 
    TicketAttachmentSerializer, TicketHistorySerializer, SupportAgentSerializer
)
from .utils import registrar_historial, notificar_nuevo_ticket, notificar_cambio_estado, notificar_nuevo_mensaje

class TicketCategoryViewSet(viewsets.ModelViewSet):
    queryset = TicketCategory.objects.filter(activo=True)
    serializer_class = TicketCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

from django_filters.rest_framework import DjangoFilterBackend

class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['estado', 'prioridad', 'categoria', 'area_destino']
    search_fields = ['correlativo', 'titulo', 'descripcion']
    ordering_fields = ['fecha_creacion', 'prioridad', 'estado']

    def get_queryset(self):
        user = self.request.user
        
        # Admins, Superusuarios y Agentes de Soporte ven todo el universo de tickets
        es_agente = SupportAgent.objects.filter(user=user, activo=True).exists()
        
        if user.is_superuser or user.is_staff or es_agente:
            return Ticket.objects.all()
        
        # Los demás solo ven lo que crearon o lo que tienen asignado
        return Ticket.objects.filter(
            Q(creado_por=user) | 
            Q(asignado_a=user)
        ).distinct()

    def perform_create(self, serializer):
        ticket = serializer.save(creado_por=self.request.user)
        notificar_nuevo_ticket(ticket)
        # Registrar creación en historial
        registrar_historial(ticket, self.request.user, 'Ticket', None, 'Creado')

    def perform_update(self, serializer):
        instance = self.get_object()
        old_estado = instance.estado
        old_prioridad = instance.prioridad
        old_asignado = instance.asignado_a
        
        ticket = serializer.save()
        
        # Tracking de cambios
        if old_estado != ticket.estado:
            registrar_historial(ticket, self.request.user, 'estado', old_estado, ticket.estado)
            notificar_cambio_estado(ticket, old_estado, ticket.estado, self.request.user)
            if ticket.estado in ['RESUELTO', 'CERRADO']:
                ticket.fecha_resolucion = timezone.now()
                ticket.save()
        
        if old_prioridad != ticket.prioridad:
            registrar_historial(ticket, self.request.user, 'prioridad', old_prioridad, ticket.prioridad)
            
        if old_asignado != ticket.asignado_a:
            val_ant = old_asignado.username if old_asignado else "Sin asignar"
            val_nue = ticket.asignado_a.username if ticket.asignado_a else "Sin asignar"
            registrar_historial(ticket, self.request.user, 'asignado_a', val_ant, val_nue)

    @action(detail=True, methods=['post'])
    def agregar_mensaje(self, request, pk=None):
        ticket = self.get_object()
        serializer = TicketMessageSerializer(data=request.data)
        if serializer.is_valid():
            mensaje = serializer.save(ticket=ticket, autor=request.user)
            notificar_nuevo_mensaje(mensaje)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def auto_asignar(self, request, pk=None):
        ticket = self.get_object()
        # Verificar si el usuario es agente de esa área
        es_agente = SupportAgent.objects.filter(user=request.user, area=ticket.area_destino, activo=True).exists()
        if not es_agente and not request.user.is_superuser:
            return Response({'error': 'No tienes permisos para asignarte este ticket'}, status=status.HTTP_403_FORBIDDEN)
            
        old_asignado = ticket.asignado_a
        ticket.asignado_a = request.user
        if ticket.estado == 'ABIERTO':
            ticket.estado = 'EN_PROGRESO'
        ticket.save()
        
        registrar_historial(ticket, request.user, 'asignado_a', old_asignado.username if old_asignado else "Sin asignar", request.user.username)
        
        return Response(TicketSerializer(ticket).data)

    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        queryset = self.get_queryset()
        total = queryset.count()
        abiertos = queryset.filter(estado='ABIERTO').count()
        en_progreso = queryset.filter(estado='EN_PROGRESO').count()
        resueltos = queryset.filter(estado='RESUELTO').count()
        cerrados = queryset.filter(estado='CERRADO').count()
        
        return Response({
            'total': total,
            'abiertos': abiertos,
            'en_progreso': en_progreso,
            'resueltos': resueltos,
            'cerrados': cerrados,
        })

    @action(detail=True, methods=['post'])
    def registrar_presencia(self, request, pk=None):
        ticket = self.get_object()
        TicketUserActivity.objects.update_or_create(
            user=request.user,
            ticket=ticket,
            defaults={'ultima_actividad': timezone.now()}
        )
        return Response({'status': 'ok'})

class SupportAgentViewSet(viewsets.ModelViewSet):
    queryset = SupportAgent.objects.all()
    serializer_class = SupportAgentSerializer
    permission_classes = [permissions.IsAdminUser] # Solo admins configuran agentes
