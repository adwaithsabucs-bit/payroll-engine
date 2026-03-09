# users/urls.py — REPLACE ENTIRE FILE

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Authentication — two-step
    path('login/',          views.LoginView.as_view(),      name='login'),
    path('verify-pin/',     views.VerifyPINView.as_view(),  name='verify-pin'),
    path('logout/',         views.LogoutView.as_view(),     name='logout'),
    path('register/',       views.RegisterView.as_view(),   name='register'),
    path('token/refresh/',  TokenRefreshView.as_view(),     name='token_refresh'),
    path('profile/',        views.ProfileView.as_view(),    name='profile'),

    # User CRUD
    path('users/',          views.UserListView.as_view(),   name='user-list'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),

    # PIN management
    path('set-pin/',                          views.SetPINView.as_view(),          name='set-pin'),
    path('users/<int:pk>/reset-pin/',         views.AdminResetPINView.as_view(),   name='admin-reset-pin'),

    # Password management
    path('change-password/',                  views.ChangePasswordView.as_view(),      name='change-password'),
    path('passwords/',                        views.AdminPasswordListView.as_view(),   name='admin-password-list'),
    path('users/<int:pk>/set-password/',      views.AdminSetPasswordView.as_view(),    name='admin-set-password'),
]
