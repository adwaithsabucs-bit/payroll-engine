from django.contrib import admin
from .models import PayrollPeriod, Payroll


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_closed', 'created_by']
    list_filter = ['is_closed']


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['labourer', 'period', 'present_days', 'total_overtime_hours',
                    'total_salary', 'payment_status']
    list_filter = ['payment_status', 'period']
    search_fields = ['labourer__user__username']