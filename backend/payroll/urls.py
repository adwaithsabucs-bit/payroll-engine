# backend/payroll/urls.py — REPLACE ENTIRE FILE

from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.PayrollDashboardView.as_view(), name='payroll-dashboard'),

    # Supervisor payroll (monthly, HR approves)
    path('supervisor/',          views.SupervisorPayrollListCreateView.as_view(), name='supervisor-payroll-list'),
    path('supervisor/<int:pk>/', views.SupervisorPayrollDetailView.as_view(),     name='supervisor-payroll-detail'),

    # Contractor project payroll (auto-created on assignment, supervisor approves)
    path('contractor/',          views.ContractorProjectPayrollListView.as_view(),   name='contractor-payroll-list'),
    path('contractor/<int:pk>/', views.ContractorProjectPayrollDetailView.as_view(), name='contractor-payroll-detail'),

    # Labourer daily payroll (auto-created on attendance, read-only)
    path('labourer/',          views.DailyLabourerPayrollListView.as_view(),   name='labourer-payroll-list'),
    path('labourer/<int:pk>/', views.DailyLabourerPayrollDetailView.as_view(), name='labourer-payroll-detail'),
]
