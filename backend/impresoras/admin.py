from django.contrib import admin
from .models import Printer

@admin.register(Printer)
class PrinterAdmin(admin.ModelAdmin):
    list_display = ("name", "ip_address", "type", "last_check", "last_ok")
    list_filter = ("type", "enabled", "last_ok")
    search_fields = ("name", "ip_address", "location")
