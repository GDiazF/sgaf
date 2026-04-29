from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.template import Template, Context
from django.core.mail import get_connection, EmailMessage
from .models import CuentaSMTP, PlantillaCorreo
from .serializers import CuentaSMTPSerializer, PlantillaCorreoSerializer

from rest_framework.permissions import IsAuthenticated, DjangoModelPermissions

class CuentaSMTPViewSet(viewsets.ModelViewSet):
    queryset = CuentaSMTP.objects.all()
    serializer_class = CuentaSMTPSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions]

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        cuenta = self.get_object()
        try:
            connection = get_connection(
                host=cuenta.smtp_host,
                port=cuenta.smtp_port,
                username=cuenta.smtp_user,
                password=cuenta.smtp_password,
                use_tls=cuenta.smtp_use_tls,
                use_ssl=cuenta.smtp_use_ssl,
                timeout=10
            )
            connection.open()
            connection.close()
            return Response({'message': 'Conexión exitosa al servidor SMTP.'})
        except Exception as e:
            return Response({'error': f'Falló la conexión: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class PlantillaCorreoViewSet(viewsets.ModelViewSet):
    queryset = PlantillaCorreo.objects.all()
    serializer_class = PlantillaCorreoSerializer
    permission_classes = [IsAuthenticated, DjangoModelPermissions]

    @action(detail=False, methods=['post'])
    def preview(self, request):
        html_content = request.data.get('html', '')
        # Datos de prueba para previsualización
        test_context = {
            'nombre': 'Usuario de Prueba',
            'codigo': '123456',
            'reset_url': 'http://localhost:5173/reset-password/test',
            'fecha': '28 de abril de 2026',
            'detalles': 'Esta es una previsualización con datos dinámicos de ejemplo.'
        }
        
        try:
            template = Template(html_content)
            rendered_html = template.render(Context(test_context))
            return Response({'html': rendered_html})
        except Exception as e:
            return Response({'error': f'Error en el código HTML: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def send_test(self, request, pk=None):
        plantilla = self.get_object()
        destinatario = request.data.get('email')
        
        if not destinatario:
            return Response({'error': 'Debes proporcionar un correo de destino.'}, status=status.HTTP_400_BAD_REQUEST)
        
        cuenta = plantilla.cuenta_smtp or CuentaSMTP.objects.filter(es_default=True).first()
        if not cuenta:
            return Response({'error': 'No hay una cuenta SMTP configurada para enviar.'}, status=status.HTTP_400_BAD_REQUEST)

        # Contexto de prueba
        test_context = {
            'nombre': 'Receptor de Prueba',
            'codigo': 'TEST-99',
            'reset_url': '#',
            'fecha': 'Hoy',
            'detalles': 'Este es un correo de prueba enviado desde el gestor de comunicaciones.'
        }

        try:
            connection = get_connection(
                host=cuenta.smtp_host,
                port=cuenta.smtp_port,
                username=cuenta.smtp_user,
                password=cuenta.smtp_password,
                use_tls=cuenta.smtp_use_tls,
                use_ssl=cuenta.smtp_use_ssl,
            )
            
            template_asunto = Template(plantilla.asunto)
            asunto_renderizado = template_asunto.render(Context(test_context))
            
            template_cuerpo = Template(plantilla.cuerpo_html)
            cuerpo_renderizado = template_cuerpo.render(Context(test_context))
            
            from_email = f"{cuenta.remitente_nombre} <{cuenta.remitente_email}>"
            
            msg = EmailMessage(
                subject=f"[PRUEBA] {asunto_renderizado}",
                body=cuerpo_renderizado,
                from_email=from_email,
                to=[destinatario],
                connection=connection,
            )
            msg.content_subtype = "html"
            msg.send()
            
            return Response({'message': f'Correo de prueba enviado correctamente a {destinatario}'})
        except Exception as e:
            return Response({'error': f'Error al enviar: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
