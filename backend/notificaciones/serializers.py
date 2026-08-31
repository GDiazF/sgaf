from rest_framework import serializers

from notificaciones.models import FuenteViva, JobProgramado, Notificacion, TipoNotificacion


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = (
            'id',
            'usuario',
            'titulo',
            'mensaje',
            'tipo',
            'modulo',
            'evento',
            'link',
            'contexto',
            'leida',
            'fecha_creacion',
        )
        read_only_fields = fields


class TipoNotificacionSerializer(serializers.ModelSerializer):
    cuenta_smtp_nombre = serializers.CharField(
        source='cuenta_smtp.nombre', read_only=True, default=None
    )
    plantilla_nombre = serializers.CharField(
        source='plantilla.nombre', read_only=True, default=None
    )

    class Meta:
        model = TipoNotificacion
        fields = (
            'id',
            'codigo',
            'modulo',
            'evento',
            'nombre',
            'descripcion',
            'activo',
            'enviar_campana',
            'enviar_email',
            'cuenta_smtp',
            'cuenta_smtp_nombre',
            'plantilla',
            'plantilla_nombre',
            'grupos',
            'roles',
            'usuarios',
            'emails_adicionales',
            'creado_en',
            'actualizado_en',
        )
        read_only_fields = ('creado_en', 'actualizado_en', 'cuenta_smtp_nombre', 'plantilla_nombre')

    def validate(self, attrs):
        enviar_email = attrs.get(
            'enviar_email',
            getattr(self.instance, 'enviar_email', False) if self.instance else False,
        )
        plantilla = attrs.get(
            'plantilla',
            getattr(self.instance, 'plantilla', None) if self.instance else None,
        )
        if enviar_email and not plantilla:
            raise serializers.ValidationError(
                {'plantilla': 'Obligatoria cuando el canal email está activo.'}
            )
        return attrs


class FuenteVivaSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuenteViva
        fields = (
            'id',
            'codigo',
            'nombre',
            'titulo_bloque',
            'handler_key',
            'activo',
            'orden',
            'proposito_operativo',
            'grupos',
            'roles',
            'usuarios',
        )


class JobProgramadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobProgramado
        fields = (
            'id',
            'codigo',
            'nombre',
            'handler_key',
            'hora',
            'activo',
            'ultima_ejecucion',
            'ultima_fecha_corrida',
        )
        read_only_fields = ('ultima_ejecucion', 'ultima_fecha_corrida')
