from django.shortcuts import render

# Create your views here.
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, Q
from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceApprovalSerializer
from users.permissions import IsHR, IsHROrSupervisor
from workforce.models import Labourer


class AttendanceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/attendance/          — List attendance records
    POST /api/attendance/          — Mark attendance (Supervisor)
    """
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.select_related('labourer__user', 'marked_by', 'approved_by').all()

        # Role-based filtering
        if user.role == 'SUPERVISOR':
            qs = qs.filter(labourer__contractor__supervisor=user)
        elif user.role == 'CONTRACTOR':
            try:
                qs = qs.filter(labourer__contractor=user.contractor_profile)
            except Exception:
                return Attendance.objects.none()
        elif user.role == 'LABOURER':
            try:
                qs = qs.filter(labourer=user.labourer_profile)
            except Exception:
                return Attendance.objects.none()

        # Query param filters
        labourer_id = self.request.query_params.get('labourer')
        if labourer_id:
            qs = qs.filter(labourer_id=labourer_id)

        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        approval_status = self.request.query_params.get('approval_status')
        if approval_status:
            qs = qs.filter(approval_status=approval_status)

        return qs

    def perform_create(self, serializer):
        # Validate supervisor can mark this labourer
        user = self.request.user
        labourer = serializer.validated_data['labourer']
        if user.role == 'SUPERVISOR':
            if labourer.contractor and labourer.contractor.supervisor != user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only mark attendance for labourers under your contractors.")
        serializer.save(marked_by=self.request.user)

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsHROrSupervisor()]
        return [IsAuthenticated()]


class AttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/attendance/<id>/"""
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Attendance.objects.all()
        if user.role == 'SUPERVISOR':
            qs = qs.filter(labourer__contractor__supervisor=user)
        elif user.role == 'LABOURER':
            try:
                qs = qs.filter(labourer=user.labourer_profile)
            except Exception:
                return Attendance.objects.none()
        return qs

    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'DELETE']:
            return [IsAuthenticated(), IsHROrSupervisor()]
        return [IsAuthenticated()]


class AttendanceApproveView(APIView):
    """
    PATCH /api/attendance/<id>/approve/
    HR approves or rejects a pending attendance record.
    """
    permission_classes = [IsAuthenticated, IsHR]

    def patch(self, request, pk):
        try:
            attendance = Attendance.objects.get(pk=pk)
        except Attendance.DoesNotExist:
            return Response({'error': 'Attendance record not found.'}, status=404)

        serializer = AttendanceApprovalSerializer(attendance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(approved_by=request.user)
        return Response(AttendanceSerializer(attendance).data)


class AttendanceSummaryView(APIView):
    """
    GET /api/attendance/summary/?labourer=<id>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Returns aggregate stats for payroll calculation preview.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        labourer_id = request.query_params.get('labourer')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not labourer_id:
            return Response({'error': 'labourer param required.'}, status=400)

        qs = Attendance.objects.filter(
            labourer_id=labourer_id,
            approval_status='APPROVED'
        )
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        present = qs.filter(status='PRESENT').count()
        half_day = qs.filter(status='HALF_DAY').count()
        absent = qs.filter(status='ABSENT').count()
        total_overtime = qs.aggregate(total=Sum('overtime_hours'))['total'] or 0
        effective_days = present + (half_day * 0.5)

        try:
            labourer = Labourer.objects.get(pk=labourer_id)
            daily_wage = float(labourer.daily_wage)
            overtime_rate = float(labourer.overtime_rate)
            projected_salary = (effective_days * daily_wage) + (float(total_overtime) * overtime_rate)
        except Labourer.DoesNotExist:
            projected_salary = 0

        return Response({
            'labourer_id': labourer_id,
            'present_days': present,
            'half_days': half_day,
            'absent_days': absent,
            'effective_days': effective_days,
            'total_overtime_hours': float(total_overtime),
            'projected_salary': round(projected_salary, 2),
        })