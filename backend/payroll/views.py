# payroll/views.py — REPLACE ENTIRE FILE

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from .models import SupervisorPayroll, ContractorPayroll, LabourerPayroll
from .serializers import (
    SupervisorPayrollSerializer, ContractorPayrollSerializer, LabourerPayrollSerializer
)
from attendance.models import Project, Period
from workforce.models import Contractor, Labourer
from users.models import CustomUser


# ── SUPERVISOR PAYROLL ──────────────────────────────────────────
class SupervisorPayrollListCreateView(generics.ListCreateAPIView):
    serializer_class   = SupervisorPayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = SupervisorPayroll.objects.select_related('supervisor', 'project')
        if user.role == 'SUPERVISOR':
            qs = qs.filter(supervisor=user)
        elif user.role != 'HR':
            return qs.none()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SupervisorPayrollDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SupervisorPayrollSerializer
    permission_classes = [IsAuthenticated]
    queryset           = SupervisorPayroll.objects.all()


# ── CONTRACTOR PAYROLL ──────────────────────────────────────────
class ContractorPayrollListCreateView(generics.ListCreateAPIView):
    serializer_class   = ContractorPayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ContractorPayroll.objects.select_related('contractor__user', 'project', 'period')
        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp:
                qs = qs.filter(contractor=cp)
            else:
                return qs.none()
        elif user.role == 'SUPERVISOR':
            qs = qs.filter(project__supervisor=user)
        elif user.role != 'HR':
            return qs.none()

        project_id = self.request.query_params.get('project')
        period_id  = self.request.query_params.get('period')
        if project_id: qs = qs.filter(project_id=project_id)
        if period_id:  qs = qs.filter(period_id=period_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ContractorPayrollDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ContractorPayrollSerializer
    permission_classes = [IsAuthenticated]
    queryset           = ContractorPayroll.objects.all()


# ── LABOURER PAYROLL ────────────────────────────────────────────
class LabourerPayrollListCreateView(generics.ListCreateAPIView):
    serializer_class   = LabourerPayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = LabourerPayroll.objects.select_related(
            'labourer__user', 'temp_labourer', 'project', 'period'
        )
        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp:
                qs = qs.filter(
                    Q(labourer__contractor=cp) | Q(temp_labourer__contractor=cp)
                )
            else:
                return qs.none()
        elif user.role == 'SUPERVISOR':
            qs = qs.filter(project__supervisor=user)
        elif user.role != 'HR':
            return qs.none()

        project_id = self.request.query_params.get('project')
        period_id  = self.request.query_params.get('period')
        if project_id: qs = qs.filter(project_id=project_id)
        if period_id:  qs = qs.filter(period_id=period_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class LabourerPayrollDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LabourerPayrollSerializer
    permission_classes = [IsAuthenticated]
    queryset           = LabourerPayroll.objects.all()


class LabourerPayrollAutoCalculateView(APIView):
    """POST /api/payroll/labourer/<id>/calculate/ — auto-calc from attendance."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            payroll = LabourerPayroll.objects.get(pk=pk)
        except LabourerPayroll.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        payroll.auto_calculate()
        return Response(LabourerPayrollSerializer(payroll).data)


# ── HR DASHBOARD ────────────────────────────────────────────────
class PayrollDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = self.request.user
        data = {}

        if user.role == 'HR':
            data['supervisor_payrolls'] = {
                'total':    SupervisorPayroll.objects.count(),
                'pending':  SupervisorPayroll.objects.filter(status='PENDING').count(),
                'approved': SupervisorPayroll.objects.filter(status='APPROVED').count(),
                'paid':     SupervisorPayroll.objects.filter(status='PAID').count(),
                'total_amount': SupervisorPayroll.objects.aggregate(t=Sum('total_amount'))['t'] or 0,
            }
            data['contractor_payrolls'] = {
                'total':    ContractorPayroll.objects.count(),
                'pending':  ContractorPayroll.objects.filter(status='PENDING').count(),
                'approved': ContractorPayroll.objects.filter(status='APPROVED').count(),
                'paid':     ContractorPayroll.objects.filter(status='PAID').count(),
                'total_amount': ContractorPayroll.objects.aggregate(t=Sum('total_amount'))['t'] or 0,
            }
            data['labourer_payrolls'] = {
                'total':    LabourerPayroll.objects.count(),
                'pending':  LabourerPayroll.objects.filter(status='PENDING').count(),
                'approved': LabourerPayroll.objects.filter(status='APPROVED').count(),
                'paid':     LabourerPayroll.objects.filter(status='PAID').count(),
                'total_amount': LabourerPayroll.objects.aggregate(t=Sum('total_amount'))['t'] or 0,
            }
            data['active_projects'] = Project.objects.filter(status='ACTIVE').count()

        elif user.role == 'SUPERVISOR':
            my_payrolls = SupervisorPayroll.objects.filter(supervisor=user)
            data['my_payrolls'] = {
                'total': my_payrolls.count(),
                'total_earned': my_payrolls.aggregate(t=Sum('total_amount'))['t'] or 0,
                'pending': my_payrolls.filter(status='PENDING').count(),
            }
            data['projects'] = Project.objects.filter(supervisor=user).count()

        elif user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp:
                my_payrolls = ContractorPayroll.objects.filter(contractor=cp)
                data['my_payrolls'] = {
                    'total': my_payrolls.count(),
                    'total_earned': my_payrolls.aggregate(t=Sum('total_amount'))['t'] or 0,
                    'pending': my_payrolls.filter(status='PENDING').count(),
                }

        return Response(data)
