from django.urls import path
from . import views

urlpatterns = [
    path('contractors/', views.ContractorListCreateView.as_view(), name='contractor-list'),
    path('contractors/<int:pk>/', views.ContractorDetailView.as_view(), name='contractor-detail'),
    path('labourers/', views.LabourerListCreateView.as_view(), name='labourer-list'),
    path('labourers/<int:pk>/', views.LabourerDetailView.as_view(), name='labourer-detail'),
    path('my-profile/', views.MyProfileView.as_view(), name='my-profile'),
]