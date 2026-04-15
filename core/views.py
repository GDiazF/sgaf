from rest_framework import viewsets, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.contrib.auth import update_session_auth_hash
from .models import LinkInteres
from .serializers import UserManagementSerializer, GroupSerializer, PermissionSerializer, AuditLogSerializer, LinkInteresSerializer
from auditlog.models import LogEntry
from .emails import enviar_correo_reset_password

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LogEntry.objects.all().select_related('actor', 'content_type')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['action', 'actor', 'content_type', 'object_pk']
    search_fields = ['object_repr', 'changes', 'remote_addr']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        avatar_url = None
        try:
            if hasattr(user, 'profile') and user.profile.avatar:
                from django.conf import settings
                media_url = settings.MEDIA_URL
                if not media_url.endswith('/'):
                    media_url += '/'
                avatar_url = f"{media_url}{user.profile.avatar.name}"
        except Exception:
            pass

        # Fetch linked funcionario data if available
        funcionario_data = None
        try:
            funcionario = user.funcionario_profile
            funcionario_data = {
                'rut': funcionario.rut,
                'nombre_funcionario': funcionario.nombre_funcionario,
                'cargo': funcionario.cargo,
                'unidad': funcionario.unidad.nombre if funcionario.unidad else None,
                'departamento': funcionario.departamento.nombre if funcionario.departamento else None,
            }
        except:
            pass

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_superuser': user.is_superuser,
            'avatar': avatar_url,
            'funcionario_data': funcionario_data,
            'groups': list(user.groups.values_list('name', flat=True)),
            'user_permissions': list(user.get_all_permissions())
        })

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().prefetch_related('groups', 'user_permissions')
    serializer_class = UserManagementSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.all().prefetch_related('permissions')
    serializer_class = GroupSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

class PermissionListView(generics.ListAPIView):
    queryset = Permission.objects.all().select_related('content_type')
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class AvatarUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        avatar = request.FILES.get('avatar')
        if not avatar:
            return Response({'error': 'No se proporcionó ninguna imagen.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not hasattr(user, 'profile'):
            from core.models import Profile
            Profile.objects.create(user=user)
            
        user.profile.avatar = avatar
        user.profile.save()
        
        from django.conf import settings
        media_url = settings.MEDIA_URL
        if not media_url.endswith('/'):
            media_url += '/'
        avatar_url = f"{media_url}{user.profile.avatar.name}"
        return Response({
            'message': 'Avatar actualizado correctamente.',
            'avatar': avatar_url
        })

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({'error': 'Ambas contraseñas son obligatorias.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(old_password):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)  # Keep the user logged in
        return Response({'message': 'Contraseña actualizada con éxito.'})

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({'error': 'El correo es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email=email).first()
        if user:
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            reset_url = f"{frontend_url}/reset-password/{uid}/{token}"
            nombre = f"{user.first_name} {user.last_name}" if user.first_name else user.username
            enviar_correo_reset_password(user.email, nombre, reset_url)

        return Response({'message': 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'})

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not all([uidb64, token, new_password]):
            return Response({'error': 'Datos incompletos.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None

        if user is not None and default_token_generator.check_token(user, token):
            user.set_password(new_password)
            user.save()
            return Response({'message': 'Contraseña actualizada correctamente.'})
        else:
            return Response({'error': 'El enlace es inválido o ha expirado.'}, status=status.HTTP_400_BAD_REQUEST)

class LinkInteresViewSet(viewsets.ModelViewSet):
    queryset = LinkInteres.objects.filter(activo=True)
    serializer_class = LinkInteresSerializer
    permission_classes = [permissions.DjangoModelPermissionsOrAnonReadOnly]

    def get_queryset(self):
        # Si el usuario es admin o tiene permiso de cambio, mostrar todos (incluyendo inactivos)
        if self.request.user.has_perm('core.change_linkinteres'):
            return LinkInteres.objects.all()
        return LinkInteres.objects.filter(activo=True)
