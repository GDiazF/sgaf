from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notificacion
from .serializers import NotificacionSerializer

class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        self.get_queryset().filter(leida=False).update(leida=True)
        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        notif = self.get_object()
        notif.leida = True
        notif.save()
        return Response({'status': 'ok'})
