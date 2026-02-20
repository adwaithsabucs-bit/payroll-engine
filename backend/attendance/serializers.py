from rest_framework import serializers
from .models import Attendance
from workforce.serializers import LabourerListSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    labourer_detail = LabourerListSerializer(source='labourer', read_only=True)
    marked_by_username = serializers.CharField(source='marked_by.username', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)
    effective_days = serializers.ReadOnlyField()

    class Meta:
        model = Attendance
        fields = [
            'id', 'labourer', 'labourer_detail', 'date', 'status',
            'overtime_hours', 'marked_by', 'marked_by_username',
            'approval_status', 'approved_by', 'approved_by_username',
            'effective_days', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'marked_by', 'approval_status', 'approved_by', 'created_at', 'updated_at']

    def validate_overtime_hours(self, value):
        if value < 0 or value > 12:
            raise serializers.ValidationError("Overtime hours must be between 0 and 12.")
        return value

    def validate(self, data):
        # Cannot have overtime if absent
        status = data.get('status', 'PRESENT')
        overtime = data.get('overtime_hours', 0)
        if status == 'ABSENT' and overtime > 0:
            raise serializers.ValidationError("Cannot record overtime for absent labourer.")
        return data


class AttendanceApprovalSerializer(serializers.ModelSerializer):
    """HR uses this to approve or reject attendance records."""

    class Meta:
        model = Attendance
        fields = ['approval_status', 'notes']

    def validate_approval_status(self, value):
        if value not in ['APPROVED', 'REJECTED']:
            raise serializers.ValidationError("Status must be APPROVED or REJECTED.")
        return value