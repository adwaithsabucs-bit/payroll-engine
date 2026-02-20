from django.contrib import admin
from .models import Contractor, Labourer


@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ['user', 'supervisor', 'company_name', 'contract_number', 'is_active']
    list_filter = ['is_active', 'supervisor']
    search_fields = ['user__username', 'company_name', 'contract_number']


@admin.register(Labourer)
class LabourerAdmin(admin.ModelAdmin):
    list_display = ['user', 'contractor', 'daily_wage', 'overtime_rate', 'skill', 'is_active']
    list_filter = ['is_active', 'contractor']
    search_fields = ['user__username', 'skill', 'id_number']