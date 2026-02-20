from django.urls import path
from . import views

urlpatterns = [
    path('', views.PayrollListView.as_view(), name='payroll-list'),
    path('dashboard/', views.PayrollDashboardView.as_view(), name='payroll-dashboard'),
    path('periods/', views.PayrollPeriodListCreateView.as_view(), name='period-list'),
    path('periods/<int:pk>/', views.PayrollPeriodDetailView.as_view(), name='period-detail'),
    path('periods/<int:pk>/generate/', views.GeneratePayrollView.as_view(), name='generate-payroll'),
    path('<int:pk>/', views.PayrollDetailView.as_view(), name='payroll-detail'),
    path('<int:pk>/approve/', views.PayrollApproveView.as_view(), name='payroll-approve'),
]