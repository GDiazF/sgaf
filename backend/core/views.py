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
from .serializers import (
    UserManagementSerializer, GroupSerializer, PermissionSerializer, 
    LinkInteresSerializer, EmailConfigurationSerializer
)
from .models import LinkInteres, Profile, TrustedDevice, EmailOTP, MFASession, EmailConfiguration
from .emails import enviar_correo_reset_password
from .utils.mfa_logic import send_otp_email, verify_email_otp, verify_totp_code
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework_simplejwt.tokens import RefreshToken
import uuid
from django.shortcuts import get_object_or_404

def get_full_user_data(user):
    """Auxiliar para devolver el objeto de usuario completo incluyendo avatar y funcionario_data"""
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
    except Exception:
        pass

    return {
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
    }

class LinkInteresViewSet(viewsets.ModelViewSet):
    queryset = LinkInteres.objects.all()
    serializer_class = LinkInteresSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_full_user_data(request.user))

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().prefetch_related('groups', 'user_permissions')
    serializer_class = UserManagementSerializer
    permission_classes = [permissions.DjangoModelPermissions]
    pagination_class = None

    from rest_framework.decorators import action
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reset_mfa(self, request, pk=None):
        user = self.get_object()
        user.profile.mfa_enabled = False
        user.profile.save()
        from django_otp.plugins.otp_totp.models import TOTPDevice
        TOTPDevice.objects.filter(user=user).delete()
        TrustedDevice.objects.filter(user=user).delete()
        return Response({'message': f'MFA de {user.username} reseteado con éxito.'})

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

# MFA LOGIN VIEWS
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import authenticate

class MFATokenObtainPairView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        device_token = request.COOKIES.get('device_trust_token')

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)

        profile = user.profile
        
        is_trusted = False
        if device_token:
            is_trusted = TrustedDevice.objects.filter(user=user, device_token=device_token).exists()

        # Lógica de obligatoriedad
        security_config = SecurityConfig.get_config()
        mfa_required_globally = security_config.force_mfa_all
        mfa_enforced_for_user = profile.mfa_enforced
        
        # Debe usar MFA si: Está activado por el usuario, está forzado globalmente, o está forzado específicamente
        should_use_mfa = profile.mfa_enabled or mfa_required_globally or mfa_enforced_for_user

        if should_use_mfa and not is_trusted:
            # Determinar método: Si no tiene uno habilitado pero se le exige, usamos EMAIL como default
            current_method = profile.mfa_method
            if not profile.mfa_enabled:
                current_method = 'EMAIL' # Fallback forzado a email

            # Métodos disponibles: Siempre incluimos EMAIL si es obligatorio. 
            # TOTP solo si el usuario ya lo configuró (mfa_enabled)
            available_methods = ['EMAIL']
            if profile.mfa_enabled:
                available_methods.append('TOTP')
            
            # El método por defecto es el preferido del usuario, o EMAIL si no tiene uno activo
            default_method = profile.mfa_method if profile.mfa_enabled else 'EMAIL'
            
            # Limpiar sesiones MFA previas del usuario para evitar conflictos
            MFASession.objects.filter(user=user).delete()
            
            mfa_token = uuid.uuid4()
            from django.utils import timezone
            import datetime
            MFASession.objects.create(
                user=user,
                token=mfa_token,
                method=default_method,
                expires_at=timezone.now() + datetime.timedelta(minutes=30)
            )
            mfa_token_str = str(mfa_token)

            mask = user.email[:1] + "***" + user.email[user.email.find("@"):]
            
            if default_method == 'EMAIL':
                from .utils.mfa_logic import send_otp_email
                send_otp_email(user)

            return Response({
                'mfa_required': True,
                'mfa_token': mfa_token_str,
                'mfa_method': default_method,
                'available_methods': available_methods,
                'email_mask': mask
            })

        # Si no requiere MFA o es de confianza, entregar tokens normales
        refresh = RefreshToken.for_user(user)
        user_data = get_full_user_data(user)

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user_data
        })

class MFAVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        mfa_token = request.data.get('mfa_token')
        code = request.data.get('code')
        remember_device = request.data.get('remember_device', False)

        # Validar sesión MFA en base de datos
        mfa_session = MFASession.objects.filter(token=mfa_token).first()
        
        if not mfa_session or not mfa_session.is_valid():
            return Response({'error': 'Sesión de verificación expirada o inválida'}, status=status.HTTP_400_BAD_REQUEST)

        user = mfa_session.user
        profile = user.profile
        
        # El usuario puede especificar el método en el momento de la verificación
        # (para permitir alternar entre app y email)
        method_to_use = request.data.get('use_method', mfa_session.method)
        
        verified = False
        if method_to_use == 'EMAIL':
            from .utils.mfa_logic import verify_email_otp
            verified = verify_email_otp(user, code)
        else:
            from .utils.mfa_logic import verify_totp_code
            verified = verify_totp_code(user, code)

        if not verified:
            return Response({'error': 'Código de verificación incorrecto'}, status=status.HTTP_400_BAD_REQUEST)

        # Determinar si requiere configuración obligatoria de TOTP (App) antes de entrar
        security_config = SecurityConfig.get_config()
        mfa_required_globally = security_config.force_mfa_all
        mfa_setup_required = (mfa_required_globally or profile.mfa_enforced) and not profile.mfa_enabled

        # SI ES EMAIL Y REQUIRE SETUP -> NO ENTREGAMOS TOKENS TODAVÍA
        if method_to_use == 'EMAIL' and mfa_setup_required:
            return Response({
                'mfa_setup_required': True,
                'mfa_token': str(mfa_token),
                'message': 'Código correcto. Ahora debes configurar tu App de Autenticación.'
            })

        # Éxito (o ya tiene setup)
        mfa_session.delete()
        refresh = RefreshToken.for_user(user)
        user_data = get_full_user_data(user)
        
        # Determinar si requiere configuración de MFA (si es obligatorio pero no ha activado TOTP)
        security_config = SecurityConfig.get_config()
        mfa_required_globally = security_config.force_mfa_all
        mfa_setup_required = (mfa_required_globally or profile.mfa_enforced) and not profile.mfa_enabled
        
        response = Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': user_data,
            'mfa_setup_required': mfa_setup_required
        })

        if remember_device:
            new_device_token = str(uuid.uuid4())
            TrustedDevice.objects.create(user=user, device_token=new_device_token, name=f"Dispositivo {request.META.get('HTTP_USER_AGENT', 'Desconocido')[:50]}")
            # Guardamos el token en una cookie por 30 días
            response.set_cookie(
                'device_trust_token', 
                new_device_token, 
                max_age=30*24*60*60, 
                httponly=True, 
                samesite='Lax',
                path='/'
            )

        return response

class MFASetupView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        user = None
        if request.user.is_authenticated:
            user = request.user
        else:
            mfa_token = request.query_params.get('mfa_token')
            if mfa_token:
                mfa_session = MFASession.objects.filter(token=mfa_token).first()
                if mfa_session and mfa_session.is_valid():
                    user = mfa_session.user
        
        if not user:
            return Response({'error': 'No autorizado o sesión expirada'}, status=status.HTTP_401_UNAUTHORIZED)
            
        profile = user.profile
        # Obtener o crear dispositivo TOTP para configuración
        device = TOTPDevice.objects.filter(user=user, confirmed=False).first()
        if not device:
            # Borrar otros no confirmados si existen
            TOTPDevice.objects.filter(user=user, confirmed=False).delete()
            device = TOTPDevice.objects.create(user=user, confirmed=False, name="Default")
        
        return Response({
            'otpauth_url': device.config_url,
            'secret_key': str(device.key),
            'mfa_enabled': profile.mfa_enabled,
            'mfa_method': profile.mfa_method
        })

    def post(self, request):
        user = None
        mfa_token = request.data.get('mfa_token')
        
        if request.user.is_authenticated:
            user = request.user
        elif mfa_token:
            mfa_session = MFASession.objects.filter(token=mfa_token).first()
            if mfa_session and mfa_session.is_valid():
                user = mfa_session.user
        
        if not user:
            return Response({'error': 'No autorizado o sesión expirada'}, status=status.HTTP_401_UNAUTHORIZED)

        code = request.data.get('code')
        method = request.data.get('method', 'TOTP')

        if method == 'TOTP':
            device = TOTPDevice.objects.filter(user=user, confirmed=False).first()
            
            # Log para depuración de drift
            import time
            from django.utils import timezone
            with open('mfa_debug.log', 'a') as f:
                f.write(f"[{timezone.now()}] MFASetup.post - Received: {code}, Device Key: {device.key if device else 'None'}\n")

            if not device or not device.verify_token(code):
                # Reintento con drift de 1 paso más por si acaso
                if device and device.verify_token(code, tolerance=1):
                    pass # Success via drift
                else:
                    return Response({'error': 'Código inválido o expirado. Asegúrate de que la hora de tu celular sea automática.'}, status=status.HTTP_400_BAD_REQUEST)
            
            device.confirmed = True
            device.save()
            TOTPDevice.objects.filter(user=user, confirmed=True).exclude(id=device.id).delete()
            
            user.profile.mfa_enabled = True
            user.profile.mfa_method = 'TOTP'
            user.profile.save()
            
            # Si venía de una sesión de login (mfa_token), entregar los tokens ahora
            if mfa_token:
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                user_data = get_full_user_data(user)
                
                # Eliminar sesión MFA
                MFASession.objects.filter(token=mfa_token).delete()

                response = Response({
                    'message': 'MFA activado correctamente. Iniciando sesión...',
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': user_data
                })

                remember_device = request.data.get('remember_device', False)
                if remember_device:
                    new_device_token = str(uuid.uuid4())
                    TrustedDevice.objects.create(user=user, device_token=new_device_token, name=f"Dispositivo {request.META.get('HTTP_USER_AGENT', 'Desconocido')[:50]}")
                    response.set_cookie(
                        'device_trust_token', 
                        new_device_token, 
                        max_age=30*24*60*60, 
                        httponly=True, 
                        samesite='Lax',
                        path='/'
                    )
                return response

            return Response({'message': 'MFA por App activado correctamente.'})
        
        elif method == 'EMAIL':
            from core.utils.mfa_logic import verify_email_otp
            if verify_email_otp(user, code):
                user.profile.mfa_enabled = True
                user.profile.mfa_method = 'EMAIL'
                user.profile.save()
                return Response({'message': 'MFA por Email activado correctamente.'})
            else:
                return Response({'error': 'Código inválido'}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        password = request.data.get('password')
        if not user.check_password(password):
             return Response({'error': 'Contraseña incorrecta'}, status=status.HTTP_400_BAD_REQUEST)
             
        user.profile.mfa_enabled = False
        user.profile.save()
        TOTPDevice.objects.filter(user=user).delete()
        TrustedDevice.objects.filter(user=user).delete()
        return Response({'message': 'MFA desactivado correctamente.'})

class MFASendEmailOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        user = None
        if request.user.is_authenticated:
            user = request.user
        else:
            mfa_token = request.data.get('mfa_token')
            if mfa_token:
                mfa_session = MFASession.objects.filter(token=mfa_token).first()
                if mfa_session and mfa_session.is_valid():
                    user = mfa_session.user
        
        if not user:
            return Response({'error': 'No se pudo identificar al usuario o sesión expirada'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .utils.mfa_logic import send_otp_email
        send_otp_email(user)
        return Response({'message': 'Código enviado al correo.'})

from rest_framework.permissions import IsAdminUser
from .models import SecurityConfig

class SecurityConfigView(APIView):
    def get(self, request):
        if not request.user.has_perm('core.view_securityconfig'):
            return Response({'error': 'No tienes permiso'}, status=403)
        config = SecurityConfig.get_config()
        return Response({'force_mfa_all': config.force_mfa_all})

    def post(self, request):
        if not request.user.has_perm('core.change_securityconfig'):
            return Response({'error': 'No tienes permiso'}, status=403)
        config = SecurityConfig.get_config()
        config.force_mfa_all = request.data.get('force_mfa_all', config.force_mfa_all)
        config.save()
        return Response({'message': 'Configuración actualizada', 'force_mfa_all': config.force_mfa_all})

class AdminMFAUserManagementView(APIView):
    def get(self, request):
        if not request.user.has_perm('auth.view_user'):
            return Response({'error': 'No tienes permiso'}, status=403)
        users = User.objects.select_related('profile').all().order_by('username')
        data = [{
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'mfa_enabled': u.profile.mfa_enabled,
            'mfa_enforced': u.profile.mfa_enforced,
            'mfa_method': u.profile.mfa_method,
        } for u in users]
        return Response(data)

    def post(self, request):
        if not request.user.has_perm('auth.change_user'):
            return Response({'error': 'No tienes permiso'}, status=403)
        user_id = request.data.get('user_id')
        action = request.data.get('action')
        target_user = User.objects.get(pk=user_id)
        profile = target_user.profile
        
        if action == 'ENFORCE': profile.mfa_enforced = True
        elif action == 'UNENFORCE': profile.mfa_enforced = False
        elif action == 'RESET':
            profile.mfa_enabled = False
            profile.mfa_enforced = False
            TOTPDevice.objects.filter(user=target_user).delete()
            TrustedDevice.objects.filter(user=target_user).delete()
        profile.save()
        return Response({'message': f'Acción {action} realizada con éxito'})

class EmailConfigurationView(APIView):
    def get(self, request):
        if not request.user.has_perm('core.view_emailconfiguration'):
            return Response({'error': 'No tienes permiso'}, status=403)
        config = EmailConfiguration.get_config()
        serializer = EmailConfigurationSerializer(config)
        return Response(serializer.data)

    def post(self, request):
        if not request.user.has_perm('core.change_emailconfiguration'):
            return Response({'error': 'No tienes permiso'}, status=403)
        config = EmailConfiguration.get_config()
        serializer = EmailConfigurationSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
