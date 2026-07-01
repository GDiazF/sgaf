from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Ticket, TicketCategory, TicketMessage, TicketAttachment, TicketHistory, SupportAgent
from funcionarios.models import Departamento
from funcionarios.serializers import DepartamentoSerializer

class UserMinimalSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()
    rut = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'nombre_completo', 'rut']
        
    def get_nombre_completo(self, obj):
        if hasattr(obj, 'funcionario_profile'):
            return obj.funcionario_profile.nombre_funcionario
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_rut(self, obj):
        if hasattr(obj, 'funcionario_profile'):
            return obj.funcionario_profile.rut
        return None

class TicketCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketCategory
        fields = '__all__'

class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = '__all__'

class TicketMessageSerializer(serializers.ModelSerializer):
    autor_obj = UserMinimalSerializer(source='autor', read_only=True)
    
    class Meta:
        model = TicketMessage
        fields = ['id', 'ticket', 'autor', 'autor_obj', 'mensaje', 'fecha', 'es_sistema']
        read_only_fields = ['ticket', 'autor', 'fecha', 'es_sistema']

class TicketHistorySerializer(serializers.ModelSerializer):
    usuario_obj = UserMinimalSerializer(source='usuario', read_only=True)
    
    class Meta:
        model = TicketHistory
        fields = '__all__'

class TicketSerializer(serializers.ModelSerializer):
    creado_por_obj = UserMinimalSerializer(source='creado_por', read_only=True)
    asignado_a_obj = UserMinimalSerializer(source='asignado_a', read_only=True)
    categoria_obj = TicketCategorySerializer(source='categoria', read_only=True)
    area_destino_obj = DepartamentoSerializer(source='area_destino', read_only=True)
    adjuntos = TicketAttachmentSerializer(many=True, read_only=True)
    mensajes = TicketMessageSerializer(many=True, read_only=True)
    historial = TicketHistorySerializer(many=True, read_only=True)
    
    # Campo dinámico para saber los permisos del usuario actual sobre este ticket
    user_role = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['correlativo', 'creado_por', 'fecha_creacion', 'fecha_actualizacion', 'fecha_resolucion']

    def get_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user:
            return None
        
        user = request.user
        # En el modelo centralizado, cualquier agente activo puede gestionar cualquier ticket
        is_support_agent = SupportAgent.objects.filter(user=user, activo=True).exists()
        
        role = {
            'is_requester': obj.creado_por == user,
            'is_assigned': obj.asignado_a == user,
            'is_agent': is_support_agent,
            'is_admin': user.is_superuser or user.is_staff
        }
        return role

class SupportAgentSerializer(serializers.ModelSerializer):
    user_obj = UserMinimalSerializer(source='user', read_only=True)
    area_obj = DepartamentoSerializer(source='area', read_only=True)
    
    class Meta:
        model = SupportAgent
        fields = '__all__'
