from rest_framework import serializers
from .models import BiometricoConfig

class BiometricoConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricoConfig
        fields = ['url', 'username', 'password', 'updated_at']
