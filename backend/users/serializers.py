# users/serializers.py — REPLACE ENTIRE FILE

from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password, check_password
from django.core import signing
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = [
            'id', 'username', 'email', 'role', 'phone',
            'first_name', 'last_name', 'company_name',
            'pin_is_set', 'created_at',
        ]
        read_only_fields = ['id', 'pin_is_set', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = CustomUser
        fields = [
            'username', 'email', 'password', 'password2', 'role',
            'first_name', 'last_name', 'phone', 'company_name'
        ]

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        if not validated_data.get('company_name'):
            validated_data['company_name'] = CustomUser.get_company_name()
        user = CustomUser(**validated_data)
        user.set_password(password)
        user.plain_password = password
        user.save()
        return user


# ── Two-step Login ────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    """
    Step 1 of two-step login.
    Validates username + password; returns a short-lived pre_auth_token
    instead of the full JWT. The client must then POST to /auth/verify-pin/
    to complete authentication.
    """
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account is inactive.')
        if user.role == 'LABOURER':
            raise serializers.ValidationError('Labourers do not have system access.')

        # Sign a short-lived token (5 minutes) — no JWT issued yet
        pre_auth_token = signing.dumps(
            {'user_id': user.id},
            salt='pre_auth_login',
        )
        return {
            'pre_auth_token': pre_auth_token,
            'pin_is_set':     user.pin_is_set,
            'username':       user.username,
        }


class VerifyPINSerializer(serializers.Serializer):
    """
    Step 2 of two-step login.
    - If pin_is_set: supply `pin`.
    - If NOT pin_is_set (first login): supply `new_pin` + `confirm_pin`.
    On success returns {user, access, refresh}.
    """
    pre_auth_token = serializers.CharField()
    pin            = serializers.CharField(required=False, allow_blank=True)
    new_pin        = serializers.CharField(required=False, allow_blank=True)
    confirm_pin    = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        # --- decode token ---
        try:
            payload = signing.loads(
                data['pre_auth_token'],
                salt='pre_auth_login',
                max_age=300,   # 5 minutes
            )
        except signing.SignatureExpired:
            raise serializers.ValidationError('Session expired. Please log in again.')
        except Exception:
            raise serializers.ValidationError('Invalid session token.')

        try:
            user = CustomUser.objects.get(pk=payload['user_id'])
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError('User not found.')

        if user.pin_is_set:
            # --- verify existing PIN ---
            pin = data.get('pin', '').strip()
            if not pin:
                raise serializers.ValidationError({'pin': 'PIN is required.'})
            if not check_password(pin, user.security_pin):
                raise serializers.ValidationError({'pin': 'Incorrect PIN.'})
        else:
            # --- set PIN for the first time ---
            new_pin     = data.get('new_pin', '').strip()
            confirm_pin = data.get('confirm_pin', '').strip()
            if not new_pin:
                raise serializers.ValidationError({'new_pin': 'Please set a 4-digit PIN.'})
            if len(new_pin) != 4 or not new_pin.isdigit():
                raise serializers.ValidationError({'new_pin': 'PIN must be exactly 4 digits.'})
            if new_pin != confirm_pin:
                raise serializers.ValidationError({'confirm_pin': 'PINs do not match.'})
            user.security_pin = make_password(new_pin)
            user.pin_is_set   = True
            user.save(update_fields=['security_pin', 'pin_is_set'])

        # --- issue JWT ---
        refresh = RefreshToken.for_user(user)
        return {
            'user':    UserSerializer(user).data,
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
        }


# ── PIN management ────────────────────────────────────────────────

class SetPINSerializer(serializers.Serializer):
    """Authenticated user changing their own PIN."""
    current_pin = serializers.CharField(required=False, allow_blank=True)
    new_pin     = serializers.CharField()
    confirm_pin = serializers.CharField()

    def validate(self, data):
        user = self.context['request'].user
        new_pin     = data.get('new_pin', '').strip()
        confirm_pin = data.get('confirm_pin', '').strip()

        if len(new_pin) != 4 or not new_pin.isdigit():
            raise serializers.ValidationError({'new_pin': 'PIN must be exactly 4 digits.'})
        if new_pin != confirm_pin:
            raise serializers.ValidationError({'confirm_pin': 'PINs do not match.'})

        if user.pin_is_set:
            current = data.get('current_pin', '').strip()
            if not current:
                raise serializers.ValidationError({'current_pin': 'Current PIN is required.'})
            if not check_password(current, user.security_pin):
                raise serializers.ValidationError({'current_pin': 'Current PIN is incorrect.'})

        return data


class AdminResetPINSerializer(serializers.Serializer):
    """HR force-resetting any user's PIN."""
    new_pin     = serializers.CharField()
    confirm_pin = serializers.CharField()

    def validate(self, data):
        new_pin     = data.get('new_pin', '').strip()
        confirm_pin = data.get('confirm_pin', '').strip()
        if len(new_pin) != 4 or not new_pin.isdigit():
            raise serializers.ValidationError({'new_pin': 'PIN must be exactly 4 digits.'})
        if new_pin != confirm_pin:
            raise serializers.ValidationError({'confirm_pin': 'PINs do not match.'})
        return data


# ── Password management ───────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class AdminPasswordListSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CustomUser
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'role', 'plain_password', 'pin_is_set']
        read_only_fields = fields


class AdminSetPasswordSerializer(serializers.Serializer):
    new_password     = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField()

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError(
                {'confirm_password': 'Passwords do not match.'}
            )
        return data
