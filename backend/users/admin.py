# users/admin.py — REPLACE ENTIRE FILE

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'company_name', 'is_active', 'created_at']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'company_name']
    fieldsets = UserAdmin.fieldsets + (
        ('Payroll Info', {'fields': ('role', 'phone', 'company_name')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Payroll Info', {'fields': ('role', 'phone', 'email', 'company_name')}),
    )
