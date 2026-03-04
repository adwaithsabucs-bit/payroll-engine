# attendance/urls.py — REPLACE ENTIRE FILE

from django.urls import path
from . import views

urlpatterns = [
    # Projects
    path('projects/',          views.ProjectListCreateView.as_view(),    name='project-list'),
    path('projects/<int:pk>/', views.ProjectDetailView.as_view(),        name='project-detail'),

    # Temporary Labourers
    path('temp-labourers/',          views.TempLabourerListCreateView.as_view(), name='temp-labourer-list'),
    path('temp-labourers/<int:pk>/', views.TempLabourerDetailView.as_view(),     name='temp-labourer-detail'),

    # Contractor Attendance (by Supervisor)
    path('contractor-attendance/',          views.ContractorAttendanceListCreateView.as_view(), name='contractor-attendance-list'),
    path('contractor-attendance/bulk/',     views.ContractorAttendanceBulkView.as_view(),       name='contractor-attendance-bulk'),
    path('contractor-attendance/<int:pk>/', views.ContractorAttendanceDetailView.as_view(),     name='contractor-attendance-detail'),

    # Labourer Attendance (by Contractor)
    path('labourer-attendance/',          views.LabourerAttendanceListCreateView.as_view(), name='labourer-attendance-list'),
    path('labourer-attendance/bulk/',     views.LabourerAttendanceBulkView.as_view(),       name='labourer-attendance-bulk'),
    path('labourer-attendance/<int:pk>/', views.LabourerAttendanceDetailView.as_view(),     name='labourer-attendance-detail'),

    # HR Monitoring
    path('monitor/', views.AttendanceMonitorView.as_view(), name='attendance-monitor'),
]
