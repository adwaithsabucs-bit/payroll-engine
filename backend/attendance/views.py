# backend/attendance/views.py — REPLACE ENTIRE FILE

from datetime import date as Date, timedelta
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from .models import (
    Project, Period, TemporaryLabourer,
    ContractorAttendance, LabourerAttendance,
    ProjectContractorAssignment,
)
from .serializers import (
    ProjectSerializer, PeriodSerializer, TemporaryLabourerSerializer,
    ContractorAttendanceSerializer, LabourerAttendanceSerializer,
    ProjectContractorAssignmentSerializer,
)
from users.permissions import IsHR
from workforce.models import Contractor, Labourer


# ── Shared helpers ────────────────────────────────────────────────────

def _name(user):
    return f"{user.first_name} {user.last_name}".strip() or user.username


def _empty_stats():
    return {'total': 0, 'present': 0, 'absent': 0, 'half_day': 0, 'leave': 0, 'unmarked': 0}


def _inc(stats, att_status):
    k = (
        'present'  if att_status == 'PRESENT'  else
        'absent'   if att_status == 'ABSENT'   else
        'half_day' if att_status == 'HALF_DAY' else
        'leave'    if att_status == 'LEAVE'    else
        'unmarked'
    )
    stats[k] += 1


# ── PROJECTS ─────────────────────────────────────────────────────────

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


# ── PERIODS ──────────────────────────────────────────────────────────

class PeriodListCreateView(generics.ListCreateAPIView):
    serializer_class   = PeriodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user       = self.request.user
        project_id = self.request.query_params.get('project')
        qs         = Period.objects.all()
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


# ── TEMPORARY LABOURERS ───────────────────────────────────────────────

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


# ── PROJECT CONTRACTOR ASSIGNMENTS ────────────────────────────────────

class ProjectContractorAssignmentListCreateView(generics.ListCreateAPIView):
    """
    GET  → list assignments (filtered by role)
    POST → Supervisor or HR assigns a contractor to a project
           Auto-creates a ContractorProjectPayroll (PENDING) via signal.
    """
    serializer_class   = ProjectContractorAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = ProjectContractorAssignment.objects.select_related(
            'project', 'contractor__user', 'assigned_by'
        )
        if user.role == 'SUPERVISOR':
            qs = qs.filter(project__supervisor=user)
        elif user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            qs = qs.filter(contractor=cp) if cp else qs.none()
        elif user.role != 'HR':
            return qs.none()

        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class ProjectContractorAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ProjectContractorAssignmentSerializer
    permission_classes = [IsAuthenticated]
    queryset           = ProjectContractorAssignment.objects.all()


# ── CONTRACTOR ATTENDANCE ─────────────────────────────────────────────

class ContractorAttendanceListCreateView(generics.ListCreateAPIView):
    serializer_class   = ContractorAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = ContractorAttendance.objects.select_related('contractor__user', 'project')

        if user.role == 'SUPERVISOR':
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
        if contractor_id: qs = qs.filter(contractor_id=contractor_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(marked_by=self.request.user)


class ContractorAttendanceBulkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['SUPERVISOR', 'HR']:
            return Response({'error': 'Permission denied.'}, status=403)

        records = request.data.get('records', [])
        created, updated = 0, 0

        with transaction.atomic():
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
                if was_created: created += 1
                else: updated += 1

        return Response({'created': created, 'updated': updated})


class ContractorAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ContractorAttendanceSerializer
    permission_classes = [IsAuthenticated]
    queryset           = ContractorAttendance.objects.all()


# ── LABOURER ATTENDANCE ───────────────────────────────────────────────

class LabourerAttendanceListCreateView(generics.ListCreateAPIView):
    serializer_class   = LabourerAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = LabourerAttendance.objects.select_related('labourer__user', 'temp_labourer', 'project')

        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if cp:
                qs = qs.filter(Q(labourer__contractor=cp) | Q(temp_labourer__contractor=cp))
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ['CONTRACTOR', 'HR']:
            return Response({'error': 'Permission denied.'}, status=403)

        records  = request.data.get('records', [])
        created  = 0
        updated  = 0

        with transaction.atomic():
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
                    obj, was_created = LabourerAttendance.objects.update_or_create(
                        temp_labourer_id=rec['temp_labourer'],
                        project_id=rec['project'],
                        date=rec['date'],
                        defaults=defaults
                    )
                else:
                    continue

                if was_created: created += 1
                else: updated += 1

        # Auto-cleanup stale temp labourers
        cleaned = 0
        if request.user.role == 'CONTRACTOR':
            try:
                today = Date.today()
                cp    = Contractor.objects.filter(user=request.user).first()
                if cp:
                    stale_ids = set(
                        LabourerAttendance.objects
                        .filter(temp_labourer__contractor=cp, date__lt=today)
                        .values_list('temp_labourer_id', flat=True)
                    )
                    if stale_ids:
                        deleted, _ = TemporaryLabourer.objects.filter(
                            id__in=stale_ids, contractor=cp
                        ).delete()
                        cleaned = deleted
            except Exception as e:
                print(f"[cleanup] error: {e}")

        return Response({'created': created, 'updated': updated, 'temp_cleaned': cleaned})


class LabourerAttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LabourerAttendanceSerializer
    permission_classes = [IsAuthenticated]
    queryset           = LabourerAttendance.objects.all()


# ── ATTENDANCE SUMMARY ────────────────────────────────────────────────

class AttendanceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        date_str   = request.query_params.get('date')
        user       = request.user

        try:
            target_date = Date.fromisoformat(date_str) if date_str else Date.today()
            proj        = Project.objects.get(pk=project_id)
        except (ValueError, TypeError, Project.DoesNotExist):
            return Response({'error': 'Invalid project or date.'}, status=400)

        if user.role == 'SUPERVISOR':
            contractors = Contractor.objects.filter(supervisor=user, is_active=True).select_related('user')
            stats, details = _empty_stats(), []
            stats['total'] = contractors.count()
            for c in contractors:
                att = ContractorAttendance.objects.filter(contractor=c, project=proj, date=target_date).first()
                st  = att.status if att else None
                _inc(stats, st)
                details.append({'id': c.id, 'name': _name(c.user), 'company': c.company_name or '', 'status': st})
            return Response({'summary': stats, 'details': details})

        if user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            if not cp:
                return Response({'summary': _empty_stats(), 'details': []})
            fixed  = Labourer.objects.filter(contractor=cp, is_active=True).select_related('user')
            temps  = TemporaryLabourer.objects.filter(contractor=cp)
            stats, details = _empty_stats(), []
            stats['total'] = fixed.count() + temps.count()
            for lab in fixed:
                att = LabourerAttendance.objects.filter(labourer=lab, project=proj, date=target_date).first()
                st  = att.status if att else None
                _inc(stats, st)
                details.append({'id': lab.id, 'name': _name(lab.user), 'type': 'fixed', 'status': st, 'daily_wage': str(lab.daily_wage)})
            for tl in temps:
                att = LabourerAttendance.objects.filter(temp_labourer=tl, project=proj, date=target_date).first()
                st  = att.status if att else None
                _inc(stats, st)
                details.append({'id': tl.id, 'name': tl.name + ' (Temp)', 'type': 'temp', 'status': st, 'daily_wage': str(tl.daily_wage)})
            return Response({'summary': stats, 'details': details})

        return Response({'summary': _empty_stats(), 'details': []})


# ── HR MONITOR ────────────────────────────────────────────────────────

class AttendanceMonitorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'HR':
            return Response({'error': 'HR only.'}, status=403)

        date_str = request.query_params.get('date', str(Date.today()))
        try:
            target_date = Date.fromisoformat(date_str)
        except ValueError:
            target_date = Date.today()

        projects = Project.objects.filter(status='ACTIVE').select_related('supervisor')
        result   = []

        for proj in projects:
            sv = proj.supervisor
            contractors = (
                Contractor.objects.filter(supervisor=sv, is_active=True).select_related('user')
                if sv else Contractor.objects.none()
            )

            con_stats, con_details = _empty_stats(), []
            lab_stats, lab_details = _empty_stats(), []
            con_stats['total'] = contractors.count()

            for c in contractors:
                att = ContractorAttendance.objects.filter(contractor=c, project=proj, date=target_date).first()
                st  = att.status if att else None
                _inc(con_stats, st)

                fixed_labs = Labourer.objects.filter(contractor=c, is_active=True).select_related('user')
                temp_labs  = TemporaryLabourer.objects.filter(contractor=c)

                for lab in fixed_labs:
                    la    = LabourerAttendance.objects.filter(labourer=lab, project=proj, date=target_date).first()
                    la_st = la.status if la else None
                    _inc(lab_stats, la_st)
                    lab_stats['total'] += 1
                    lab_details.append({'id': lab.id, 'name': _name(lab.user), 'type': 'fixed', 'status': la_st, 'daily_wage': str(lab.daily_wage), 'contractor': _name(c.user)})

                for tl in temp_labs:
                    la    = LabourerAttendance.objects.filter(temp_labourer=tl, project=proj, date=target_date).first()
                    la_st = la.status if la else None
                    _inc(lab_stats, la_st)
                    lab_stats['total'] += 1
                    lab_details.append({'id': tl.id, 'name': tl.name + ' (Temp)', 'type': 'temp', 'status': la_st, 'daily_wage': str(tl.daily_wage), 'contractor': _name(c.user)})

                con_details.append({'id': c.id, 'name': _name(c.user), 'company': c.company_name or '', 'status': st, 'labourer_count': fixed_labs.count() + temp_labs.count()})

            result.append({
                'project_id':         proj.id,
                'project_name':       proj.name,
                'supervisor_name':    _name(sv) if sv else '—',
                'date':               str(target_date),
                'contractor_summary': con_stats,
                'contractor_details': con_details,
                'labourer_summary':   lab_stats,
                'labourer_details':   lab_details,
            })

        return Response(result)
