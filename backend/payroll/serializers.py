from rest_framework import serializers
from .models import PayrollPeriod, Payroll
from workforce.serializers import LabourerListSerializer


class PayrollPeriodSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    payroll_count = serializers.SerializerMethodField()

    class Meta:
        model = PayrollPeriod
        fields = ['id', 'name', 'start_date', 'end_date', 'is_closed',
                  'created_by', 'created_by_username', 'payroll_count', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']

    def get_payroll_count(self, obj):
        return obj.payrolls.count()

    def validate(self, data):
        if data.get('start_date') and data.get('end_date'):
            if data['start_date'] > data['end_date']:
                raise serializers.ValidationError("Start date must be before end date.")
        return data


class PayrollSerializer(serializers.ModelSerializer):
    labourer_detail = LabourerListSerializer(source='labourer', read_only=True)
    period_detail = PayrollPeriodSerializer(source='period', read_only=True)
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True)

    class Meta:
        model = Payroll
        fields = [
            'id', 'period', 'period_detail', 'labourer', 'labourer_detail',
            'present_days', 'total_overtime_hours',
            'daily_wage_snapshot', 'overtime_rate_snapshot',
            'basic_salary', 'overtime_pay', 'total_salary',
            'payment_status', 'approved_by', 'approved_by_username',
            'approved_at', 'paid_at', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'present_days', 'total_overtime_hours',
            'daily_wage_snapshot', 'overtime_rate_snapshot',
            'basic_salary', 'overtime_pay', 'total_salary',
            'approved_by', 'approved_at', 'paid_at', 'created_at', 'updated_at'
        ]


class PayrollApproveSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = ['payment_status', 'notes']

    def validate_payment_status(self, value):
        if value not in ['APPROVED', 'PAID', 'DISPUTED']:
            raise serializers.ValidationError("Invalid payment status.")
        return value