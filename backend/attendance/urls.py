# backend/attendance/urls.py — REPLACE ENTIRE FILE

from django.urls import path
from . import views

urlpatterns = [
    # Projects
    path('projects/',        views.ProjectListCreateView.as_view(),  name='project-list'),
    path('projects/<int:pk>/', views.ProjectDetailView.as_view(),    name='project-detail'),

    # Periods
    path('periods/',         views.PeriodListCreateView.as_view(),   name='period-list'),
    path('periods/<int:pk>/', views.PeriodDetailView.as_view(),      name='period-detail'),

    # Temp labourers
    path('temp-labourers/',         views.TempLabourerListCreateView.as_view(), name='temp-labourer-list'),
    path('temp-labourers/<int:pk>/', views.TempLabourerDetailView.as_view(),    name='temp-labourer-detail'),

    # Project ↔ Contractor assignments (trigger auto contractor payroll)
    path('assignments/',         views.ProjectContractorAssignmentListCreateView.as_view(), name='assignment-list'),
    path('assignments/<int:pk>/', views.ProjectContractorAssignmentDetailView.as_view(),    name='assignment-detail'),

    # Contractor attendance (tracking only — no longer affects pay)
    path('contractor/',          views.ContractorAttendanceListCreateView.as_view(), name='contractor-att-list'),
    path('contractor/bulk/',     views.ContractorAttendanceBulkView.as_view(),       name='contractor-att-bulk'),
    path('contractor/<int:pk>/', views.ContractorAttendanceDetailView.as_view(),     name='contractor-att-detail'),

    # Labourer attendance (triggers auto daily payroll via signal)
    path('labourer/',          views.LabourerAttendanceListCreateView.as_view(), name='labourer-att-list'),
    path('labourer/bulk/',     views.LabourerAttendanceBulkView.as_view(),       name='labourer-att-bulk'),
    path('labourer/<int:pk>/', views.LabourerAttendanceDetailView.as_view(),     name='labourer-att-detail'),

    # Summary / monitor
    path('summary/', views.AttendanceSummaryView.as_view(), name='attendance-summary'),
    path('monitor/', views.AttendanceMonitorView.as_view(), name='attendance-monitor'),
]
