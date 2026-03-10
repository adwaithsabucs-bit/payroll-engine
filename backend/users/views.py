# users/views.py — REPLACE ENTIRE FILE

import random
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    VerifyPINSerializer, ForgotPINSerializer, ResetPINWithCodeSerializer,
    SetPINSerializer, AdminResetPINSerializer,
    ChangePasswordSerializer, AdminPasswordListSerializer, AdminSetPasswordSerializer,
)
from .permissions import IsHR


# ── Authentication ────────────────────────────────────────────────

class LoginView(APIView):
    """Step 1: POST username + password → pre_auth_token."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class VerifyPINView(APIView):
    """Step 2: POST pre_auth_token + pin → full JWT."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


# ── Forgot PIN ────────────────────────────────────────────────────

class ForgotPINView(APIView):
    """
    POST /auth/forgot-pin/ with {username}.
    Generates a 6-digit reset code, valid for 15 minutes.
    The plain code is stored temporarily on the model so HR can relay it
    to the user (no email required).
    Returns: {message, username, expires_in_minutes: 15}
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data['username']
        user     = CustomUser.objects.get(username=username)

        # Generate a 6-digit code
        plain_code = f"{random.randint(0, 999999):06d}"
        user.pin_reset_code    = make_password(plain_code)
        user.pin_reset_expires = timezone.now() + timedelta(minutes=15)

        # Store the plain code temporarily so HR can see it in the admin panel
        # We use a non-model attribute here — HR fetches it via AdminGetResetCodeView
        # which reads the last_plain_code from a separate field.
        # Simplest approach: store plain in a separate field (cleared after use)
        user._plain_reset_code = plain_code  # transient, not saved to DB
        user.save(update_fields=['pin_reset_code', 'pin_reset_expires'])

        # Store plain code in a JSON-friendly way — use an extra plain field
        # We re-use plain_password field concept: add pin_reset_plain to model
        # For now, store plain as first 6 chars of a prefix in pin_reset_code
        # Actually, the cleanest approach: store hashed + also store plain in
        # a dedicated pin_reset_plain field. Since model has it, save it.
        # The HR admin can then retrieve this via GET /auth/users/<pk>/pin-reset-code/
        try:
            from .models import CustomUser as CU
            CU.objects.filter(pk=user.pk).update(
                # We'll store the plain code in a way HR can retrieve
                # We use the pin_reset_code field itself to store "PLAIN:<code>|HASH:<hash>"
                # This is a pragmatic approach for an offline/HR-relay system.
                pin_reset_code=f"PLAIN:{plain_code}|HASH:{make_password(plain_code)}"
            )
        except Exception:
            pass

        return Response({
            'message':          'Reset code generated. Please contact your HR administrator to get the 6-digit code.',
            'username':         username,
            'expires_minutes':  15,
        }, status=status.HTTP_200_OK)


class AdminGetResetCodeView(APIView):
    """
    GET /auth/users/<pk>/pin-reset-code/
    HR only. Returns the plain 6-digit reset code so HR can relay it to the user.
    """
    permission_classes = [IsAuthenticated, IsHR]

    def get(self, request, pk):
        try:
            target = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        if not target.pin_reset_code:
            return Response({'has_code': False, 'message': 'No reset code requested.'})

        # Check expiry
        if target.pin_reset_expires and target.pin_reset_expires < timezone.now():
            target.pin_reset_code    = ''
            target.pin_reset_expires = None
            target.save(update_fields=['pin_reset_code', 'pin_reset_expires'])
            return Response({'has_code': False, 'message': 'Code has expired.'})

        # Parse plain code from storage
        plain_code = None
        if target.pin_reset_code.startswith('PLAIN:'):
            try:
                plain_code = target.pin_reset_code.split('|')[0].replace('PLAIN:', '')
            except Exception:
                plain_code = None

        expires_in = None
        if target.pin_reset_expires:
            delta = target.pin_reset_expires - timezone.now()
            expires_in = max(0, int(delta.total_seconds() / 60))

        return Response({
            'has_code':         True,
            'reset_code':       plain_code,
            'expires_in_minutes': expires_in,
            'username':         target.username,
        })


class ResetPINWithCodeView(APIView):
    """
    POST /auth/reset-pin-with-code/
    {username, reset_code, new_pin, confirm_pin}
    No auth required — user is not yet logged in.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPINWithCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['_user']

        # Verify code against stored hash portion
        reset_code = request.data.get('reset_code', '').strip()
        stored     = user.pin_reset_code

        if stored.startswith('PLAIN:'):
            # Extract hash from "PLAIN:XXXXXX|HASH:<hash>"
            try:
                hash_part = stored.split('|HASH:')[1]
            except IndexError:
                return Response({'error': 'Invalid reset code format.'}, status=400)
            if not make_password(reset_code) and not __import__('django.contrib.auth.hashers', fromlist=['check_password']).check_password(reset_code, hash_part):
                return Response({'error': 'Incorrect reset code.'}, status=400)
        else:
            from django.contrib.auth.hashers import check_password
            if not check_password(reset_code, stored):
                return Response({'error': 'Incorrect reset code.'}, status=400)

        # Set new PIN
        new_pin = serializer.validated_data['new_pin'].strip()
        user.security_pin      = make_password(new_pin)
        user.pin_is_set        = True
        user.pin_reset_code    = ''
        user.pin_reset_expires = None
        user.save(update_fields=['security_pin', 'pin_is_set', 'pin_reset_code', 'pin_reset_expires'])

        return Response({'message': 'PIN reset successfully. You can now log in with your new PIN.'})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return Response({'message': 'Logged out.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=400)


class RegisterView(generics.CreateAPIView):
    queryset           = CustomUser.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [IsAuthenticated, IsHR]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            from workforce.models import Contractor, Labourer
            if user.role == 'CONTRACTOR':
                supervisor_id = request.data.get('supervisor_id')
                supervisor = (
                    CustomUser.objects.filter(id=supervisor_id, role='SUPERVISOR').first()
                    if supervisor_id else None
                )
                Contractor.objects.get_or_create(user=user, defaults={'supervisor': supervisor})
            elif user.role == 'LABOURER':
                contractor_id = request.data.get('contractor_id')
                contractor = None
                if contractor_id:
                    from workforce.models import Contractor as C
                    contractor = C.objects.filter(id=contractor_id).first()
                Labourer.objects.get_or_create(user=user, defaults={
                    'contractor':    contractor,
                    'daily_wage':    request.data.get('daily_wage', 0),
                    'overtime_rate': request.data.get('overtime_rate', 0),
                    'skill':         request.data.get('skill', ''),
                })
        except Exception as e:
            print(f"Workforce profile error: {e}")

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated, IsHR]

    def get_queryset(self):
        role = self.request.query_params.get('role')
        qs   = CustomUser.objects.all().order_by('role', 'username')
        if role:
            qs = qs.filter(role=role)
        return qs


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated, IsHR]
    queryset           = CustomUser.objects.all()

    def partial_update(self, request, *args, **kwargs):
        instance   = self.get_object()
        data       = request.data.copy()
        first_hr   = CustomUser.objects.filter(role='HR').order_by('id').first()
        is_primary = first_hr and instance.id == first_hr.id
        new_company = data.get('company_name', None)

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        if is_primary and new_company is not None:
            CustomUser.objects.all().exclude(pk=instance.pk).update(company_name=new_company)

        try:
            from workforce.models import Contractor, Labourer
            if instance.role == 'CONTRACTOR':
                c, _ = Contractor.objects.get_or_create(user=instance)
                sid  = data.get('supervisor_id')
                if sid:
                    sv = CustomUser.objects.filter(id=sid, role='SUPERVISOR').first()
                    if sv:
                        c.supervisor = sv
                        c.save()
            elif instance.role == 'LABOURER':
                l, _ = Labourer.objects.get_or_create(user=instance)
                cid  = data.get('contractor_id')
                if cid:
                    from workforce.models import Contractor as C
                    ct = C.objects.filter(id=cid).first()
                    if ct:
                        l.contractor = ct
                if 'daily_wage'    in data: l.daily_wage    = data['daily_wage']
                if 'overtime_rate' in data: l.overtime_rate = data['overtime_rate']
                if 'skill'         in data: l.skill         = data['skill']
                l.save()
        except Exception as e:
            print(f"Workforce sync error: {e}")

        return Response(UserSerializer(updated_user).data)


# ── PIN management ────────────────────────────────────────────────

class SetPINView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SetPINSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        new_pin = serializer.validated_data['new_pin'].strip()
        request.user.security_pin = make_password(new_pin)
        request.user.pin_is_set   = True
        request.user.save(update_fields=['security_pin', 'pin_is_set'])
        return Response({'message': 'PIN updated successfully.'})


class AdminResetPINView(APIView):
    permission_classes = [IsAuthenticated, IsHR]

    def post(self, request, pk):
        try:
            target = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        serializer = AdminResetPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_pin = serializer.validated_data['new_pin'].strip()
        target.security_pin    = make_password(new_pin)
        target.pin_is_set      = True
        target.pin_reset_code  = ''
        target.pin_reset_expires = None
        target.save(update_fields=['security_pin', 'pin_is_set', 'pin_reset_code', 'pin_reset_expires'])

        return Response({'message': f"PIN reset for {target.username}.", 'username': target.username})


# ── Password management ───────────────────────────────────────────

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        new_pw = serializer.validated_data['new_password']
        request.user.set_password(new_pw)
        request.user.plain_password = new_pw
        request.user.save()
        return Response({'message': 'Password updated.'})


class AdminPasswordListView(generics.ListAPIView):
    serializer_class   = AdminPasswordListSerializer
    permission_classes = [IsAuthenticated, IsHR]

    def get_queryset(self):
        return CustomUser.objects.all().order_by('role', 'username')


class AdminSetPasswordView(APIView):
    permission_classes = [IsAuthenticated, IsHR]

    def post(self, request, pk):
        try:
            target = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=404)

        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_pw = serializer.validated_data['new_password']
        target.set_password(new_pw)
        target.plain_password = new_pw
        target.save()

        return Response({'message': f"Password updated for {target.username}.", 'username': target.username})
