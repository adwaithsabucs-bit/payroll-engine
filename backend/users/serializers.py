from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data (read-only profile info)."""

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'phone',
                  'first_name', 'last_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new users.
    HR-only operation.

    On creation, automatically creates the matching Contractor or Labourer
    profile record so the user immediately appears in workforce lists.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    # Optional fields used only when role=LABOURER
    daily_wage = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0
    )
    overtime_rate = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0
    )
    skill = serializers.CharField(required=False, allow_blank=True, default='')
    contractor_id = serializers.IntegerField(required=False, allow_null=True)

    # Optional fields used only when role=CONTRACTOR
    supervisor_id = serializers.IntegerField(required=False, allow_null=True)
    company_name = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'password', 'password2',
            'role', 'first_name', 'last_name', 'phone',
            # Labourer profile fields
            'daily_wage', 'overtime_rate', 'skill', 'contractor_id',
            # Contractor profile fields
            'supervisor_id', 'company_name',
        ]

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        # Pop profile-specific fields before creating the user
        validated_data.pop('password2')
        password = validated_data.pop('password')
        daily_wage = validated_data.pop('daily_wage', 0)
        overtime_rate = validated_data.pop('overtime_rate', 0)
        skill = validated_data.pop('skill', '')
        contractor_id = validated_data.pop('contractor_id', None)
        supervisor_id = validated_data.pop('supervisor_id', None)
        company_name = validated_data.pop('company_name', '')

        # Create the CustomUser
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.save()

        # Auto-create the role profile so the user appears in workforce lists
        role = user.role

        if role == 'CONTRACTOR':
            from workforce.models import Contractor
            supervisor = None
            if supervisor_id:
                try:
                    supervisor = CustomUser.objects.get(pk=supervisor_id, role='SUPERVISOR')
                except CustomUser.DoesNotExist:
                    pass
            Contractor.objects.create(
                user=user,
                supervisor=supervisor,
                company_name=company_name,
            )

        elif role == 'LABOURER':
            from workforce.models import Labourer, Contractor
            contractor = None
            if contractor_id:
                try:
                    contractor = Contractor.objects.get(pk=contractor_id)
                except Contractor.DoesNotExist:
                    pass
            Labourer.objects.create(
                user=user,
                contractor=contractor,
                daily_wage=daily_wage,
                overtime_rate=overtime_rate,
                skill=skill,
            )

        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for login — returns JWT tokens + user info."""
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account is inactive.')

        refresh = RefreshToken.for_user(user)
        return {
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value