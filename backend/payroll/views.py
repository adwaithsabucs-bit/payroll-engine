# backend/payroll/views.py — REPLACE ENTIRE FILE

from django.utils import timezone
from django.db.models import Sum
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import SupervisorPayroll, ContractorProjectPayroll, DailyLabourerPayroll
from .serializers import (
    SupervisorPayrollSerializer,
    ContractorProjectPayrollSerializer,
    DailyLabourerPayrollSerializer,
)
from workforce.models import Contractor


# ─────────────────────────────────────────────────────────────────────
# SUPERVISOR PAYROLL
# ─────────────────────────────────────────────────────────────────────

class SupervisorPayrollListCreateView(generics.ListCreateAPIView):
    serializer_class   = SupervisorPayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = SupervisorPayroll.objects.select_related('supervisor', 'approved_by')

        if user.role == 'SUPERVISOR':
            qs = qs.filter(supervisor=user)
        elif user.role != 'HR':
            return qs.none()

        month    = self.request.query_params.get('month')
        status_f = self.request.query_params.get('status')
        if month:    qs = qs.filter(month__startswith=month)
        if status_f: qs = qs.filter(status=status_f)
        return qs


class SupervisorPayrollDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SupervisorPayrollSerializer
    permission_classes = [IsAuthenticated]
    queryset           = SupervisorPayroll.objects.all()

    def partial_update(self, request, *args, **kwargs):
        instance   = self.get_object()
        new_status = request.data.get('status')
        if new_status in ('APPROVED', 'PAID') and not instance.approved_by:
            instance.approved_by = request.user
            instance.approved_at = timezone.now()
            instance.save(update_fields=['approved_by', 'approved_at'])
        return super().partial_update(request, *args, **kwargs)


# ─────────────────────────────────────────────────────────────────────
# CONTRACTOR PROJECT PAYROLL
# Supervisor approves to release payment.
# ─────────────────────────────────────────────────────────────────────

class ContractorProjectPayrollListView(generics.ListAPIView):
    serializer_class   = ContractorProjectPayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = ContractorProjectPayroll.objects.select_related(
            'contractor__user', 'contractor__supervisor',
            'project', 'assignment', 'approved_by'
        )

        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            qs = qs.filter(contractor=cp) if cp else qs.none()

        elif user.role == 'SUPERVISOR':
            qs = qs.filter(contractor__supervisor=user)

        elif user.role != 'HR':
            return qs.none()

        project_id  = self.request.query_params.get('project')
        contractor  = self.request.query_params.get('contractor')
        status_f    = self.request.query_params.get('status')

        if project_id: qs = qs.filter(project_id=project_id)
        if contractor: qs = qs.filter(contractor_id=contractor)
        if status_f:   qs = qs.filter(status=status_f)
        return qs.order_by('-created_at')


class ContractorProjectPayrollDetailView(generics.RetrieveUpdateAPIView):
    """
    PATCH {status: "PAID"} → Supervisor or HR approves the payout.
    Also accepts advance_paid, deductions, notes adjustments before paying.
    """
    serializer_class   = ContractorProjectPayrollSerializer
    permission_classes = [IsAuthenticated]
    queryset           = ContractorProjectPayroll.objects.all()

    def partial_update(self, request, *args, **kwargs):
        instance   = self.get_object()
        new_status = request.data.get('status')
        if new_status == 'PAID' and not instance.approved_by:
            instance.approved_by = request.user
            instance.approved_at = timezone.now()
            instance.save(update_fields=['approved_by', 'approved_at'])
        return super().partial_update(request, *args, **kwargs)


# ─────────────────────────────────────────────────────────────────────
# DAILY LABOURER PAYROLL — read-only
# ─────────────────────────────────────────────────────────────────────

class DailyLabourerPayrollListView(generics.ListAPIView):
    serializer_class   = DailyLabourerPayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = DailyLabourerPayroll.objects.select_related(
            'labourer__user', 'temp_labourer', 'contractor__user', 'project', 'attendance'
        )

        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            qs = qs.filter(contractor=cp) if cp else qs.none()

        elif user.role == 'SUPERVISOR':
            my_contractors = Contractor.objects.filter(supervisor=user)
            qs = qs.filter(contractor__in=my_contractors)

        elif user.role != 'HR':
            return qs.none()

        project_id = self.request.query_params.get('project')
        date       = self.request.query_params.get('date')
        contractor = self.request.query_params.get('contractor')
        month      = self.request.query_params.get('month')
        is_temp    = self.request.query_params.get('is_temp')

        if project_id: qs = qs.filter(project_id=project_id)
        if date:       qs = qs.filter(date=date)
        if contractor: qs = qs.filter(contractor_id=contractor)
        if month:      qs = qs.filter(date__startswith=month)
        if is_temp is not None:
            qs = qs.filter(is_temp=is_temp.lower() == 'true')

        return qs.order_by('-date')


class DailyLabourerPayrollDetailView(generics.RetrieveAPIView):
    serializer_class   = DailyLabourerPayrollSerializer
    permission_classes = [IsAuthenticated]
    queryset           = DailyLabourerPayroll.objects.all()


# ─────────────────────────────────────────────────────────────────────
# PAYROLL DASHBOARD — role-aware summary stats
# ─────────────────────────────────────────────────────────────────────

class PayrollDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {}
        today = timezone.now().date()
        this_month = today.strftime('%Y-%m')

        if user.role == 'HR':
            data['supervisor'] = {
                'pending':      SupervisorPayroll.objects.filter(status='PENDING').count(),
                'approved':     SupervisorPayroll.objects.filter(status='APPROVED').count(),
                'paid':         SupervisorPayroll.objects.filter(status='PAID').count(),
                'total_amount': float(SupervisorPayroll.objects.aggregate(t=Sum('total_amount'))['t'] or 0),
            }
            data['contractor'] = {
                'pending': ContractorProjectPayroll.objects.filter(status='PENDING').count(),
                'paid':    ContractorProjectPayroll.objects.filter(status='PAID').count(),
                'total_paid': float(
                    ContractorProjectPayroll.objects.filter(status='PAID')
                    .aggregate(t=Sum('total_amount'))['t'] or 0
                ),
            }
            data['labourer'] = {
                'total_records': DailyLabourerPayroll.objects.count(),
                'total_paid': float(
                    DailyLabourerPayroll.objects.filter(status='PAID')
                    .aggregate(t=Sum('total_amount'))['t'] or 0
                ),
                'today': float(
                    DailyLabourerPayroll.objects.filter(date=today)
                    .aggregate(t=Sum('total_amount'))['t'] or 0
                ),
            }

        elif user.role == 'SUPERVISOR':
            mine = SupervisorPayroll.objects.filter(supervisor=user)
            data['my_salary'] = {
                'pending':      mine.filter(status='PENDING').count(),
                'approved':     mine.filter(status='APPROVED').count(),
                'paid':         mine.filter(status='PAID').count(),
                'total_earned': float(mine.filter(status='PAID').aggregate(t=Sum('total_amount'))['t'] or 0),
                'next_pending': float(mine.filter(status='PENDING').aggregate(t=Sum('total_amount'))['t'] or 0),
            }
            my_contractors = Contractor.objects.filter(supervisor=user)
            con_payrolls   = ContractorProjectPayroll.objects.filter(contractor__in=my_contractors)
            data['contractor_payouts'] = {
                'pending': con_payrolls.filter(status='PENDING').count(),
                'paid':    con_payrolls.filter(status='PAID').count(),
            }
            data['labourer_today'] = float(
                DailyLabourerPayroll.objects.filter(
                    contractor__in=my_contractors, date=today
                ).aggregate(t=Sum('total_amount'))['t'] or 0
            )

        elif user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp:
                my_payrolls = ContractorProjectPayroll.objects.filter(contractor=cp)
                data['my_projects'] = {
                    'pending': my_payrolls.filter(status='PENDING').count(),
                    'paid':    my_payrolls.filter(status='PAID').count(),
                    'total_earned': float(
                        my_payrolls.filter(status='PAID').aggregate(t=Sum('total_amount'))['t'] or 0
                    ),
                    'pending_amount': float(
                        my_payrolls.filter(status='PENDING').aggregate(t=Sum('total_amount'))['t'] or 0
                    ),
                }
                data['labourer_today'] = float(
                    DailyLabourerPayroll.objects.filter(contractor=cp, date=today)
                    .aggregate(t=Sum('total_amount'))['t'] or 0
                )
                data['labourer_month'] = float(
                    DailyLabourerPayroll.objects.filter(
                        contractor=cp, date__startswith=this_month
                    ).aggregate(t=Sum('total_amount'))['t'] or 0
                )

        return Response(data)
