from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from .models import Contractor, Labourer
from .serializers import ContractorSerializer, LabourerSerializer, LabourerListSerializer
from users.permissions import IsHR, IsHROrSupervisor, IsHROrSupervisorOrContractor


class ContractorListCreateView(generics.ListCreateAPIView):
    """GET /api/workforce/contractors/ — List or create contractors."""
    serializer_class = ContractorSerializer
    permission_classes = [IsAuthenticated, IsHROrSupervisor]

    def get_queryset(self):
        user = self.request.user
        qs = Contractor.objects.select_related('user', 'supervisor').all()
        # Supervisor sees only their contractors
        if user.role == 'SUPERVISOR':
            qs = qs.filter(supervisor=user)
        return qs


class ContractorDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/workforce/contractors/<id>/"""
    serializer_class = ContractorSerializer
    permission_classes = [IsAuthenticated, IsHROrSupervisor]

    def get_queryset(self):
        user = self.request.user
        qs = Contractor.objects.all()
        if user.role == 'SUPERVISOR':
            qs = qs.filter(supervisor=user)
        return qs


class LabourerListCreateView(generics.ListCreateAPIView):
    """GET /api/workforce/labourers/ — List or create labourers."""
    permission_classes = [IsAuthenticated, IsHROrSupervisorOrContractor]

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return LabourerListSerializer
        return LabourerSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Labourer.objects.select_related('user', 'contractor__user').all()

        if user.role == 'SUPERVISOR':
            # Supervisor sees labourers of their contractors
            qs = qs.filter(contractor__supervisor=user)
        elif user.role == 'CONTRACTOR':
            try:
                contractor = user.contractor_profile
                qs = qs.filter(contractor=contractor)
            except Contractor.DoesNotExist:
                return Labourer.objects.none()

        # Filter by contractor if query param provided
        contractor_id = self.request.query_params.get('contractor')
        if contractor_id:
            qs = qs.filter(contractor_id=contractor_id)

        active = self.request.query_params.get('active')
        if active is not None:
            qs = qs.filter(is_active=active.lower() == 'true')

        return qs


class LabourerDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/workforce/labourers/<id>/"""
    serializer_class = LabourerSerializer
    permission_classes = [IsAuthenticated, IsHROrSupervisorOrContractor]

    def get_queryset(self):
        user = self.request.user
        qs = Labourer.objects.all()
        if user.role == 'SUPERVISOR':
            qs = qs.filter(contractor__supervisor=user)
        elif user.role == 'CONTRACTOR':
            try:
                qs = qs.filter(contractor=user.contractor_profile)
            except Contractor.DoesNotExist:
                return Labourer.objects.none()
        return qs


class MyProfileView(APIView):
    """GET /api/workforce/my-profile/ — Labourer sees own workforce profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'LABOURER':
            try:
                labourer = user.labourer_profile
                serializer = LabourerSerializer(labourer)
                return Response(serializer.data)
            except Labourer.DoesNotExist:
                return Response({'error': 'Profile not found.'}, status=404)
        elif user.role == 'CONTRACTOR':
            try:
                contractor = user.contractor_profile
                serializer = ContractorSerializer(contractor)
                return Response(serializer.data)
            except Contractor.DoesNotExist:
                return Response({'error': 'Profile not found.'}, status=404)
        return Response({'message': 'Use /api/auth/profile/ for HR/Supervisor profiles.'})