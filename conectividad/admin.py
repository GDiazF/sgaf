from django.contrib import admin
from .models import EscuelaRed

@admin.register(EscuelaRed)
class EscuelaRedAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'ip_lan', 'last_status_lan', 'latency_lan', 'last_check')
    search_fields = ('nombre', 'ip_lan', 'ip_wifi')
    list_filter = ('last_status_lan', 'is_active', 'localidad')
    readonly_fields = ('last_status_lan', 'last_status_wifi', 'last_check', 'latency_lan')
