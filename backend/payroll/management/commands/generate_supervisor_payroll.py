# backend/payroll/management/commands/generate_supervisor_payroll.py
# REPLACE ENTIRE FILE
#
# Run manually or via cron on the 5th of each month:
#   python manage.py generate_supervisor_payroll
#
# Or for a specific month:
#   python manage.py generate_supervisor_payroll --month 2025-03
#
# Cron example (runs at 8 AM on the 5th of every month):
#   0 8 5 * * cd /path/to/backend && python manage.py generate_supervisor_payroll

import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from users.models import CustomUser
from payroll.models import SupervisorPayroll


class Command(BaseCommand):
    help = 'Auto-generate monthly SupervisorPayroll records on the 5th of the month'

    def add_arguments(self, parser):
        parser.add_argument(
            '--month',
            type=str,
            default=None,
            help='Generate for a specific month (YYYY-MM). Defaults to current month.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be created without saving.',
        )

    def handle(self, *args, **options):
        month_str = options.get('month')
        dry_run   = options.get('dry_run', False)

        if month_str:
            try:
                month_date = datetime.date.fromisoformat(f"{month_str}-01")
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid month format: {month_str}. Use YYYY-MM."))
                return
        else:
            today      = timezone.now().date()
            month_date = today.replace(day=1)

        month_display = month_date.strftime('%B %Y')
        self.stdout.write(f"\n{'[DRY RUN] ' if dry_run else ''}Generating supervisor payroll for {month_display}\n")

        supervisors = CustomUser.objects.filter(role='SUPERVISOR', is_active=True)

        if not supervisors.exists():
            self.stdout.write(self.style.WARNING('No active supervisors found.'))
            return

        created_count = 0
        skipped_count = 0

        for supervisor in supervisors:
            salary = supervisor.monthly_salary

            if salary <= 0:
                self.stdout.write(
                    self.style.WARNING(f"  SKIP  {supervisor.username} — monthly_salary is 0 or not set")
                )
                skipped_count += 1
                continue

            if SupervisorPayroll.objects.filter(supervisor=supervisor, month=month_date).exists():
                self.stdout.write(
                    f"  SKIP  {supervisor.username} — already has payroll for {month_display}"
                )
                skipped_count += 1
                continue

            if not dry_run:
                SupervisorPayroll.objects.create(
                    supervisor     = supervisor,
                    month          = month_date,
                    monthly_salary = salary,
                    bonus          = 0,
                    deductions     = 0,
                    status         = 'PENDING',
                )
                self.stdout.write(
                    self.style.SUCCESS(f"  CREATE {supervisor.username} — ₹{salary:,.2f} — PENDING")
                )
            else:
                self.stdout.write(
                    f"  WOULD CREATE {supervisor.username} — ₹{salary:,.2f}"
                )
            created_count += 1

        self.stdout.write(f"\nDone. Created: {created_count} | Skipped: {skipped_count}\n")
