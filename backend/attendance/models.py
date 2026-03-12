# backend/attendance/models.py — REPLACE ENTIRE FILE

from django.db import models
from users.models import CustomUser


class Project(models.Model):
    STATUS_CHOICES = [('ACTIVE', 'Active'), ('COMPLETED', 'Completed'), ('ON_HOLD', 'On Hold')]
    name        = models.CharField(max_length=200)
    supervisor  = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supervised_projects', limit_choices_to={'role': 'SUPERVISOR'}
    )
    location    = models.CharField(max_length=200, blank=True)
    start_date  = models.DateField()
    end_date    = models.DateField(null=True, blank=True)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    description = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"


class Period(models.Model):
    STATUS_CHOICES = [('OPEN', 'Open'), ('CLOSED', 'Closed'), ('PAID', 'Paid')]
    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='periods')
    name       = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date   = models.DateField()
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.project.name} — {self.name}"


class TemporaryLabourer(models.Model):
    """One-day workers — NOT system users."""
    contractor = models.ForeignKey(
        'workforce.Contractor', on_delete=models.CASCADE, related_name='temp_labourers'
    )
    name       = models.CharField(max_length=100)
    phone      = models.CharField(max_length=15, blank=True)
    skill      = models.CharField(max_length=100, blank=True)
    daily_wage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Temp)"


class ProjectContractorAssignment(models.Model):
    """
    Assigns a Contractor to a Project with a fixed contract amount.
    When created → auto-creates a ContractorProjectPayroll (PENDING).
    Supervisor approves the payroll when they want to release payment.
    """
    project         = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='contractor_assignments')
    contractor      = models.ForeignKey('workforce.Contractor', on_delete=models.CASCADE, related_name='project_assignments')
    contract_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Fixed total amount payable to contractor for this project"
    )
    assigned_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='contractor_assignments_made'
    )
    notes      = models.TextField(blank=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['project', 'contractor']
        ordering        = ['-created_at']

    def __str__(self):
        return f"{self.contractor} → {self.project.name} (₹{self.contract_amount})"


class ContractorAttendance(models.Model):
    """Supervisor marks attendance for Contractors (for tracking only, not pay)."""
    STATUS_CHOICES = [('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('HALF_DAY', 'Half Day'), ('LEAVE', 'Leave')]
    contractor = models.ForeignKey('workforce.Contractor', on_delete=models.CASCADE, related_name='attendance_records')
    project    = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='contractor_attendance')
    date       = models.DateField()
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    notes      = models.CharField(max_length=200, blank=True)
    marked_by  = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='contractor_attendance_marked')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['contractor', 'project', 'date']
        ordering        = ['-date']

    def __str__(self):
        return f"{self.contractor} — {self.date} — {self.status}"


class LabourerAttendance(models.Model):
    """Contractor marks attendance for Labourers. Triggers auto daily payroll via signal."""
    STATUS_CHOICES = [('PRESENT', 'Present'), ('ABSENT', 'Absent'), ('HALF_DAY', 'Half Day'), ('LEAVE', 'Leave')]
    labourer       = models.ForeignKey('workforce.Labourer', on_delete=models.CASCADE, related_name='attendance_records', null=True, blank=True)
    temp_labourer  = models.ForeignKey(TemporaryLabourer, on_delete=models.CASCADE, related_name='attendance_records', null=True, blank=True)
    project        = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='labourer_attendance')
    date           = models.DateField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes          = models.CharField(max_length=200, blank=True)
    marked_by      = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='labourer_attendance_marked')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        who = self.labourer or self.temp_labourer
        return f"{who} — {self.date} — {self.status}"
