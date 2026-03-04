from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .models import Contractor, Labourer
from .serializers import ContractorSerializer, LabourerSerializer
from users.models import CustomUser

class ContractorListCreateView(generics.ListCreateAPIView):
    serializer_class   = ContractorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = Contractor.objects.select_related('user', 'supervisor')
        supervisor_project = self.request.query_params.get('supervisor_project')
        if supervisor_project:
            from attendance.models import Project
            try:
                project = Project.objects.get(pk=supervisor_project)
                if project.supervisor:
                    qs = qs.filter(supervisor=project.supervisor)
            except Exception:
                pass
        supervisor_id = self.request.query_params.get('supervisor')
        if supervisor_id:
            qs = qs.filter(supervisor_id=supervisor_id)
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        me = self.request.query_params.get('me')
        if me:
            qs = qs.filter(user=user)
        if user.role == 'SUPERVISOR':
            qs = qs.filter(supervisor=user)
        elif user.role == 'CONTRACTOR':
            qs = qs.filter(user=user)
        return qs

class ContractorDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = ContractorSerializer
    permission_classes = [IsAuthenticated]
    queryset           = Contractor.objects.all()

class LabourerListCreateView(generics.ListCreateAPIView):
    serializer_class   = LabourerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = Labourer.objects.select_related('user', 'contractor__user')
        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        contractor_id = self.request.query_params.get('contractor')
        if contractor_id:
            qs = qs.filter(contractor_id=contractor_id)
        if user.role == 'CONTRACTOR':
            contractor = Contractor.objects.filter(user=user).first()
            if contractor:
                qs = qs.filter(contractor=contractor)
            else:
                return qs.none()
        elif user.role == 'SUPERVISOR':
            contractors = Contractor.objects.filter(supervisor=user)
            qs = qs.filter(contractor__in=contractors)
        return qs

class LabourerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LabourerSerializer
    permission_classes = [IsAuthenticated]
    queryset           = Labourer.objects.all()

class WorkforceSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {}
        if user.role == 'HR':
            data['total_supervisors'] = CustomUser.objects.filter(role='SUPERVISOR').count()
            data['total_contractors'] = Contractor.objects.count()
            data['total_labourers']   = Labourer.objects.count()
        elif user.role == 'SUPERVISOR':
            my_contractors = Contractor.objects.filter(supervisor=user)
            data['my_contractors'] = my_contractors.count()
            data['my_labourers']   = Labourer.objects.filter(contractor__in=my_contractors).count()
        elif user.role == 'CONTRACTOR':
            cp = Contractor.objects.filter(user=user).first()
            data['my_labourers'] = Labourer.objects.filter(contractor=cp).count() if cp else 0
        return Response(data)