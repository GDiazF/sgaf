from rest_framework import serializers
from .models import Printer

class PrinterSerializer(serializers.ModelSerializer):
    toner = serializers.SerializerMethodField()

    class Meta:
        model = Printer
        fields = [
            "id",
            "name",
            "location",
            "floor",
            "ip_address",
            "type",
            "community",
            "snmp_port",
            "enabled",
            "notes",
            "last_check",
            "last_ok",
            "last_message",
            "last_black",
            "last_cyan",
            "last_magenta",
            "last_yellow",
            "last_errors",
            "serial_number",
            "last_connected",
            "last_woke",
            "toner",
        ]
        read_only_fields = [
            "last_check",
            "last_ok",
            "last_message",
            "last_black",
            "last_cyan",
            "last_magenta",
            "last_yellow",
            "last_errors",
            "serial_number",
            "last_connected",
            "last_woke",
        ]

    def get_toner(self, obj):
        return obj.toner_snapshot()
