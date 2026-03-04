from rest_framework import viewsets, generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth.models import User, Group, Permission
from .serializers import UserManagementSerializer, GroupSerializer, PermissionSerializer

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_superuser': user.is_superuser,
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
