# attendance/serializers.py — REPLACE ENTIRE FILE

from rest_framework import serializers
from .models import Project, Period, TemporaryLabourer, ContractorAttendance, LabourerAttendance
from users.models import CustomUser


class ProjectSerializer(serializers.ModelSerializer):
    supervisor_name = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = '__all__'

    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return f"{obj.supervisor.first_name} {obj.supervisor.last_name or obj.supervisor.username}".strip()
        return None


class PeriodSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Period
        fields = '__all__'


class TemporaryLabourerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemporaryLabourer
        fields = '__all__'


class ContractorAttendanceSerializer(serializers.ModelSerializer):
    contractor_name = serializers.SerializerMethodField()
    project_name    = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = ContractorAttendance
        fields = '__all__'
        read_only_fields = ['marked_by', 'created_at', 'updated_at']

    def get_contractor_name(self, obj):
        u = obj.contractor.user
        return f"{u.first_name} {u.last_name or u.username}".strip()

    def create(self, validated_data):
        validated_data['marked_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['marked_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class LabourerAttendanceSerializer(serializers.ModelSerializer):
    labourer_name = serializers.SerializerMethodField()
    is_temp       = serializers.SerializerMethodField()
    project_name  = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = LabourerAttendance
        fields = '__all__'
        read_only_fields = ['marked_by', 'created_at', 'updated_at']

    def get_labourer_name(self, obj):
        if obj.labourer:
            u = obj.labourer.user
            return f"{u.first_name} {u.last_name or u.username}".strip()
        if obj.temp_labourer:
            return f"{obj.temp_labourer.name} (Temp)"
        return "Unknown"

    def get_is_temp(self, obj):
        return obj.temp_labourer_id is not None

    def create(self, validated_data):
        validated_data['marked_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data['marked_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class AttendanceSummarySerializer(serializers.Serializer):
    """Used by HR admin for monitoring dashboard."""
    supervisor_id   = serializers.IntegerField()
    supervisor_name = serializers.CharField()
    project_name    = serializers.CharField()
    contractors_total    = serializers.IntegerField()
    contractors_marked   = serializers.IntegerField()
    labourers_total      = serializers.IntegerField()
    labourers_marked     = serializers.IntegerField()
