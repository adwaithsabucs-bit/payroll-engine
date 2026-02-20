from django.urls import path
from . import views

urlpatterns = [
    path('', views.AttendanceListCreateView.as_view(), name='attendance-list'),

    # CRITICAL: 'summary/' MUST come before '<int:pk>/'
    # If it comes after, Django tries to cast "summary" to int and fails with 404
    path('summary/', views.AttendanceSummaryView.as_view(), name='attendance-summary'),

    path('<int:pk>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
    path('<int:pk>/approve/', views.AttendanceApproveView.as_view(), name='attendance-approve'),
]