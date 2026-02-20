from django.db import models
from django.conf import settings


class Contractor(models.Model):
    """
    A contractor manages a group of labourers.
    Each contractor is assigned to a supervisor.
    Hierarchy: Supervisor → Contractor → Labourer
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contractor_profile',
        limit_choices_to={'role': 'CONTRACTOR'}
    )
    supervisor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contractors',
        limit_choices_to={'role': 'SUPERVISOR'}
    )
    company_name = models.CharField(max_length=200, blank=True)
    contract_number = models.CharField(max_length=50, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Contractor: {self.user.get_full_name() or self.user.username}"

    class Meta:
        ordering = ['-created_at']


class Labourer(models.Model):
    """
    A labourer is the worker whose attendance and wages are tracked.
    Each labourer is assigned to a contractor.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='labourer_profile',
        limit_choices_to={'role': 'LABOURER'}
    )
    contractor = models.ForeignKey(
        Contractor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='labourers'
    )
    daily_wage = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    overtime_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Wage per overtime hour"
    )
    skill = models.CharField(max_length=100, blank=True, help_text="e.g. Mason, Carpenter")
    id_number = models.CharField(max_length=50, blank=True, help_text="National ID / Employee ID")
    joined_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Labourer: {self.user.get_full_name() or self.user.username}"

    class Meta:
        ordering = ['-created_at']