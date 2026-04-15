from django.contrib.auth.models import User, Group, Permission
from rest_framework import serializers
from auditlog.models import LogEntry
from .models import LinkInteres

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True, default='Sistema')
    content_type_name = serializers.CharField(source='content_type.model', read_only=True)
    
    class Meta:
        model = LogEntry
        fields = [
            'id', 'object_pk', 'object_id', 'object_repr', 'action', 
            'changes', 'timestamp', 'actor', 'actor_name', 
            'content_type', 'content_type_name', 'remote_addr'
        ]

class MediaRelativeFileField(serializers.FileField):
    """Garantiza que la URL siempre sea relativa al dominio (comience con /media/)"""
    def to_representation(self, value):
        if not value:
            return None
        url = value.url
        import re
        # Remover el esquema y el host si existen (ej. http://localhost:8000/media/...)
        return re.sub(r'^https?://[^/]+', '', url)

class MediaRelativeImageField(serializers.ImageField):
    """Garantiza que la URL de imagen siempre sea relativa al dominio"""
    def to_representation(self, value):
        if not value:
            return None
        url = value.url
        import re
        return re.sub(r'^https?://[^/]+', '', url)

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

class GroupSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), required=False
    )
    
    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions']

class UserManagementSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(
        many=True, slug_field='name', queryset=Group.objects.all(), required=False
    )
    user_permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all(), required=False
    )
    rut = serializers.CharField(write_only=True, required=False, allow_blank=True)
    funcionario_data = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_active', 'is_superuser', 'groups', 'user_permissions', 'rut', 'funcionario_data']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def get_funcionario_data(self, obj):
        try:
            from funcionarios.models import Funcionario
            funcionario = obj.funcionario_profile
            return {
                'rut': funcionario.rut,
                'nombre_funcionario': funcionario.nombre_funcionario,
                'cargo': funcionario.cargo
            }
        except:
            return None

    def _handle_rut_link(self, user, rut):
        if not rut:
            return
        
        try:
            from funcionarios.models import Funcionario
            # Normalize RUT for search: remove dots, keep hyphen
            clean_rut = rut.replace('.', '').upper()
            funcionario = Funcionario.objects.filter(rut=clean_rut).first()
            if funcionario:
                funcionario.user = user
                funcionario.save()
        except Exception as e:
            print(f"Error linking user to funcionario: {e}")

    def create(self, validated_data):
        groups_data = validated_data.pop('groups', [])
        permissions_data = validated_data.pop('user_permissions', [])
        password = validated_data.pop('password', None)
        rut = validated_data.pop('rut', None)
        
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
            
        if groups_data:
            user.groups.set(groups_data)
        if permissions_data:
            user.user_permissions.set(permissions_data)
            
        self._handle_rut_link(user, rut)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        rut = validated_data.pop('rut', None)
        
        if password:
            instance.set_password(password)
        
        user = super().update(instance, validated_data)
        if rut:
            self._handle_rut_link(user, rut)
        return user

class LinkInteresSerializer(serializers.ModelSerializer):
    class Meta:
        model = LinkInteres
        fields = '__all__'
