from rest_framework import serializers
from .models import Procedimiento, TipoProcedimiento
from funcionarios.models import Subdireccion, Departamento, Unidad
from django.contrib.auth import get_user_model

User = get_user_model()

class TipoProcedimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoProcedimiento
        fields = ['id', 'nombre', 'color', 'descripcion']

class ProcedimientoSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.ReadOnlyField(source='autor.get_full_name')
    tipo_data = TipoProcedimientoSerializer(source='tipo', read_only=True)
    
    # Nombres de las áreas para el visualizador
    subdireccion_nombre = serializers.ReadOnlyField(source='subdireccion.nombre')
    departamento_nombre = serializers.ReadOnlyField(source='departamento.nombre')
    unidad_nombre = serializers.ReadOnlyField(source='unidad.nombre')
    
    class Meta:
        model = Procedimiento
        fields = [
            'id', 'titulo', 'descripcion', 'archivo', 
            'tipo', 'tipo_data',
            'subdireccion', 'subdireccion_nombre',
            'departamento', 'departamento_nombre',
            'unidad', 'unidad_nombre',
            'autor', 'autor_nombre', 'activo', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['autor', 'created_at', 'updated_at']
