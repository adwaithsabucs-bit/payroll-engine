from django.urls import path
from . import views

urlpatterns = [
    path('', views.AttendanceListCreateView.as_view(), name='attendance-list'),
    path('<int:pk>/', views.AttendanceDetailView.as_view(), name='attendance-detail'),
    path('<int:pk>/approve/', views.AttendanceApproveView.as_view(), name='attendance-approve'),
    path('summary/', views.AttendanceSummaryView.as_view(), name='attendance-summary'),
]