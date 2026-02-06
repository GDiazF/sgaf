from rest_framework import serializers
from .models import Subdireccion, Departamento, Unidad, Funcionario


class SubdireccionSerializer(serializers.ModelSerializer):
    """Serializer para Subdirección con contador de departamentos"""
    total_departamentos = serializers.SerializerMethodField()
    total_funcionarios = serializers.SerializerMethodField()
    
    class Meta:
        model = Subdireccion
        fields = '__all__'
    
    def get_total_departamentos(self, obj):
        return obj.departamentos.count()
    
    def get_total_funcionarios(self, obj):
        return obj.funcionarios.count()


class DepartamentoSerializer(serializers.ModelSerializer):
    """Serializer para Departamento con datos de subdirección"""
    subdireccion_nombre = serializers.ReadOnlyField(source='subdireccion.nombre')
    total_unidades = serializers.SerializerMethodField()
    total_funcionarios = serializers.SerializerMethodField()
    
    class Meta:
        model = Departamento
        fields = '__all__'
    
    def get_total_unidades(self, obj):
        return obj.unidades.count()
    
    def get_total_funcionarios(self, obj):
        return obj.funcionarios.count()


class UnidadSerializer(serializers.ModelSerializer):
    """Serializer para Unidad con datos completos de jerarquía"""
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    subdireccion_nombre = serializers.ReadOnlyField(source='departamento.subdireccion.nombre')
    subdireccion_id = serializers.ReadOnlyField(source='departamento.subdireccion.id')
    total_funcionarios = serializers.SerializerMethodField()
    
    class Meta:
        model = Unidad
        fields = '__all__'
    
    def get_total_funcionarios(self, obj):
        return obj.funcionarios.count()


class FuncionarioSerializer(serializers.ModelSerializer):
    """Serializer para Funcionario con datos expandidos de relaciones"""
    # Campos de solo lectura con nombres completos
    subdireccion_nombre = serializers.ReadOnlyField(source='subdireccion.nombre')
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    unidad_nombre = serializers.ReadOnlyField(source='unidad.nombre')
    
    # Objetos completos para lectura detallada
    subdireccion_obj = SubdireccionSerializer(source='subdireccion', read_only=True)
    departamento_obj = DepartamentoSerializer(source='departamento', read_only=True)
    unidad_obj = UnidadSerializer(source='unidad', read_only=True)
    
    class Meta:
        model = Funcionario
        fields = '__all__'
        extra_kwargs = {
            'numero_publico': {'read_only': True},
            'creado_en': {'read_only': True},
            'actualizado_en': {'read_only': True},
        }
    
    def validate_rut(self, value):
        """Validación adicional de RUT en el serializer"""
        # El modelo ya valida, pero agregamos validación aquí también
        import re
        if not re.match(r'^\d{7,8}-[\dkK]$', value):
            raise serializers.ValidationError("RUT inválido. Usa el formato 12345678-9")
        return value.upper()  # Normalizar K a mayúscula
    
    def validate(self, data):
        """Validación de coherencia jerárquica"""
        subdireccion = data.get('subdireccion')
        departamento = data.get('departamento')
        unidad = data.get('unidad')
        
        # Si estamos actualizando, obtener valores actuales si no se proporcionan
        if self.instance:
            subdireccion = subdireccion or self.instance.subdireccion
            departamento = departamento or self.instance.departamento
            unidad = unidad or self.instance.unidad
        
        # Validar que departamento pertenece a subdirección
        if departamento and subdireccion:
            if departamento.subdireccion_id != subdireccion.id:
                raise serializers.ValidationError({
                    "departamento": "El departamento no pertenece a la subdirección seleccionada."
                })
        
        # Validar que unidad pertenece a departamento
        if unidad:
            if not departamento:
                raise serializers.ValidationError({
                    "unidad": "Debes seleccionar un departamento primero."
                })
            if unidad.departamento_id != departamento.id:
                raise serializers.ValidationError({
                    "unidad": "La unidad no pertenece al departamento seleccionado."
                })
        
        return data


class FuncionarioListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados (más eficiente)"""
    subdireccion_nombre = serializers.ReadOnlyField(source='subdireccion.nombre')
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    unidad_nombre = serializers.ReadOnlyField(source='unidad.nombre')
    
    class Meta:
        model = Funcionario
        fields = [
            'id', 'rut', 'nombre_funcionario', 'anexo', 'numero_publico',
            'cargo', 'estado', 'subdireccion', 'subdireccion_nombre',
            'departamento', 'departamento_nombre', 'unidad', 'unidad_nombre'
        ]
