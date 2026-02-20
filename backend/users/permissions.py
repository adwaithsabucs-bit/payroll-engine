from rest_framework.permissions import BasePermission


class IsHR(BasePermission):
    """Only HR can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'HR'


class IsHROrSupervisor(BasePermission):
    """HR or Supervisor can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['HR', 'SUPERVISOR']


class IsHROrSupervisorOrContractor(BasePermission):
    """HR, Supervisor, or Contractor can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['HR', 'SUPERVISOR', 'CONTRACTOR']


class IsSupervisor(BasePermission):
    """Only Supervisor can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPERVISOR'


class IsContractor(BasePermission):
    """Only Contractor can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CONTRACTOR'


class IsLabourer(BasePermission):
    """Only Labourer can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'LABOURER'