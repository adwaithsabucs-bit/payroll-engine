from rest_framework import serializers
from .models import Contractor, Labourer
from users.serializers import UserSerializer


class ContractorSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    supervisor_detail = UserSerializer(source='supervisor', read_only=True)
    labourer_count = serializers.SerializerMethodField()

    class Meta:
        model = Contractor
        fields = ['id', 'user', 'user_detail', 'supervisor', 'supervisor_detail',
                  'company_name', 'contract_number', 'is_active', 'labourer_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_labourer_count(self, obj):
        return obj.labourers.filter(is_active=True).count()


class LabourerSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    contractor_detail = ContractorSerializer(source='contractor', read_only=True)

    class Meta:
        model = Labourer
        fields = ['id', 'user', 'user_detail', 'contractor', 'contractor_detail',
                  'daily_wage', 'overtime_rate', 'skill', 'id_number',
                  'joined_date', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class LabourerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    full_name = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    contractor_name = serializers.SerializerMethodField()

    class Meta:
        model = Labourer
        fields = ['id', 'full_name', 'username', 'contractor_name',
                  'daily_wage', 'overtime_rate', 'skill', 'is_active']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_contractor_name(self, obj):
        if obj.contractor:
            return obj.contractor.user.get_full_name() or obj.contractor.user.username
        return None