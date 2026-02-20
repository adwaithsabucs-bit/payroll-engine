from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum
from .models import PayrollPeriod, Payroll
from .serializers import PayrollPeriodSerializer, PayrollSerializer, PayrollApproveSerializer
from users.permissions import IsHR
from workforce.models import Labourer


class PayrollPeriodListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/payroll/periods/ — List or create payroll periods."""
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsAuthenticated, IsHR]
    queryset = PayrollPeriod.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PayrollPeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/payroll/periods/<id>/"""
    serializer_class = PayrollPeriodSerializer
    permission_classes = [IsAuthenticated, IsHR]
    queryset = PayrollPeriod.objects.all()


class GeneratePayrollView(APIView):
    """
    POST /api/payroll/periods/<id>/generate/
    HR triggers payroll generation for ALL labourers in a period.
    Creates or recalculates Payroll records.
    """
    permission_classes = [IsAuthenticated, IsHR]

    def post(self, request, pk):
        try:
            period = PayrollPeriod.objects.get(pk=pk)
        except PayrollPeriod.DoesNotExist:
            return Response({'error': 'Period not found.'}, status=404)

        if period.is_closed:
            return Response({'error': 'Cannot regenerate payroll for a closed period.'}, status=400)

        labourers = Labourer.objects.filter(is_active=True)
        created_count = 0
        updated_count = 0

        for labourer in labourers:
            payroll, created = Payroll.objects.get_or_create(
                period=period,
                labourer=labourer,
                defaults={'payment_status': 'PENDING'}
            )
            if not created:
                # Recalculate
                payroll.calculate_payroll()
                payroll.save()
                updated_count += 1
            else:
                created_count += 1

        return Response({
            'message': f'Payroll generated: {created_count} created, {updated_count} updated.',
            'period': period.name,
            'total_labourers': labourers.count()
        })


class PayrollListView(generics.ListAPIView):
    """GET /api/payroll/ — List payroll records (role-filtered)."""
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related('period', 'labourer__user').all()

        if user.role == 'LABOURER':
            try:
                qs = qs.filter(labourer=user.labourer_profile)
            except Exception:
                return Payroll.objects.none()
        elif user.role == 'SUPERVISOR':
            qs = qs.filter(labourer__contractor__supervisor=user)
        elif user.role == 'CONTRACTOR':
            try:
                qs = qs.filter(labourer__contractor=user.contractor_profile)
            except Exception:
                return Payroll.objects.none()

        period_id = self.request.query_params.get('period')
        if period_id:
            qs = qs.filter(period_id=period_id)

        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status=payment_status)

        return qs


class PayrollDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/payroll/<id>/"""
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.all()
        if user.role == 'LABOURER':
            try:
                qs = qs.filter(labourer=user.labourer_profile)
            except Exception:
                return Payroll.objects.none()
        return qs

    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT']:
            return [IsAuthenticated(), IsHR()]
        return [IsAuthenticated()]


class PayrollApproveView(APIView):
    """PATCH /api/payroll/<id>/approve/ — HR approves or marks as paid."""
    permission_classes = [IsAuthenticated, IsHR]

    def patch(self, request, pk):
        try:
            payroll = Payroll.objects.get(pk=pk)
        except Payroll.DoesNotExist:
            return Response({'error': 'Payroll not found.'}, status=404)

        serializer = PayrollApproveSerializer(payroll, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('payment_status')
        if new_status == 'APPROVED' and not payroll.approved_at:
            payroll.approved_by = request.user
            payroll.approved_at = timezone.now()
        elif new_status == 'PAID' and not payroll.paid_at:
            payroll.paid_at = timezone.now()

        serializer.save()
        return Response(PayrollSerializer(payroll).data)


class PayrollDashboardView(APIView):
    """GET /api/payroll/dashboard/ — HR summary stats."""
    permission_classes = [IsAuthenticated, IsHR]

    def get(self, request):
        from workforce.models import Labourer
        from attendance.models import Attendance

        total_labourers = Labourer.objects.filter(is_active=True).count()
        total_periods = PayrollPeriod.objects.count()
        pending_payrolls = Payroll.objects.filter(payment_status='PENDING').count()
        approved_payrolls = Payroll.objects.filter(payment_status='APPROVED').count()
        paid_payrolls = Payroll.objects.filter(payment_status='PAID').count()
        pending_attendance = Attendance.objects.filter(approval_status='PENDING').count()

        total_wage_pending = Payroll.objects.filter(
            payment_status='APPROVED'
        ).aggregate(total=Sum('total_salary'))['total'] or 0

        return Response({
            'total_labourers': total_labourers,
            'total_periods': total_periods,
            'pending_payrolls': pending_payrolls,
            'approved_payrolls': approved_payrolls,
            'paid_payrolls': paid_payrolls,
            'pending_attendance_approvals': pending_attendance,
            'total_approved_wage_payable': float(total_wage_pending),
        })