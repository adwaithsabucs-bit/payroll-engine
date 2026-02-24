# payroll/models.py — REPLACE ENTIRE FILE
# Uses string-based FK references to avoid import errors

from django.db import models
from users.models import CustomUser


class SupervisorPayroll(models.Model):
    """Monthly salary payroll for Supervisors."""
    STATUS_CHOICES = [('PENDING','Pending'),('APPROVED','Approved'),('PAID','Paid')]

    supervisor     = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE,
        related_name='supervisor_payrolls',
        limit_choices_to={'role': 'SUPERVISOR'}
    )
    project        = models.ForeignKey('attendance.Project', on_delete=models.CASCADE, related_name='supervisor_payrolls')
    month          = models.DateField(help_text="First day of the pay month e.g. 2025-01-01")
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2)
    bonus          = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['supervisor', 'project', 'month']
        ordering = ['-month']

    def save(self, *args, **kwargs):
        self.total_amount = self.monthly_salary + self.bonus - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Supervisor: {self.supervisor.username} — {self.month}"


class ContractorPayroll(models.Model):
    """Per-project payroll for Contractors."""
    STATUS_CHOICES = [('PENDING','Pending'),('APPROVED','Approved'),('PAID','Paid')]

    contractor     = models.ForeignKey('workforce.Contractor', on_delete=models.CASCADE, related_name='payrolls')
    project        = models.ForeignKey('attendance.Project', on_delete=models.CASCADE, related_name='contractor_payrolls')
    period         = models.ForeignKey('attendance.Period', on_delete=models.CASCADE, related_name='contractor_payrolls')
    project_amount = models.DecimalField(max_digits=12, decimal_places=2)
    advance_paid   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['contractor', 'project', 'period']
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.total_amount = self.project_amount - self.advance_paid - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Contractor: {self.contractor} — {self.project.name}"


class LabourerPayroll(models.Model):
    """Per-period attendance-based payroll for Labourers (fixed + temp)."""
    STATUS_CHOICES = [('PENDING','Pending'),('APPROVED','Approved'),('PAID','Paid')]

    labourer      = models.ForeignKey('workforce.Labourer', on_delete=models.CASCADE, related_name='payrolls', null=True, blank=True)
    temp_labourer = models.ForeignKey('attendance.TemporaryLabourer', on_delete=models.CASCADE, related_name='payrolls', null=True, blank=True)
    project       = models.ForeignKey('attendance.Project', on_delete=models.CASCADE, related_name='labourer_payrolls')
    period        = models.ForeignKey('attendance.Period', on_delete=models.CASCADE, related_name='labourer_payrolls')

    days_present   = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    daily_wage     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    overtime_rate  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        base = (self.days_present * self.daily_wage) + (self.overtime_hours * self.overtime_rate)
        self.total_amount = base - self.deductions
        super().save(*args, **kwargs)

    def auto_calculate(self):
        from attendance.models import LabourerAttendance
        if self.labourer:
            records = LabourerAttendance.objects.filter(
                labourer=self.labourer, project=self.project,
                date__gte=self.period.start_date, date__lte=self.period.end_date,
            )
            self.daily_wage    = self.labourer.daily_wage
            self.overtime_rate = self.labourer.overtime_rate
        elif self.temp_labourer:
            records = LabourerAttendance.objects.filter(
                temp_labourer=self.temp_labourer, project=self.project,
                date__gte=self.period.start_date, date__lte=self.period.end_date,
            )
            self.daily_wage    = self.temp_labourer.daily_wage
            self.overtime_rate = 0
        else:
            return
        self.days_present   = sum(1 if r.status=='PRESENT' else 0.5 if r.status=='HALF_DAY' else 0 for r in records)
        self.overtime_hours = sum(r.overtime_hours for r in records)
        self.save()

    def __str__(self):
        who = self.labourer or self.temp_labourer
        return f"Labourer: {who} — {self.period}"
