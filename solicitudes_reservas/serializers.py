from rest_framework import serializers
from .models import RecursoReservable, SolicitudReserva, BloqueoHorario, ReservaSetting
from datetime import time, timedelta
from django.utils import timezone

class RecursoReservableSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursoReservable
        fields = '__all__'

class SolicitudReservaSerializer(serializers.ModelSerializer):
    recurso_nombre = serializers.ReadOnlyField(source='recurso.nombre')
    solicitante_email = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudReserva
        fields = [
            'id', 'recurso', 'recurso_nombre', 'solicitante', 'solicitante_email',
            'titulo', 'descripcion', 'nombre_funcionario', 'email_contacto',
            'fecha_inicio', 'fecha_fin', 'estado', 'codigo_reserva',
            'aprobado_por', 'fecha_aprobacion', 'motivo_rechazo',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['solicitante', 'aprobado_por', 'fecha_aprobacion', 'created_at', 'updated_at', 'codigo_reserva']

    def get_solicitante_email(self, obj):
        if obj.solicitante:
            nombre = f"{obj.solicitante.first_name} {obj.solicitante.last_name}".strip()
            return nombre or obj.solicitante.username
        return obj.email_contacto or 'Público (Sin sesión)'

    def validate_recurso(self, value):
        if not value.activo:
            raise serializers.ValidationError(f'El recurso "{value.nombre}" está desactivado.')
        return value

    def validate(self, data):
        fi = data.get('fecha_inicio')
        ff = data.get('fecha_fin')
        recurso = data.get('recurso')

        if fi and ff and ff <= fi:
            raise serializers.ValidationError({'fecha_fin': 'La hora de término debe ser posterior a la de inicio.'})

        # ─ Validación: no permitir reservas en el pasado ─
        now = timezone.now()
        if fi:
            # Primero comparamos solo la fecha para dar un mensaje específico si es otro día
            if fi.date() < now.date():
                raise serializers.ValidationError({'fecha_inicio': 'No se pueden realizar reservas para días anteriores a hoy.'})
            # Margen relax: permitimos reservar desde el inicio de la hora actual
            limite_hora = now.replace(minute=0, second=0, microsecond=0)
            if fi < limite_hora:
                raise serializers.ValidationError({'fecha_inicio': 'No se pueden realizar reservas para un horario anterior al inicio de la hora actual.'})

        # ─ Validación: hora de fin contra configuración global ─
        setting = ReservaSetting.objects.first()
        h_fin_limite = setting.hora_fin if setting else time(17, 30)
        
        if ff and ff.time() > h_fin_limite:
            raise serializers.ValidationError(
                {'fecha_fin': f'Las reservas no pueden terminar después de las {h_fin_limite.strftime("%H:%M")} hrs.'}
            )

        if fi and ff and recurso:
            # ─ Validar contra reservas aprobadas ─
            qs = SolicitudReserva.objects.filter(
                recurso=recurso,
                estado='APROBADA',
                fecha_inicio__lt=ff,
                fecha_fin__gt=fi,
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                c = qs.first()
                raise serializers.ValidationError(
                    f'El recurso ya tiene una reserva APROBADA para ese horario ({c.fecha_inicio.strftime("%H:%M")} - {c.fecha_fin.strftime("%H:%M")}).'
                )

            # ─ Validar contra bloqueos manuales ─
            fecha = fi.date()
            hi = fi.time()
            hf = ff.time()
            # Traer todos los bloqueos del recurso con solapamiento de HORA y verificar por modo
            candidatos = BloqueoHorario.objects.filter(
                recurso=recurso,
                hora_inicio__lt=hf,
                hora_fin__gt=hi,
            )
            bloqueo = next((b for b in candidatos if b.aplica_en_fecha(fecha)), None)
            if bloqueo:
                motivo = f' Motivo: {bloqueo.motivo}' if bloqueo.motivo else ''
                raise serializers.ValidationError(
                    f'El recurso tiene un horario bloqueado de {bloqueo.hora_inicio.strftime("%H:%M")} a {bloqueo.hora_fin.strftime("%H:%M")}.{motivo}'
                )

        return data


class BloqueoHorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = BloqueoHorario
        fields = ['id', 'recurso', 'modo', 'fecha_inicio', 'fecha_fin',
                  'hora_inicio', 'hora_fin', 'motivo', 'creado_por', 'created_at']
        read_only_fields = ['creado_por', 'created_at']

    def validate(self, data):
        hi   = data.get('hora_inicio')
        hf   = data.get('hora_fin')
        modo = data.get('modo', 'DIA')
        fi   = data.get('fecha_inicio')
        ff   = data.get('fecha_fin')

        if hi and hf and hf <= hi:
            raise serializers.ValidationError({'hora_fin': 'La hora de fin debe ser posterior a la de inicio.'})

        if modo == 'RANGO':
            if not ff:
                raise serializers.ValidationError({'fecha_fin': 'Para un rango de fechas debes indicar la fecha de fin.'})
            if ff < fi:
                raise serializers.ValidationError({'fecha_fin': 'La fecha de fin debe ser igual o posterior a la de inicio.'})
        elif modo == 'INDEFINIDO':
            data['fecha_fin'] = None  # aseguramos que no quede fecha_fin
        elif modo == 'DIA':
            data['fecha_fin'] = None  # solo fecha_inicio aplica

        # ─ Validación: no bloquear el pasado ─
        if fi and fi < timezone.now().date():
            raise serializers.ValidationError({'fecha_inicio': 'No se pueden crear bloqueos para fechas pasadas.'})

        return data

class PublicSolicitudReservaSerializer(serializers.ModelSerializer):
    """Muestra solo lo mínimo para el calendario público."""
    class Meta:
        model = SolicitudReserva
        fields = ['id', 'recurso', 'titulo', 'nombre_funcionario', 'fecha_inicio', 'fecha_fin', 'estado']

class ReservaSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReservaSetting
        fields = '__all__'
