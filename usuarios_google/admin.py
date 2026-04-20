from django.contrib import admin
from .models import GoogleUser, GoogleUploadLog, GoogleOrgUnit

@admin.register(GoogleOrgUnit)
class GoogleOrgUnitAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at')
    search_fields = ('name',)
    list_filter = ('is_active',)

@admin.register(GoogleUser)
class GoogleUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'employee_id', 'org_unit_path')
    search_fields = ('email', 'first_name', 'last_name', 'employee_id')
    list_filter = ('status',)

@admin.register(GoogleUploadLog)
class GoogleUploadLogAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'total_records', 'uploaded_at')
    readonly_fields = ('uploaded_at',)
