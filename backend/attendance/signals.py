# backend/attendance/signals.py — NEW FILE
#
# Fires on:
#   1. LabourerAttendance save  → creates/updates DailyLabourerPayroll (PAID)
#   2. ProjectContractorAssignment save (created only) → creates ContractorProjectPayroll (PENDING)

from django.db.models.signals import post_save
from django.dispatch import receiver


# ── Labourer attendance → daily payroll ──────────────────────────────
@receiver(post_save, sender='attendance.LabourerAttendance')
def auto_create_labourer_payroll(sender, instance, created, **kwargs):
    from payroll.models import DailyLabourerPayroll

    if instance.labourer:
        worker        = instance.labourer
        daily_wage    = worker.daily_wage
        overtime_rate = worker.overtime_rate
        contractor    = worker.contractor
        is_temp       = False
        lab_kw        = {'labourer': worker}
        tmp_kw        = {}
    elif instance.temp_labourer:
        worker        = instance.temp_labourer
        daily_wage    = worker.daily_wage
        overtime_rate = 0
        contractor    = worker.contractor
        is_temp       = True
        lab_kw        = {}
        tmp_kw        = {'temp_labourer': worker}
    else:
        return

    # Calculate pay based on attendance status
    wage = float(daily_wage)
    if instance.status == 'HALF_DAY':
        wage = wage / 2
    elif instance.status in ('ABSENT', 'LEAVE'):
        wage = 0
    ot_pay       = float(instance.overtime_hours or 0) * float(overtime_rate)
    total_amount = round(wage + ot_pay, 2)

    payroll, _ = DailyLabourerPayroll.objects.update_or_create(
        attendance=instance,
        defaults={
            **lab_kw,
            **tmp_kw,
            'contractor':    contractor,
            'project':       instance.project,
            'date':          instance.date,
            'daily_wage':    daily_wage,
            'overtime_rate': overtime_rate,
            'overtime_hours': instance.overtime_hours or 0,
            'is_temp':       is_temp,
            'total_amount':  total_amount,
            'status':        'PAID',
        },
    )


# ── Project contractor assignment → contractor project payroll ────────
@receiver(post_save, sender='attendance.ProjectContractorAssignment')
def auto_create_contractor_payroll(sender, instance, created, **kwargs):
    """
    When a contractor is assigned to a project, auto-create a PENDING
    ContractorProjectPayroll. The supervisor approves it to release payment.
    """
    if not created:
        return  # only on first creation; don't recreate if assignment is updated

    from payroll.models import ContractorProjectPayroll

    ContractorProjectPayroll.objects.get_or_create(
        assignment=instance,
        defaults={
            'contractor':    instance.contractor,
            'project':       instance.project,
            'contract_amount': instance.contract_amount,
            'total_amount':  instance.contract_amount,
            'status':        'PENDING',
        },
    )
