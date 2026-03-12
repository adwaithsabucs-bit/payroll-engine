# backend/payroll/serializers.py — REPLACE ENTIRE FILE

from rest_framework import serializers
from .models import SupervisorPayroll, ContractorProjectPayroll, DailyLabourerPayroll


class SupervisorPayrollSerializer(serializers.ModelSerializer):
    supervisor_name  = serializers.SerializerMethodField()
    month_display    = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = SupervisorPayroll
        fields = '__all__'
        read_only_fields = [
            'total_amount', 'approved_by', 'approved_at', 'created_at', 'updated_at',
        ]

    def get_supervisor_name(self, obj):
        u = obj.supervisor
        return u.get_full_name() or u.username

    def get_month_display(self, obj):
        return obj.month.strftime('%B %Y') if obj.month else ''

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None


class ContractorProjectPayrollSerializer(serializers.ModelSerializer):
    contractor_name  = serializers.SerializerMethodField()
    contractor_company = serializers.SerializerMethodField()
    project_name     = serializers.CharField(source='project.name', read_only=True)
    supervisor_name  = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = ContractorProjectPayroll
        fields = '__all__'
        read_only_fields = [
            'contractor', 'project', 'assignment',
            'contract_amount', 'total_amount',
            'approved_by', 'approved_at', 'created_at', 'updated_at',
        ]

    def get_contractor_name(self, obj):
        u = obj.contractor.user
        return u.get_full_name() or u.username

    def get_contractor_company(self, obj):
        return obj.contractor.company_name or ''

    def get_supervisor_name(self, obj):
        sup = obj.contractor.supervisor
        if sup:
            return sup.get_full_name() or sup.username
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None


class DailyLabourerPayrollSerializer(serializers.ModelSerializer):
    labourer_name     = serializers.SerializerMethodField()
    contractor_name   = serializers.SerializerMethodField()
    project_name      = serializers.CharField(source='project.name', read_only=True)
    attendance_status = serializers.CharField(source='attendance.status', read_only=True)

    class Meta:
        model  = DailyLabourerPayroll
        fields = '__all__'
        read_only_fields = [
            'labourer', 'temp_labourer', 'contractor', 'project', 'attendance',
            'date', 'daily_wage', 'overtime_hours', 'overtime_rate',
            'total_amount', 'is_temp', 'created_at', 'updated_at',
        ]

    def get_labourer_name(self, obj):
        if obj.labourer:
            return obj.labourer.user.get_full_name() or obj.labourer.user.username
        if obj.temp_labourer:
            return f"{obj.temp_labourer.name} (Temp)"
        return "Unknown"

    def get_contractor_name(self, obj):
        if obj.contractor:
            return obj.contractor.user.get_full_name() or obj.contractor.user.username
        return None
