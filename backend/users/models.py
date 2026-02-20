from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Custom user model with role-based access control.
    Roles define what each user can see and do in the system.
    """
    ROLE_CHOICES = [
        ('HR', 'HR Manager'),
        ('SUPERVISOR', 'Supervisor'),
        ('CONTRACTOR', 'Contractor'),
        ('LABOURER', 'Labourer'),
    ]

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='LABOURER')
    phone = models.CharField(max_length=15, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'role']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_hr(self):
        return self.role == 'HR'

    @property
    def is_supervisor(self):
        return self.role == 'SUPERVISOR'

    @property
    def is_contractor(self):
        return self.role == 'CONTRACTOR'

    @property
    def is_labourer(self):
        return self.role == 'LABOURER'