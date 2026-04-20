import concurrent.futures
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import EscuelaRed, PingHistory
from .serializers import EscuelaRedSerializer
import subprocess
import platform
from django.utils import timezone

class EscuelaRedViewSet(viewsets.ModelViewSet):
    queryset = EscuelaRed.objects.all().order_by('nombre')
    serializer_class = EscuelaRedSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def _ping(self, ip):
        if not ip: return False, 0, 0
        try:
            # -n 4 para Windows, -c 4 para Linux
            # -w 1000 limita la espera a 1 segundo por paquete
            param = '-n' if platform.system().lower() == 'windows' else '-c'
            wait_param = '-w' if platform.system().lower() == 'windows' else '-W'
            command = ['ping', param, '4', wait_param, '1000', ip]
            
            output = subprocess.check_output(command, stderr=subprocess.STDOUT, universal_newlines=True)
            
            latency = 0
            loss = 100
            
            if platform.system().lower() == 'windows':
                if "Media =" in output:
                    latency = int(output.split("Media =")[1].split("ms")[0].strip())
                if "(" in output and "% perdidos)" in output:
                    loss = int(output.split("(")[1].split("%")[0].strip())
            else:
                if "avg" in output:
                    latency = int(float(output.split("=")[1].split("/")[1].strip()))
                if "packet loss" in output:
                    loss = int(output.split("packet loss")[0].split(",")[-1].replace("%", "").strip())
                
            return (loss < 100), latency, loss
        except:
            return False, 0, 100

    def _update_escuela_status(self, escuela):
        # Esta función ahora es segura para hilos
        success, latency, loss = self._ping(escuela.ip_lan)
        
        escuela.last_status_lan = success
        escuela.latency_lan = latency
        escuela.packet_loss = loss
        
        if escuela.ip_wifi:
            success_wifi, _, _ = self._ping(escuela.ip_wifi)
            escuela.last_status_wifi = success_wifi
            
        escuela.last_check = timezone.now()
        escuela.save()

        PingHistory.objects.create(
            escuela=escuela,
            status_lan=success,
            latency=latency,
            packet_loss=loss
        )
        return escuela

    @action(detail=True, methods=['post'])
    def ping(self, request, pk=None):
        escuela = self.get_object()
        escuela = self._update_escuela_status(escuela)
        return Response(EscuelaRedSerializer(escuela).data)

    @action(detail=False, methods=['post'])
    def refresh_all(self, request):
        escuelas = list(EscuelaRed.objects.filter(is_active=True))
        
        # Ejecutar pings en paralelo (máximo 20 hilos a la vez)
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            # Enviamos todas las tareas
            future_to_escuela = {executor.submit(self._update_escuela_status, e): e for e in escuelas}
            
            # Esperamos a que todas terminen
            results = []
            for future in concurrent.futures.as_completed(future_to_escuela):
                try:
                    updated_escuela = future.result()
                    results.append(updated_escuela)
                except Exception as exc:
                    print(f'Escuela generó una excepción: {exc}')

        # Ordenar por nombre antes de enviar al frontend
        results.sort(key=lambda x: x.nombre)
        return Response(EscuelaRedSerializer(results, many=True).data)


