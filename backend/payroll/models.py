from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from workforce.models import Labourer
from attendance.models import Attendance
from decimal import Decimal


class PayrollPeriod(models.Model):
    """Defines a payroll period (e.g. monthly, weekly)."""
    name = models.CharField(max_length=100, help_text="e.g. 'January 2024 Payroll'")
    start_date = models.DateField()
    end_date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_periods'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_closed = models.BooleanField(default=False, help_text="Closed periods cannot be modified")

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name


class Payroll(models.Model):
    """
    Payroll record for a single labourer in a payroll period.

    Formula:
        Total Salary = (Present Days × Daily Wage) + (Overtime Hours × Overtime Rate)
        Where: Half Day = 0.5 × Daily Wage
    """
    PAYMENT_STATUS = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('PAID', 'Paid'),
        ('DISPUTED', 'Disputed'),
    ]

    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='payrolls')
    labourer = models.ForeignKey(Labourer, on_delete=models.CASCADE, related_name='payrolls')

    # Attendance summary (auto-calculated)
    present_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    total_overtime_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    # Wage snapshot (at time of calculation)
    daily_wage_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_rate_snapshot = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Calculated totals
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Status
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='PENDING')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payrolls'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['period', 'labourer']
        ordering = ['-period__start_date']

    def __str__(self):
        return f"{self.labourer} | {self.period.name} | {self.total_salary}"

    def calculate_payroll(self):
        """
        Auto-calculates payroll from approved attendance records.
        Snapshots current wage rates to preserve historical accuracy.
        """
        # Get approved attendance in this period
        attendances = Attendance.objects.filter(
            labourer=self.labourer,
            date__gte=self.period.start_date,
            date__lte=self.period.end_date,
            approval_status='APPROVED'
        )

        # Count effective days
        present = attendances.filter(status='PRESENT').count()
        half_day = attendances.filter(status='HALF_DAY').count()
        effective_days = Decimal(str(present)) + (Decimal(str(half_day)) * Decimal('0.5'))

        # Sum overtime hours
        from django.db.models import Sum
        overtime = attendances.aggregate(total=Sum('overtime_hours'))['total'] or Decimal('0')

        # Snapshot current wage rates
        daily_wage = self.labourer.daily_wage
        overtime_rate = self.labourer.overtime_rate

        # Core formula
        basic_salary = effective_days * daily_wage
        overtime_pay = Decimal(str(overtime)) * overtime_rate
        total_salary = basic_salary + overtime_pay

        # Save calculated values
        self.present_days = effective_days
        self.total_overtime_hours = overtime
        self.daily_wage_snapshot = daily_wage
        self.overtime_rate_snapshot = overtime_rate
        self.basic_salary = basic_salary
        self.overtime_pay = overtime_pay
        self.total_salary = total_salary

    def save(self, *args, **kwargs):
        # Pop our custom flag — don't pass it to Django's save()
        skip_recalculation = kwargs.pop('skip_recalculation', False)

        # Only recalculate when:
        #   1. The period is still open
        #   2. No explicit skip flag was passed (approvals pass skip=True)
        #   3. The record is still PENDING (already approved records are frozen)
        if not skip_recalculation and not self.period.is_closed:
            if self.payment_status == 'PENDING':
                self.calculate_payroll()

        super().save(*args, **kwargs)