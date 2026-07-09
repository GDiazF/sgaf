from rest_framework import serializers
from .models import SolicitudARCO
from funcionarios.models import Funcionario

class SolicitudARCOSerializer(serializers.ModelSerializer):
    solicitante_nombre = serializers.ReadOnlyField(source='solicitante.nombre_funcionario')
    solicitante_rut = serializers.ReadOnlyField(source='solicitante.rut')
    resuelto_por_nombre = serializers.ReadOnlyField(source='resuelto_por.username')

    class Meta:
        model = SolicitudARCO
        fields = [
            'id', 'solicitante', 'solicitante_nombre', 'solicitante_rut',
            'tipo_derecho', 'campo', 'valor_anterior', 'valor_propuesto',
            'justificacion', 'archivo_respaldo', 'estado', 'solicita_bloqueo',
            'fecha_solicitud', 'fecha_resolucion', 'resuelto_por', 'resuelto_por_nombre', 'motivo_rechazo'
        ]
        read_only_fields = [
            'solicitante', 'valor_anterior', 'estado', 'fecha_solicitud',
            'fecha_resolucion', 'resuelto_por', 'resuelto_por_nombre'
        ]

    def validate(self, data):
        tipo_derecho = data.get('tipo_derecho', 'RECTIFICACION')
        
        # Validar que si es RECTIFICACION, se provea el campo y el valor propuesto
        if tipo_derecho == 'RECTIFICACION':
            campo = data.get('campo')
            valor_propuesto = data.get('valor_propuesto')
            
            if not campo:
                raise serializers.ValidationError({"campo": "Este campo es requerido para solicitudes de rectificación."})
            if not valor_propuesto:
                raise serializers.ValidationError({"valor_propuesto": "Debe especificar el valor propuesto para la rectificación."})
                
            # Validar campos editables permitidos
            campos_permitidos = ['nombre_funcionario', 'rut', 'anexo', 'cargo', 'email']
            if campo not in campos_permitidos:
                raise serializers.ValidationError({"campo": f"Solo se permite rectificar los siguientes campos: {', '.join(campos_permitidos)}"})
                
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Debe estar autenticado.")
            
        try:
            funcionario = request.user.funcionario_profile
        except Funcionario.DoesNotExist:
            raise serializers.ValidationError("El usuario actual no tiene un perfil de funcionario asociado.")
            
        validated_data['solicitante'] = funcionario
        
        # Auto-poblar el valor anterior si es RECTIFICACION
        if validated_data.get('tipo_derecho') == 'RECTIFICACION':
            campo = validated_data.get('campo')
            if campo == 'email':
                validated_data['valor_anterior'] = funcionario.user.email if funcionario.user else ""
            else:
                validated_data['valor_anterior'] = getattr(funcionario, campo, "")
                
        return super().create(validated_data)


class ResolucionARCOSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudARCO
        fields = ['estado', 'motivo_rechazo']

    def validate(self, data):
        estado = data.get('estado')
        motivo_rechazo = data.get('motivo_rechazo')
        
        if estado not in ['APROBADA', 'RECHAZADA']:
            raise serializers.ValidationError({"estado": "El estado de resolución debe ser APROBADA o RECHAZADA."})
            
        if estado == 'RECHAZADA' and not motivo_rechazo:
            raise serializers.ValidationError({"motivo_rechazo": "Debe especificar un motivo de rechazo según exige el Art. 11 de la ley."})
            
        return data
