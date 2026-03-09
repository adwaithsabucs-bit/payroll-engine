# users/views.py — REPLACE ENTIRE FILE

from django.contrib.auth.hashers import make_password
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    VerifyPINSerializer, SetPINSerializer, AdminResetPINSerializer,
    ChangePasswordSerializer, AdminPasswordListSerializer,
    AdminSetPasswordSerializer,
)
from .permissions import IsHR


# ── Authentication ────────────────────────────────────────────────

class LoginView(APIView):
    """
    Step 1: POST username + password → returns pre_auth_token + pin_is_set.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class VerifyPINView(APIView):
    """
    Step 2: POST pre_auth_token + pin (or new_pin + confirm_pin on first login)
    → returns {user, access, refresh}.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


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

        # Auto-create workforce profile
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
        instance    = self.get_object()
        data        = request.data.copy()
        first_hr    = CustomUser.objects.filter(role='HR').order_by('id').first()
        is_primary  = first_hr and instance.id == first_hr.id
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
    """Any authenticated user setting or changing their own PIN."""
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
    """
    HR only — force-reset any user's PIN.
    POST /auth/users/<pk>/reset-pin/ with {new_pin, confirm_pin}.
    """
    permission_classes = [IsAuthenticated, IsHR]

    def post(self, request, pk):
        try:
            target = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminResetPINSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_pin = serializer.validated_data['new_pin'].strip()
        target.security_pin = make_password(new_pin)
        target.pin_is_set   = True
        target.save(update_fields=['security_pin', 'pin_is_set'])

        return Response({
            'message':  f"PIN reset for {target.username}.",
            'username': target.username,
        })


# ── Password management ───────────────────────────────────────────

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
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
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminSetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_pw = serializer.validated_data['new_password']
        target.set_password(new_pw)
        target.plain_password = new_pw
        target.save()

        return Response({
            'message':  f"Password updated for {target.username}.",
            'username': target.username,
        })
