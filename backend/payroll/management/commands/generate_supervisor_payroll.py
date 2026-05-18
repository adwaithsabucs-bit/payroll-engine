# backend/payroll/management/commands/generate_supervisor_payroll.py
# REPLACE ENTIRE FILE
#
# Run on the 5th of each month (or manually):
#   python manage.py generate_supervisor_payroll
#   python manage.py generate_supervisor_payroll --month 2026-03
#   python manage.py generate_supervisor_payroll --dry-run
#
# IMPORTANT: Set monthly_salary on each supervisor's user account first.
# Users page → find supervisor → edit → set Monthly Salary field.
#
# Windows Task Scheduler: run at 8 AM on the 5th of every month.

import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import CustomUser
from payroll.models import SupervisorPayroll


class Command(BaseCommand):
    help = 'Auto-generate monthly SupervisorPayroll records (run on the 5th of each month)'

    def add_arguments(self, parser):
        parser.add_argument('--month', type=str, default=None,
                            help='Generate for YYYY-MM. Defaults to current month.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Preview without saving.')

    def handle(self, *args, **options):
        month_str = options.get('month')
        dry_run   = options.get('dry_run', False)

        if month_str:
            try:
                month_date = datetime.date.fromisoformat(f"{month_str}-01")
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid format: {month_str}. Use YYYY-MM."))
                return
        else:
            month_date = timezone.now().date().replace(day=1)

        month_display = month_date.strftime('%B %Y')
        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(f"\n{prefix}Generating supervisor payroll for {month_display}\n")

        supervisors = CustomUser.objects.filter(role='SUPERVISOR', is_active=True)
        if not supervisors.exists():
            self.stdout.write(self.style.WARNING('No active supervisors found.'))
            return

        created = 0
        skipped = 0

        for sup in supervisors:
            salary = sup.monthly_salary

            if not salary or salary <= 0:
                self.stdout.write(
                    self.style.WARNING(f"  SKIP  {sup.username} — monthly_salary is 0. Set it in the Users page.")
                )
                skipped += 1
                continue

            if SupervisorPayroll.objects.filter(supervisor=sup, month=month_date).exists():
                self.stdout.write(f"  SKIP  {sup.username} — already has payroll for {month_display}")
                skipped += 1
                continue

            if not dry_run:
                SupervisorPayroll.objects.create(
                    supervisor     = sup,
                    month          = month_date,
                    monthly_salary = salary,
                    bonus          = 0,
                    deductions     = 0,
                    status         = 'PENDING',
                )
                self.stdout.write(self.style.SUCCESS(
                    f"  CREATE {sup.username} ({sup.first_name} {sup.last_name}) — ₹{salary:,.2f} — PENDING"
                ))
            else:
                self.stdout.write(f"  WOULD CREATE {sup.username} — ₹{salary:,.2f}")

            created += 1

        self.stdout.write(f"\nDone. Created: {created} | Skipped: {skipped}\n")
        if skipped > 0:
            self.stdout.write(
                self.style.WARNING("  → To set salary: Users page → select supervisor → edit → set Monthly Salary\n")
            )
