from rest_framework import serializers
from .models import AsignacionEjecutivo, GestionEstablecimiento, SubtareaGestion, AdjuntoGestion, HistorialGestion
from funcionarios.models import Funcionario, Unidad, Departamento, Subdireccion
from establecimientos.models import Establecimiento

class EstablecimientoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Establecimiento
        fields = ['id', 'nombre', 'rbd']

class FuncionarioListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Funcionario
        fields = ['id', 'nombre_funcionario', 'rut', 'cargo']

class SubdireccionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subdireccion
        fields = ['id', 'nombre']

class DepartamentoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = ['id', 'nombre']

class UnidadListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidad
        fields = ['id', 'nombre']

class AsignacionEjecutivoSerializer(serializers.ModelSerializer):
    funcionario_details = FuncionarioListSerializer(source='funcionario', read_only=True)
    establecimiento_details = EstablecimientoListSerializer(source='establecimiento', read_only=True)

    class Meta:
        model = AsignacionEjecutivo
        fields = '__all__'

class SubtareaGestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubtareaGestion
        fields = '__all__'

class AdjuntoGestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdjuntoGestion
        fields = '__all__'

class HistorialGestionSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    class Meta:
        model = HistorialGestion
        fields = '__all__'

class GestionEstablecimientoSerializer(serializers.ModelSerializer):
    establecimiento_details = EstablecimientoListSerializer(source='establecimiento', read_only=True)
    ejecutivo_details = FuncionarioListSerializer(source='ejecutivo', read_only=True)
    
    subdirecciones_detalles = SubdireccionListSerializer(source='subdirecciones_requeridas', many=True, read_only=True)
    departamentos_detalles = DepartamentoListSerializer(source='departamentos_requeridos', many=True, read_only=True)
    unidades_detalles = UnidadListSerializer(source='unidades_requeridas', many=True, read_only=True)
    
    subtareas = SubtareaGestionSerializer(many=True, read_only=True)
    adjuntos = AdjuntoGestionSerializer(many=True, read_only=True)
    historial = HistorialGestionSerializer(many=True, read_only=True)
    creado_por_nombre = serializers.CharField(source='creado_por.get_full_name', read_only=True)

    class Meta:
        model = GestionEstablecimiento
        fields = '__all__'
