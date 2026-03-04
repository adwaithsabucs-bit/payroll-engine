from rest_framework import serializers
from .models import Contractor, Labourer
from users.models import CustomUser

class UserInlineSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'phone', 'company_name']

class ContractorSerializer(serializers.ModelSerializer):
    user_detail     = UserInlineSerializer(source='user', read_only=True)
    supervisor_name = serializers.SerializerMethodField()
    company_name    = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='CONTRACTOR'), write_only=True, required=False)
    supervisor = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='SUPERVISOR'), allow_null=True, required=False)

    class Meta:
        model  = Contractor
        fields = ['id','user','user_detail','supervisor','supervisor_name','company_name','created_at']

    def get_supervisor_name(self, obj):
        if obj.supervisor:
            return f"{obj.supervisor.first_name} {obj.supervisor.last_name or obj.supervisor.username}".strip()
        return None

    def get_company_name(self, obj):
        return obj.user.company_name if obj.user else ''

class LabourerSerializer(serializers.ModelSerializer):
    user_detail     = UserInlineSerializer(source='user', read_only=True)
    contractor_name = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='LABOURER'), write_only=True, required=False)
    contractor = serializers.PrimaryKeyRelatedField(
        queryset=Contractor.objects.all(), allow_null=True, required=False)

    class Meta:
        model  = Labourer
        fields = ['id','user','user_detail','contractor','contractor_name',
                  'daily_wage','overtime_rate','skill','created_at']

    def get_contractor_name(self, obj):
        if obj.contractor and obj.contractor.user:
            u = obj.contractor.user
            return f"{u.first_name} {u.last_name or u.username}".strip()
        return None