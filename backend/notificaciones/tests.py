from django.contrib.auth.models import User
from django.test import TestCase
from unittest.mock import patch

from notificaciones.models import Notificacion, TipoNotificacion
from notificaciones.services import notificar, seed_tipos_notificacion


class NotificarServiceTests(TestCase):
    def setUp(self):
        seed_tipos_notificacion()
        self.user = User.objects.create_user(username='agente', email='a@test.com', password='x')
        self.tipo = TipoNotificacion.objects.get(codigo='TICKETS.NUEVO')

    def test_campana_crea_fila(self):
        created = notificar(
            modulo='TICKETS',
            evento='NUEVO',
            titulo='T',
            mensaje='M',
            usuarios=[self.user],
            link='/tickets/1',
            tipo='TICKET',
        )
        self.assertEqual(len(created), 1)
        n = Notificacion.objects.get()
        self.assertEqual(n.usuario, self.user)
        self.assertEqual(n.modulo, 'TICKETS')
        self.assertEqual(n.evento, 'NUEVO')

    def test_campana_off_no_crea(self):
        self.tipo.enviar_campana = False
        self.tipo.enviar_email = False
        self.tipo.save()
        created = notificar(
            modulo='TICKETS',
            evento='NUEVO',
            titulo='T',
            mensaje='M',
            usuarios=[self.user],
        )
        self.assertEqual(created, [])
        self.assertEqual(Notificacion.objects.count(), 0)

    def test_tipo_inactivo(self):
        self.tipo.activo = False
        self.tipo.save()
        created = notificar(
            modulo='TICKETS',
            evento='NUEVO',
            titulo='T',
            mensaje='M',
            usuarios=[self.user],
        )
        self.assertEqual(created, [])

    def test_dedupe_key(self):
        notificar(
            modulo='TICKETS',
            evento='NUEVO',
            titulo='T1',
            mensaje='M',
            usuarios=[self.user],
            dedupe_key='k1',
        )
        notificar(
            modulo='TICKETS',
            evento='NUEVO',
            titulo='T2',
            mensaje='M',
            usuarios=[self.user],
            dedupe_key='k1',
        )
        self.assertEqual(Notificacion.objects.count(), 1)

    @patch('notificaciones.services.enviar_correo_maestro')
    def test_email_channel(self, mock_send):
        mock_send.return_value = True
        from comunicaciones.models import PlantillaCorreo

        plantilla = PlantillaCorreo.objects.create(
            nombre='Test ticket',
            proposito='TEST',
            asunto='Asunto {{ titulo }}',
            cuerpo_html='<p>{{ mensaje }}</p>',
        )
        self.tipo.enviar_email = True
        self.tipo.plantilla = plantilla
        self.tipo.save()

        notificar(
            modulo='TICKETS',
            evento='NUEVO',
            titulo='Hola',
            mensaje='Mundo',
            usuarios=[self.user],
            async_email=False,
        )
        self.assertTrue(mock_send.called)
        args, kwargs = mock_send.call_args
        self.assertEqual(args[0], 'TEST')
        self.assertIn('a@test.com', args[1])


class FuentesVivasTests(TestCase):
    def setUp(self):
        from notificaciones.services import seed_fuentes_y_jobs

        seed_fuentes_y_jobs()
        self.user = User.objects.create_superuser(
            username='admin', email='admin@test.com', password='x'
        )

    def test_construir_incluye_reservas_para_superuser(self):
        from notificaciones.services import construir_fuentes_vivas_para

        fuentes = construir_fuentes_vivas_para(self.user)
        codigos = [f['codigo'] for f in fuentes]
        self.assertIn('RESERVAS_PENDIENTES', codigos)


class JobSchedulerTests(TestCase):
    def setUp(self):
        from notificaciones.services import seed_fuentes_y_jobs

        seed_fuentes_y_jobs()

    def test_ejecutar_force(self):
        from unittest.mock import MagicMock

        from notificaciones.models import JobProgramado
        from notificaciones.services import ejecutar_jobs_vencidos

        mock_handler = MagicMock(return_value=0)
        with patch.dict(
            'notificaciones.handlers.JOB_HANDLERS',
            {'vehiculos_vencimientos': mock_handler},
        ):
            corridos = ejecutar_jobs_vencidos(force=True)
        self.assertIn('VEHICULOS_VENCIMIENTOS', corridos)
        mock_handler.assert_called_once()
        job = JobProgramado.objects.get(codigo='VEHICULOS_VENCIMIENTOS')
        self.assertIsNotNone(job.ultima_fecha_corrida)
