from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
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
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Successfully logged out.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [IsAuthenticated, IsHR]


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
    """GET/PATCH/DELETE /api/auth/users/<id>/ — HR only."""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsHR]
    queryset = CustomUser.objects.all()

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        old_role = user.role
        new_role = request.data.get('role', old_role)

        response = super().partial_update(request, *args, **kwargs)
        user.refresh_from_db()

        # If role changed, create the new profile if it doesn't exist
        if old_role != new_role:
            self._handle_role_change(user, old_role, new_role)

        # Update workforce profile fields if provided
        self._update_profile(user, request.data)

        return response

    def _handle_role_change(self, user, old_role, new_role):
        from workforce.models import Contractor, Labourer
        if new_role == 'CONTRACTOR':
            if not hasattr(user, 'contractor_profile'):
                Contractor.objects.create(user=user)
        elif new_role == 'LABOURER':
            if not hasattr(user, 'labourer_profile'):
                Labourer.objects.create(user=user, daily_wage=0, overtime_rate=0)

    def _update_profile(self, user, data):
        from workforce.models import Contractor, Labourer
        if user.role == 'LABOURER' and hasattr(user, 'labourer_profile'):
            profile = user.labourer_profile
            changed = False
            if 'daily_wage' in data:
                profile.daily_wage = data['daily_wage']
                changed = True
            if 'overtime_rate' in data:
                profile.overtime_rate = data['overtime_rate']
                changed = True
            if 'skill' in data:
                profile.skill = data['skill']
                changed = True
            if 'contractor_id' in data:
                try:
                    profile.contractor = Contractor.objects.get(pk=data['contractor_id'])
                    changed = True
                except Contractor.DoesNotExist:
                    pass
            if changed:
                profile.save()

        elif user.role == 'CONTRACTOR' and hasattr(user, 'contractor_profile'):
            profile = user.contractor_profile
            changed = False
            if 'company_name' in data:
                profile.company_name = data['company_name']
                changed = True
            if 'supervisor_id' in data:
                try:
                    supervisor = CustomUser.objects.get(
                        pk=data['supervisor_id'], role='SUPERVISOR'
                    )
                    profile.supervisor = supervisor
                    changed = True
                except CustomUser.DoesNotExist:
                    pass
            if changed:
                profile.save()


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password updated successfully.'})