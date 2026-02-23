# users/models.py — REPLACE ENTIRE FILE

from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Custom user model with role-based access control.
    All users in the system share the same company name as the primary HR admin.
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
    company_name = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text="Company name — auto-inherited from the primary HR admin"
    )
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

    @classmethod
    def get_company_name(cls):
        """Returns the company name from the first HR user (primary admin)."""
        first_hr = cls.objects.filter(role='HR', company_name__gt='').order_by('date_joined').first()
        return first_hr.company_name if first_hr else ''

    def save(self, *args, **kwargs):
        """
        Auto-inherit company name from the primary HR admin.
        If this user IS an HR admin setting a company name, 
        propagate it to all users with no company name.
        """
        # If no company name set, inherit from primary HR
        if not self.company_name:
            self.company_name = CustomUser.get_company_name()

        super().save(*args, **kwargs)

        # If this HR user has a company name, propagate to users without one
        if self.role == 'HR' and self.company_name:
            CustomUser.objects.filter(company_name='').exclude(pk=self.pk).update(
                company_name=self.company_name
            )
