# payroll/serializers.py — REPLACE ENTIRE FILE

from rest_framework import serializers
from .models import SupervisorPayroll, ContractorPayroll, LabourerPayroll


class SupervisorPayrollSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()
    project_name    = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = SupervisorPayroll
        fields = '__all__'
        read_only_fields = ['total_amount', 'created_by', 'created_at', 'updated_at']

    def get_supervisor_name(self, obj):
        u = obj.supervisor
        return f"{u.first_name} {u.last_name or u.username}".strip()


class ContractorPayrollSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    project_name    = serializers.CharField(source='project.name', read_only=True)
    period_name     = serializers.CharField(source='period.name', read_only=True)

    class Meta:
        model = ContractorPayroll
        fields = '__all__'
        read_only_fields = ['total_amount', 'created_by', 'created_at', 'updated_at']

    def get_contractor_name(self, obj):
        u = obj.contractor.user
        return f"{u.first_name} {u.last_name or u.username}".strip()


class LabourerPayrollSerializer(serializers.ModelSerializer):
    labourer_name = serializers.SerializerMethodField()
    is_temp       = serializers.SerializerMethodField()
    project_name  = serializers.CharField(source='project.name', read_only=True)
    period_name   = serializers.CharField(source='period.name', read_only=True)

    class Meta:
        model = LabourerPayroll
        fields = '__all__'
        read_only_fields = ['total_amount', 'created_by', 'created_at', 'updated_at']

    def get_labourer_name(self, obj):
        if obj.labourer:
            u = obj.labourer.user
            return f"{u.first_name} {u.last_name or u.username}".strip()
        if obj.temp_labourer:
            return f"{obj.temp_labourer.name} (Temp)"
        return "Unknown"

    def get_is_temp(self, obj):
        return obj.temp_labourer_id is not None
