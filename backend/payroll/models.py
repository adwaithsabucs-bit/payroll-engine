# backend/payroll/models.py — REPLACE ENTIRE FILE
#
# ══════════════════════════════════════════════════════════════════════
# PAYROLL RULES
# ══════════════════════════════════════════════════════════════════════
#
#  LABOURER
#    • Contractor marks attendance → signal fires → DailyLabourerPayroll
#      is auto-created using daily_wage + overtime_rate from Labourer profile.
#    • Status immediately PAID. No manual action needed.
#
#  SUPERVISOR
#    • Management command runs on the 5th of each month.
#    • Creates a SupervisorPayroll using monthly_salary from CustomUser.
#    • Status starts PENDING → HR approves → APPROVED → HR marks paid → PAID.
#
#  CONTRACTOR
#    • Supervisor assigns a Contractor to a Project with a fixed contract_amount
#      via ProjectContractorAssignment. This auto-creates a ContractorProjectPayroll
#      with status PENDING.
#    • Supervisor clicks "Approve Payout" → status → PAID. One payment per project.
#
# ══════════════════════════════════════════════════════════════════════

from django.db import models
from users.models import CustomUser


# ─────────────────────────────────────────────────────────────────────
# SUPERVISOR PAYROLL
# ─────────────────────────────────────────────────────────────────────
class SupervisorPayroll(models.Model):
    STATUS_CHOICES = [
        ('PENDING',  'Pending'),
        ('APPROVED', 'Approved'),
        ('PAID',     'Paid'),
    ]

    supervisor     = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='supervisor_payrolls',
        limit_choices_to={'role': 'SUPERVISOR'},
    )
    # First day of the pay month, e.g. 2025-03-01
    month          = models.DateField(help_text="First day of the pay month, e.g. 2025-03-01")
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes       = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_supervisor_payrolls',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['supervisor', 'month']
        ordering        = ['-month', 'supervisor__username']

    def save(self, *args, **kwargs):
        self.total_amount = self.monthly_salary + self.bonus - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Supervisor Payroll: {self.supervisor.username} — {self.month:%B %Y}"


# ─────────────────────────────────────────────────────────────────────
# CONTRACTOR PROJECT PAYROLL
# One record per ProjectContractorAssignment.
# Auto-created by signal when assignment is saved.
# Supervisor approves → PAID.
# ─────────────────────────────────────────────────────────────────────
class ContractorProjectPayroll(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID',    'Paid'),
    ]

    assignment = models.OneToOneField(
        'attendance.ProjectContractorAssignment',
        on_delete=models.CASCADE,
        related_name='payroll',
    )
    # Denormalized for easy queries
    contractor = models.ForeignKey(
        'workforce.Contractor', on_delete=models.CASCADE,
        related_name='project_payrolls',
    )
    project = models.ForeignKey(
        'attendance.Project', on_delete=models.CASCADE,
        related_name='contractor_project_payrolls',
    )

    # Snapshotted from assignment at creation time
    contract_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    advance_paid    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount    = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    notes       = models.TextField(blank=True)
    approved_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_contractor_payrolls',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.total_amount = self.contract_amount - self.advance_paid - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Contractor Payroll: {self.contractor} — {self.project.name} — ₹{self.total_amount}"


# ─────────────────────────────────────────────────────────────────────
# DAILY LABOURER PAYROLL
# One record per LabourerAttendance.
# Auto-created by signal — always PAID immediately.
# ─────────────────────────────────────────────────────────────────────
class DailyLabourerPayroll(models.Model):
    STATUS_CHOICES = [
        ('PAID', 'Paid'),
        ('VOID', 'Void'),
    ]

    # Exactly one of these will be set
    labourer      = models.ForeignKey(
        'workforce.Labourer', on_delete=models.CASCADE,
        related_name='daily_payrolls', null=True, blank=True,
    )
    temp_labourer = models.ForeignKey(
        'attendance.TemporaryLabourer', on_delete=models.CASCADE,
        related_name='daily_payrolls', null=True, blank=True,
    )

    # Denormalized
    contractor = models.ForeignKey(
        'workforce.Contractor', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='labourer_daily_payrolls',
    )
    project = models.ForeignKey(
        'attendance.Project', on_delete=models.CASCADE,
        related_name='labourer_daily_payrolls',
    )
    attendance = models.OneToOneField(
        'attendance.LabourerAttendance', on_delete=models.CASCADE,
        related_name='payroll',
    )
    date = models.DateField()

    # Snapshotted at moment of attendance marking
    daily_wage     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    overtime_rate  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_temp        = models.BooleanField(default=False)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PAID')
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        who = self.labourer or self.temp_labourer
        return f"Labourer Daily Pay: {who} — {self.date} — ₹{self.total_amount}"
