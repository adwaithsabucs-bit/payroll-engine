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
    """
    GET/PATCH/DELETE /api/auth/users/<id>/
    Supports username editing.
    If an HR admin updates company_name, it propagates to ALL users.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsHR]
    queryset = CustomUser.objects.all()

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data.copy()

        # Determine if this is the primary HR admin (lowest id among HR users)
        first_hr = CustomUser.objects.filter(role='HR').order_by('id').first()
        is_primary_admin = first_hr and instance.id == first_hr.id

        # Extract company_name update if provided by primary admin
        new_company = data.get('company_name', None)

        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()

        # If primary admin changed company_name, propagate to ALL users
        if is_primary_admin and new_company is not None:
            CustomUser.objects.all().exclude(pk=instance.pk).update(company_name=new_company)

        return Response(UserSerializer(updated_user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password updated.'})
