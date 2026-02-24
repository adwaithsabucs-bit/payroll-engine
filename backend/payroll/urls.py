# payroll/urls.py — REPLACE ENTIRE FILE

from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.PayrollDashboardView.as_view(), name='payroll-dashboard'),

    # Supervisor Payroll (monthly salary)
    path('supervisor/',          views.SupervisorPayrollListCreateView.as_view(), name='supervisor-payroll-list'),
    path('supervisor/<int:pk>/', views.SupervisorPayrollDetailView.as_view(),     name='supervisor-payroll-detail'),

    # Contractor Payroll (per project)
    path('contractor/',          views.ContractorPayrollListCreateView.as_view(), name='contractor-payroll-list'),
    path('contractor/<int:pk>/', views.ContractorPayrollDetailView.as_view(),     name='contractor-payroll-detail'),

    # Labourer Payroll (per period, attendance-based)
    path('labourer/',                       views.LabourerPayrollListCreateView.as_view(),    name='labourer-payroll-list'),
    path('labourer/<int:pk>/',              views.LabourerPayrollDetailView.as_view(),        name='labourer-payroll-detail'),
    path('labourer/<int:pk>/calculate/',    views.LabourerPayrollAutoCalculateView.as_view(), name='labourer-payroll-calculate'),
]
