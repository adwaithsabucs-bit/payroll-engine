# backend/attendance/serializers.py — REPLACE ENTIRE FILE

from rest_framework import serializers
from .models import (
    Project, Period, TemporaryLabourer,
    ContractorAttendance, LabourerAttendance,
    ProjectContractorAssignment,
)


class ProjectSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()

    class Meta:
        model  = Project
        fields = '__all__'

    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return obj.supervisor.get_full_name() or obj.supervisor.username
        return None


class PeriodSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model  = Period
        fields = '__all__'


class TemporaryLabourerSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TemporaryLabourer
        fields = '__all__'


class ContractorAttendanceSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()

    class Meta:
        model  = ContractorAttendance
        fields = '__all__'

    def get_contractor_name(self, obj):
        u = obj.contractor.user
        return u.get_full_name() or u.username


class LabourerAttendanceSerializer(serializers.ModelSerializer):
    labourer_name = serializers.SerializerMethodField()

    class Meta:
        model  = LabourerAttendance
        fields = '__all__'

    def get_labourer_name(self, obj):
        if obj.labourer:
            return obj.labourer.user.get_full_name() or obj.labourer.user.username
        if obj.temp_labourer:
            return f"{obj.temp_labourer.name} (Temp)"
        return "Unknown"


class ProjectContractorAssignmentSerializer(serializers.ModelSerializer):
    contractor_name  = serializers.SerializerMethodField()
    contractor_company = serializers.SerializerMethodField()
    project_name     = serializers.CharField(source='project.name', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()
    payroll_status   = serializers.SerializerMethodField()
    payroll_id       = serializers.SerializerMethodField()

    class Meta:
        model  = ProjectContractorAssignment
        fields = '__all__'

    def get_contractor_name(self, obj):
        u = obj.contractor.user
        return u.get_full_name() or u.username

    def get_contractor_company(self, obj):
        return obj.contractor.company_name or ''

    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name() or obj.assigned_by.username
        return None

    def get_payroll_status(self, obj):
        try:
            return obj.payroll.status
        except Exception:
            return None

    def get_payroll_id(self, obj):
        try:
            return obj.payroll.id
        except Exception:
            return None
