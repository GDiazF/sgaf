from django.contrib.auth.models import User, Group, Permission
from rest_framework import serializers

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
    content_type_app_label = serializers.CharField(source='content_type.app_label', read_only=True)
    
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type', 'content_type_app_label']

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
    mfa_enabled = serializers.BooleanField(source='profile.mfa_enabled', read_only=True)
    mfa_enforced = serializers.BooleanField(source='profile.mfa_enforced', read_only=True)
    mfa_method = serializers.CharField(source='profile.mfa_method', read_only=True)
    funcionario_data = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'is_active', 'is_superuser', 'groups', 'user_permissions', 'rut', 'funcionario_data', 'mfa_enabled', 'mfa_enforced', 'mfa_method']
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


from .models import LinkInteres, EmailConfiguration

class LinkInteresSerializer(serializers.ModelSerializer):
    class Meta:
        model = LinkInteres
        fields = '__all__'

class EmailConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailConfiguration
        fields = '__all__'
        extra_kwargs = {
            'smtp_password': {'write_only': True}
        }

from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    remote_addr = serializers.CharField(source='ip_address', read_only=True)
    content_type_name = serializers.CharField(source='model_name', read_only=True)
    object_repr = serializers.CharField(source='details', read_only=True)
    action = serializers.SerializerMethodField()
    changes = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'timestamp', 'actor_name', 'remote_addr', 'content_type_name', 'object_repr', 'changes']

    def get_actor_name(self, obj):
        if obj.user:
            full_name = obj.user.get_full_name()
            return full_name if full_name else obj.user.username
        return 'Sistema'

    def get_action(self, obj):
        act = str(obj.action or '').upper()
        if 'CREACION' in act:
            return 0
        elif 'MODIFICACION' in act or 'ACCESO' in act:
            return 1
        elif 'ELIMINACION' in act:
            return 2
        return 3

    def get_changes(self, obj):
        return {}


from .models import BreachReport, CiberseguridadPlan, CiberseguridadCapacitacion

class BreachReportSerializer(serializers.ModelSerializer):
    registrado_por_nombre = serializers.ReadOnlyField(source='registrado_por.username')

    class Meta:
        model = BreachReport
        fields = [
            'id', 'titulo', 'descripcion', 'tipo_amenaza', 'gravedad_incidente',
            'fecha_incidente', 'fecha_descubrimiento', 'fecha_creacion',
            'estimacion_afectados', 'datos_comprometidos', 'medidas_mitigacion',
            'notificado_agencia', 'fecha_notificacion_agencia',
            'notificado_titulares', 'fecha_notificacion_titulares',
            'estado_csirt', 'fecha_alerta_temprana', 'fecha_actualizacion', 'fecha_informe_final',
            'registrado_por', 'registrado_por_nombre'
        ]
        read_only_fields = ['registrado_por', 'fecha_creacion']

class CiberseguridadPlanSerializer(serializers.ModelSerializer):
    documento_url = MediaRelativeFileField(source='documento', read_only=True)
    
    class Meta:
        model = CiberseguridadPlan
        fields = [
            'id', 'titulo', 'tipo', 'documento', 'documento_url',
            'fecha_aprobacion', 'fecha_proxima_revision', 'activo'
        ]

class CiberseguridadCapacitacionSerializer(serializers.ModelSerializer):
    documento_url = MediaRelativeFileField(source='documento', read_only=True)
    
    class Meta:
        model = CiberseguridadCapacitacion
        fields = [
            'id', 'nombre_campana', 'descripcion', 'documento', 'documento_url',
            'fecha_inicio', 'fecha_termino'
        ]

