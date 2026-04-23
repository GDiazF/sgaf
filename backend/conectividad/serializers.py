from rest_framework import serializers
from .models import EscuelaRed, PingHistory


class PingHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PingHistory
        fields = ['timestamp', 'status_lan', 'latency', 'packet_loss']

class EscuelaRedSerializer(serializers.ModelSerializer):
    recent_history = serializers.SerializerMethodField()
    uptime_percentage = serializers.SerializerMethodField()

    class Meta:
        model = EscuelaRed
        fields = '__all__'

    def get_recent_history(self, obj):
        # Retorna los últimos 20 registros para el gráfico/dots
        history = obj.history.all()[:20]
        return PingHistorySerializer(history, many=True).data

    def get_uptime_percentage(self, obj):
        # Cálculo básico de uptime basado en los últimos 100 registros
        history = obj.history.all()[:100]
        if not history: return 100 if obj.last_status_lan else 0
        online_count = sum(1 for h in history if h.status_lan)
        return round((online_count / len(history)) * 100, 1)

