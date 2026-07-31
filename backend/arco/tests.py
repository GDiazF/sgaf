from django.contrib.auth.models import User, Permission
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from funcionarios.models import Funcionario
from .models import SolicitudARCO

class SolicitudARCOAPITests(APITestCase):

    def setUp(self):
        # Crear usuario funcionario
        self.user = User.objects.create_user(
            username='funcionario1',
            email='func1@slep.cl',
            password='testpassword123',
            first_name='Juan',
            last_name='Perez'
        )
        self.funcionario = Funcionario.objects.create(
            user=self.user,
            rut='11111111-1',
            nombre_funcionario='Juan Perez',
            anexo='111',
            cargo='Analista'
        )

        # Crear otro usuario funcionario (para probar aislamiento)
        self.other_user = User.objects.create_user(
            username='funcionario2',
            email='func2@slep.cl',
            password='testpassword123',
            first_name='Maria',
            last_name='Soto'
        )
        self.other_funcionario = Funcionario.objects.create(
            user=self.other_user,
            rut='22222222-2',
            nombre_funcionario='Maria Soto',
            anexo='222',
            cargo='Técnico'
        )

        # Crear administrador
        self.admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@slep.cl',
            password='adminpassword123'
        )
        
        # Asignar permisos explícitos de ARCO al admin (Django standard)
        view_perm = Permission.objects.get(codename='view_solicitudarco')
        change_perm = Permission.objects.get(codename='change_solicitudarco')
        self.admin_user.user_permissions.add(view_perm, change_perm)

        # URLs
        self.list_url = reverse('solicitudes-arco-list')

    def test_create_rectificacion_success(self):
        """Un funcionario puede solicitar la rectificación de su anexo."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'tipo_derecho': 'RECTIFICACION',
            'campo': 'anexo',
            'valor_propuesto': '120',
            'justificacion': 'Me cambiaron al piso 3, oficina 302.'
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verificar en base de datos
        solicitud = SolicitudARCO.objects.get(id=response.data['id'])
        self.assertEqual(solicitud.solicitante, self.funcionario)
        self.assertEqual(solicitud.valor_anterior, '111')
        self.assertEqual(solicitud.valor_propuesto, '120')
        self.assertEqual(solicitud.estado, 'PENDIENTE')

    def test_create_rectificacion_invalid_field(self):
        """No se puede solicitar rectificación de un campo no permitido."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'tipo_derecho': 'RECTIFICACION',
            'campo': 'activo',  # Campo no permitido
            'valor_propuesto': 'false',
            'justificacion': 'Quiero desactivar mi cuenta'
        }
        
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('campo', response.data)

    def test_list_solicitudes_isolation(self):
        """Un funcionario solo puede ver sus propias solicitudes."""
        # Crear solicitud para funcionario 1
        SolicitudARCO.objects.create(
            solicitante=self.funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='111',
            valor_propuesto='120',
            justificacion='Prueba 1'
        )
        
        # Crear solicitud para funcionario 2
        SolicitudARCO.objects.create(
            solicitante=self.other_funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='222',
            valor_propuesto='230',
            justificacion='Prueba 2'
        )

        # Autenticar como funcionario 1 y ver lista
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['solicitante_nombre'], 'Juan Perez')

    def test_admin_can_view_all(self):
        """Un administrador con permisos puede ver todas las solicitudes."""
        SolicitudARCO.objects.create(
            solicitante=self.funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='111',
            valor_propuesto='120',
            justificacion='Prueba 1'
        )
        SolicitudARCO.objects.create(
            solicitante=self.other_funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='222',
            valor_propuesto='230',
            justificacion='Prueba 2'
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_admin_mine_filter_only_own(self):
        """Con ?mine=1 el admin solo ve sus propias solicitudes (perfil), no las de gestión."""
        admin_func = Funcionario.objects.create(
            user=self.admin_user,
            rut='99999999-9',
            nombre_funcionario='Admin SLEP',
            anexo='999',
            cargo='Administrador',
        )
        SolicitudARCO.objects.create(
            solicitante=self.funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='111',
            valor_propuesto='120',
            justificacion='De otro usuario',
        )
        SolicitudARCO.objects.create(
            solicitante=admin_func,
            tipo_derecho='PORTABILIDAD',
            justificacion='Solicitud propia del admin',
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.list_url, {'mine': '1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['solicitante_nombre'], 'Admin SLEP')

        # Sin mine sigue viendo todas (gestión ARCO)
        response_all = self.client.get(self.list_url)
        self.assertEqual(response_all.data['count'], 2)

    def test_admin_approve_rectificacion(self):
        """El administrador puede aprobar la solicitud y los datos se actualizan."""
        solicitud = SolicitudARCO.objects.create(
            solicitante=self.funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='111',
            valor_propuesto='120',
            justificacion='Me cambiaron de puesto.'
        )

        resolver_url = reverse('solicitudes-arco-resolver', kwargs={'pk': solicitud.id})
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'estado': 'APROBADA'
        }
        
        response = self.client.post(resolver_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar actualización del modelo Funcionario
        self.funcionario.refresh_from_db()
        self.assertEqual(self.funcionario.anexo, '120')
        
        # Verificar estado de la solicitud
        solicitud.refresh_from_db()
        self.assertEqual(solicitud.estado, 'APROBADA')
        self.assertEqual(solicitud.resuelto_por, self.admin_user)

    def test_admin_reject_rectificacion(self):
        """El administrador puede rechazar la solicitud proporcionando un motivo obligatorio."""
        solicitud = SolicitudARCO.objects.create(
            solicitante=self.funcionario,
            tipo_derecho='RECTIFICACION',
            campo='anexo',
            valor_anterior='111',
            valor_propuesto='120',
            justificacion='Me cambiaron de puesto.'
        )

        resolver_url = reverse('solicitudes-arco-resolver', kwargs={'pk': solicitud.id})
        self.client.force_authenticate(user=self.admin_user)
        
        # Intentar rechazar sin motivo (debe fallar)
        data_no_reason = {
            'estado': 'RECHAZADA'
        }
        response = self.client.post(resolver_url, data_no_reason, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Rechazar con motivo (debe tener éxito)
        data_with_reason = {
            'estado': 'RECHAZADA',
            'motivo_rechazo': 'Ese anexo está asignado a otra persona.'
        }
        response = self.client.post(resolver_url, data_with_reason, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar que NO se actualizó el modelo Funcionario
        self.funcionario.refresh_from_db()
        self.assertEqual(self.funcionario.anexo, '111')
        
        # Verificar estado de la solicitud
        solicitud.refresh_from_db()
        self.assertEqual(solicitud.estado, 'RECHAZADA')
        self.assertEqual(solicitud.motivo_rechazo, 'Ese anexo está asignado a otra persona.')

    def test_admin_approve_supresion(self):
        """Al aprobar una supresión, se anonimizan los datos del funcionario y se desactiva su cuenta."""
        solicitud = SolicitudARCO.objects.create(
            solicitante=self.funcionario,
            tipo_derecho='SUPRESION',
            justificacion='Solicito la supresión de mis registros.'
        )

        resolver_url = reverse('solicitudes-arco-resolver', kwargs={'pk': solicitud.id})
        self.client.force_authenticate(user=self.admin_user)
        
        data = {
            'estado': 'APROBADA'
        }
        
        response = self.client.post(resolver_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verificar que el funcionario y el usuario se hayan anonimizado/desactivado
        self.funcionario.refresh_from_db()
        self.assertIn("Funcionario Anonimizado", self.funcionario.nombre_funcionario)
        self.assertEqual(self.funcionario.anexo, "")
        self.assertEqual(self.funcionario.cargo, "Suprimido (Derecho ARCO)")
        self.assertFalse(self.funcionario.estado) # Desactivado
        
        # Verificar cuenta User asociada
        user_obj = self.funcionario.user
        self.assertFalse(user_obj.is_active)
        self.assertIn("suprimido_", user_obj.email)
        self.assertEqual(user_obj.first_name, "SUACT")
        self.assertEqual(user_obj.last_name, "ANONIMIZADO")


from django.test import TestCase
from core.utils.encryption import encrypt_value, decrypt_value

class EncryptionTests(TestCase):
    def test_encryption_decryption(self):
        original = "super_secret_password_123"
        encrypted = encrypt_value(original)
        self.assertNotEqual(original, encrypted)
        
        decrypted = decrypt_value(encrypted)
        self.assertEqual(original, decrypted)

    def test_decryption_fallback(self):
        plain_text = "already_plain_text"
        decrypted = decrypt_value(plain_text)
        self.assertEqual(plain_text, decrypted)


from core.models import AuditLog

class AuditLogTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_superuser(
            username='auditor',
            email='audit@slep.cl',
            password='auditpassword123'
        )
        self.list_url = reverse('funcionario-list')

    def test_funcionario_lifecycle_auditing(self):
        """El ciclo de vida del Funcionario se audita (CREACION, MODIFICACION, ELIMINACION)."""
        self.client.force_authenticate(user=self.user)
        AuditLog.objects.all().delete()

        func = Funcionario.objects.create(
            rut='33333333-3',
            nombre_funcionario='Test Auditoria',
            anexo='333',
            cargo='Tester'
        )

        log_create = AuditLog.objects.filter(model_name='Funcionario', action='CREACION').first()
        self.assertIsNotNone(log_create)
        self.assertIn('33333333-3', log_create.details)
        self.assertIn('rut', log_create.changes)
        self.assertEqual(log_create.changes['rut'][1], '33333333-3')

        func.cargo = 'Tester Senior'
        func.save()

        log_update = AuditLog.objects.filter(model_name='Funcionario', action='MODIFICACION').first()
        self.assertIsNotNone(log_update)
        self.assertIn('cargo', log_update.changes)
        self.assertEqual(log_update.changes['cargo'], ['Tester', 'Tester Senior'])

        func_id = func.id
        func.delete()

        log_delete = AuditLog.objects.filter(
            model_name='Funcionario', action='ELIMINACION', object_id=str(func_id)
        ).first()
        self.assertIsNotNone(log_delete)
        self.assertIn('rut', log_delete.changes)
        self.assertEqual(log_delete.changes['rut'][0], '33333333-3')
        self.assertIsNone(log_delete.changes['rut'][1])

    def test_reads_are_not_audited(self):
        """Listado y detalle (GET) no generan registros de auditoría."""
        self.client.force_authenticate(user=self.user)

        func = Funcionario.objects.create(
            rut='44444444-4',
            nombre_funcionario='API Auditoria',
            anexo='444',
            cargo='Tester API'
        )
        AuditLog.objects.all().delete()

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        retrieve_url = reverse('funcionario-detail', kwargs={'pk': func.id})
        response = self.client.get(retrieve_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(
            AuditLog.objects.filter(model_name='Funcionario').exists()
        )
        self.assertFalse(
            AuditLog.objects.filter(action='ACCESO').exists()
        )

    def test_audit_log_not_recursive(self):
        """Crear/eliminar AuditLog no genera nuevos registros de auditoría."""
        before = AuditLog.objects.count()
        entry = AuditLog.objects.create(
            user=self.user,
            action='CREACION',
            model_name='Manual',
            object_id='1',
            details='manual',
            changes={'a': [None, 1]},
        )
        self.assertEqual(AuditLog.objects.count(), before + 1)
        entry.delete()
        self.assertEqual(AuditLog.objects.count(), before)

    def test_audit_log_api_endpoint(self):
        """El endpoint API de auditoría funciona, soporta paginación, filtros y restringe accesos no autorizados."""
        self.client.force_authenticate(user=self.user)

        AuditLog.objects.create(
            user=self.user,
            action='CREACION',
            model_name='Funcionario',
            object_id='99',
            details='Funcionario de prueba creado',
            ip_address='127.0.0.1',
            changes={'nombre': [None, 'Prueba']},
        )

        url = reverse('admin-audit-log-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(len(response.data['results']), 1)

        log_data = response.data['results'][0]
        self.assertIn('actor_name', log_data)
        self.assertIn('remote_addr', log_data)
        self.assertIn('content_type_name', log_data)
        self.assertIn('changes', log_data)

        regular_user = User.objects.create_user(username='regular', password='password123')
        self.client.force_authenticate(user=regular_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
