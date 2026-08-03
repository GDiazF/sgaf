from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.timezone import now
from django.db import transaction

from .models import SolicitudARCO
from .serializers import SolicitudARCOSerializer, ResolucionARCOSerializer
from funcionarios.models import Funcionario

class SolicitudARCOViewSet(viewsets.ModelViewSet):
    """
    ViewSet para la creación, listado y resolución de solicitudes de derechos ARCO.
    """
    serializer_class = SolicitudARCOSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SolicitudARCO.objects.select_related('solicitante', 'resuelto_por')

        # Perfil: solo las del usuario autenticado (aunque tenga permiso de gestión).
        mine = str(self.request.query_params.get('mine', '')).lower() in ('1', 'true', 'yes')
        if mine:
            try:
                funcionario = user.funcionario_profile
                return qs.filter(solicitante=funcionario)
            except Funcionario.DoesNotExist:
                return qs.none()

        # Gestión ARCO: ver todas las solicitudes
        if user.has_perm('arco.view_solicitudarco') or user.is_superuser:
            return qs.all()

        # Funcionario regular: solo las propias
        try:
            funcionario = user.funcionario_profile
            return qs.filter(solicitante=funcionario)
        except Funcionario.DoesNotExist:
            return qs.none()

    @action(detail=True, methods=['post'], url_path='resolver')
    def resolver(self, request, pk=None):
        """
        Endpoint administrativo para aprobar o rechazar una solicitud ARCO.
        """
        solicitud = self.get_object()
        
        # Validar permisos
        if not request.user.has_perm('arco.change_solicitudarco'):
            return Response(
                {"error": "No tiene permisos suficientes para resolver solicitudes ARCO."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Validar que esté PENDIENTE
        if solicitud.estado != 'PENDIENTE':
            return Response(
                {"error": "Esta solicitud ya ha sido resuelta previamente."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = ResolucionARCOSerializer(data=request.data)
        if serializer.is_valid():
            estado = serializer.validated_data['estado']
            motivo_rechazo = serializer.validated_data.get('motivo_rechazo', '')
            
            with transaction.atomic():
                solicitud.estado = estado
                solicitud.motivo_rechazo = motivo_rechazo if estado == 'RECHAZADA' else ''
                solicitud.fecha_resolucion = now()
                solicitud.resuelto_por = request.user
                
                # Si se aprueba y es de tipo RECTIFICACION, aplicar los cambios automáticamente
                if estado == 'APROBADA' and solicitud.tipo_derecho == 'RECTIFICACION':
                    funcionario = solicitud.solicitante
                    campo = solicitud.campo
                    nuevo_valor = solicitud.valor_propuesto
                    
                    if campo == 'email':
                        if funcionario.user:
                            funcionario.user.email = nuevo_valor
                            funcionario.user.save()
                    elif campo and hasattr(funcionario, campo):
                        # Convertir a boolean en caso de que el campo original sea boolean (no aplica para los editables pero es buena práctica)
                        setattr(funcionario, campo, nuevo_valor)
                        funcionario.save()
                
                # Si se aprueba y es de tipo SUPRESION, aplicar anonimización y desactivar cuenta
                elif estado == 'APROBADA' and solicitud.tipo_derecho == 'SUPRESION':
                    funcionario = solicitud.solicitante
                    
                    # 1. Desactivar y limpiar cuenta User
                    if funcionario.user:
                        usr = funcionario.user
                        usr.is_active = False
                        usr.email = f"suprimido_{usr.id}@slep.cl"
                        usr.first_name = "SUACT"
                        usr.last_name = "ANONIMIZADO"
                        if hasattr(usr, 'profile'):
                            usr.profile.mfa_enabled = False
                            usr.profile.mfa_secret = None
                            usr.profile.save()
                        usr.save()

                    # 2. Generar un RUT válido para el validador
                    base_num = 99000000 + (funcionario.id % 900000)
                    # Calcular dígito verificador chileno para base_num
                    suma = 0
                    multiplo = 2
                    for r in reversed(str(base_num)):
                        suma += int(r) * multiplo
                        multiplo = multiplo + 1 if multiplo < 7 else 2
                    dv_calc = 11 - (suma % 11)
                    dv = '0' if dv_calc == 11 else ('K' if dv_calc == 10 else str(dv_calc))
                    
                    # 3. Guardar cambios en el modelo Funcionario
                    funcionario.nombre_funcionario = f"Funcionario Anonimizado (ARCO #{solicitud.id})"
                    funcionario.rut = f"{base_num}-{dv}"
                    funcionario.anexo = ""
                    funcionario.cargo = "Suprimido (Derecho ARCO)"
                    funcionario.estado = False
                    funcionario.save()
                
                solicitud.save()
                
            return Response(
                {
                    "message": f"Solicitud {solicitud.id} resuelta con éxito (Estado: {estado}).",
                    "solicitud": SolicitudARCOSerializer(solicitud).data
                },
                status=status.HTTP_200_OK
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
