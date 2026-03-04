# users/views.py — REPLACE ENTIRE FILE

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, ChangePasswordSerializer
from .permissions import IsHR


class LoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
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
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
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
                supervisor = CustomUser.objects.filter(id=supervisor_id, role='SUPERVISOR').first() if supervisor_id else None
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
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsHR]
    def get_queryset(self):
        role = self.request.query_params.get('role')
        qs = CustomUser.objects.all().order_by('role', 'username')
        if role:
            qs = qs.filter(role=role)
        return qs


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsHR]
    queryset = CustomUser.objects.all()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()

        first_hr = CustomUser.objects.filter(role='HR').order_by('id').first()
        is_primary_admin = first_hr and instance.id == first_hr.id
        new_company = data.get('company_name', None)

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        if is_primary_admin and new_company is not None:
            CustomUser.objects.all().exclude(pk=instance.pk).update(company_name=new_company)

        # Sync workforce profile
        try:
            from workforce.models import Contractor, Labourer
            if instance.role == 'CONTRACTOR':
                c, _ = Contractor.objects.get_or_create(user=instance)
                sid = data.get('supervisor_id')
                if sid:
                    sv = CustomUser.objects.filter(id=sid, role='SUPERVISOR').first()
                    if sv:
                        c.supervisor = sv
                        c.save()
            elif instance.role == 'LABOURER':
                l, _ = Labourer.objects.get_or_create(user=instance)
                cid = data.get('contractor_id')
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

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password updated.'})
