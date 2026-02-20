from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from workforce.models import Labourer


class Attendance(models.Model):
    """
    Daily attendance record for a labourer.
    Supervisors mark this, HR can approve.
    """
    STATUS_CHOICES = [
        ('PRESENT', 'Present'),
        ('ABSENT', 'Absent'),
        ('HALF_DAY', 'Half Day'),
        ('HOLIDAY', 'Holiday'),
        ('LEAVE', 'Leave'),
    ]

    APPROVAL_STATUS = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    labourer = models.ForeignKey(
        Labourer,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    overtime_hours = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(12)],
        help_text="Overtime hours worked on this day (max 12)"
    )
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marked_attendances',
        help_text="Supervisor who recorded this attendance"
    )
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS, default='PENDING')
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_attendances'
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['labourer', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.labourer} | {self.date} | {self.status}"

    @property
    def effective_days(self):
        """Returns the fractional day count for payroll purposes."""
        day_map = {'PRESENT': 1.0, 'HALF_DAY': 0.5, 'ABSENT': 0.0, 'HOLIDAY': 0.0, 'LEAVE': 0.0}
        return day_map.get(self.status, 0.0)