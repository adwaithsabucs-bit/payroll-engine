# attendance/views.py — REPLACE ENTIRE FILE

from datetime import date
from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import Project, Period, TemporaryLabourer, ContractorAttendance, LabourerAttendance
from .serializers import (
    ProjectSerializer, PeriodSerializer, TemporaryLabourerSerializer,
    ContractorAttendanceSerializer, LabourerAttendanceSerializer
)
from users.permissions import IsHR
from workforce.models import Contractor, Labourer


# ── PROJECTS ────────────────────────────────────────────────────
class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class   = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'HR':
            return Project.objects.all()
        if user.role == 'SUPERVISOR':
            return Project.objects.filter(supervisor=user)
        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp and cp.supervisor:
                return Project.objects.filter(supervisor=cp.supervisor)
        return Project.objects.none()

    def perform_create(self, serializer):
        serializer.save()


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ProjectSerializer
    permission_classes = [IsAuthenticated]
    queryset           = Project.objects.all()


# ── PERIODS ─────────────────────────────────────────────────────
class PeriodListCreateView(generics.ListCreateAPIView):
    serializer_class   = PeriodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        project_id = self.request.query_params.get('project')
        qs = Period.objects.all()
        if user.role == 'SUPERVISOR':
            qs = qs.filter(project__supervisor=user)
        elif user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp and cp.supervisor:
                qs = qs.filter(project__supervisor=cp.supervisor)
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class PeriodDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = PeriodSerializer
    permission_classes = [IsAuthenticated]
    queryset           = Period.objects.all()


# ── TEMPORARY LABOURERS ─────────────────────────────────────────
class TempLabourerListCreateView(generics.ListCreateAPIView):
    serializer_class   = TemporaryLabourerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'HR':
            return TemporaryLabourer.objects.all()
        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp:
                return TemporaryLabourer.objects.filter(contractor=cp)
        return TemporaryLabourer.objects.none()


class TempLabourerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = TemporaryLabourerSerializer
    permission_classes = [IsAuthenticated]
    queryset           = TemporaryLabourer.objects.all()


# ── CONTRACTOR ATTENDANCE (marked by Supervisors) ────────────────
class ContractorAttendanceListCreateView(generics.ListCreateAPIView):
    serializer_class   = ContractorAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = ContractorAttendance.objects.select_related('contractor__user', 'project')

        if user.role == 'SUPERVISOR':
            # Only attendance for projects this supervisor manages
            qs = qs.filter(project__supervisor=user)
        elif user.role == 'HR':
            pass  # see all
        else:
            return qs.none()

        project_id  = self.request.query_params.get('project')
        date_filter = self.request.query_params.get('date')
        contractor_id = self.request.query_params.get('contractor')

        if project_id:    qs = qs.filter(project_id=project_id)
        if date_filter:   qs = qs.filter(date=date_filter)
        if contractor_id: qs = qs.filter(contractor_id=contractor_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)


class ContractorAttendanceBulkView(APIView):
    """POST bulk attendance records for multiple contractors on one date."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['SUPERVISOR', 'HR']:
            return Response({'error': 'Permission denied.'}, status=403)

        records = request.data.get('records', [])
        created, updated = 0, 0

        for rec in records:
            obj, was_created = ContractorAttendance.objects.update_or_create(
                contractor_id=rec['contractor'],
                project_id=rec['project'],
                date=rec['date'],
                defaults={
                    'status':    rec.get('status', 'PRESENT'),
                    'notes':     rec.get('notes', ''),
                    'marked_by': request.user,
                }
            )
            if was_created:
                created += 1
            else:
                updated += 1

        return Response({'created': created, 'updated': updated})


class ContractorAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ContractorAttendanceSerializer
    permission_classes = [IsAuthenticated]
    queryset           = ContractorAttendance.objects.all()


# ── LABOURER ATTENDANCE (marked by Contractors) ──────────────────
class LabourerAttendanceListCreateView(generics.ListCreateAPIView):
    serializer_class   = LabourerAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = LabourerAttendance.objects.select_related(
            'labourer__user', 'temp_labourer', 'project'
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
        elif user.role == 'HR':
            pass
        else:
            return qs.none()

        project_id    = self.request.query_params.get('project')
        date_filter   = self.request.query_params.get('date')
        contractor_id = self.request.query_params.get('contractor')

        if project_id:    qs = qs.filter(project_id=project_id)
        if date_filter:   qs = qs.filter(date=date_filter)
        if contractor_id:
            qs = qs.filter(
                Q(labourer__contractor_id=contractor_id) |
                Q(temp_labourer__contractor_id=contractor_id)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)


class LabourerAttendanceBulkView(APIView):
    """POST bulk attendance for multiple labourers on one date."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['CONTRACTOR', 'HR']:
            return Response({'error': 'Permission denied.'}, status=403)

        records = request.data.get('records', [])
        created, updated = 0, 0

        for rec in records:
            defaults = {
                'status':         rec.get('status', 'PRESENT'),
                'overtime_hours': rec.get('overtime_hours', 0),
                'notes':          rec.get('notes', ''),
                'marked_by':      request.user,
            }
            if rec.get('labourer'):
                obj, was_created = LabourerAttendance.objects.update_or_create(
                    labourer_id=rec['labourer'],
                    project_id=rec['project'],
                    date=rec['date'],
                    defaults=defaults
                )
            elif rec.get('temp_labourer'):
                defaults['temp_labourer_id'] = rec['temp_labourer']
                obj, was_created = LabourerAttendance.objects.update_or_create(
                    temp_labourer_id=rec['temp_labourer'],
                    project_id=rec['project'],
                    date=rec['date'],
                    defaults=defaults
                )
            else:
                continue

            if was_created:
                created += 1
            else:
                updated += 1

        return Response({'created': created, 'updated': updated})


class LabourerAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LabourerAttendanceSerializer
    permission_classes = [IsAuthenticated]
    queryset           = LabourerAttendance.objects.all()


# ── HR MONITORING DASHBOARD ──────────────────────────────────────
class AttendanceMonitorView(APIView):
    """HR-only: overview of attendance compliance across all supervisors."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'HR':
            return Response({'error': 'HR only.'}, status=403)

        today       = date.today()
        date_filter = request.query_params.get('date', str(today))

        projects = Project.objects.filter(status='ACTIVE').select_related('supervisor')
        summary  = []

        for project in projects:
            # Contractors assigned to this project's supervisor
            contractors = Contractor.objects.filter(supervisor=project.supervisor)
            total_contractors = contractors.count()
            marked_contractors = ContractorAttendance.objects.filter(
                project=project, date=date_filter
            ).count()

            # Labourers across all these contractors
            labourers = Labourer.objects.filter(contractor__in=contractors)
            temp_lab  = TemporaryLabourer.objects.filter(contractor__in=contractors)
            total_labourers  = labourers.count() + temp_lab.count()
            marked_labourers = LabourerAttendance.objects.filter(
                project=project, date=date_filter
            ).count()

            summary.append({
                'project_id':         project.id,
                'project_name':       project.name,
                'supervisor_id':      project.supervisor_id,
                'supervisor_name':    str(project.supervisor) if project.supervisor else '—',
                'contractors_total':  total_contractors,
                'contractors_marked': marked_contractors,
                'labourers_total':    total_labourers,
                'labourers_marked':   marked_labourers,
                'date':               date_filter,
            })

        return Response(summary)
