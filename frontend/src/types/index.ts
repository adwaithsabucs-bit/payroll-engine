// Core type definitions for the Payroll Engine

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'HR' | 'SUPERVISOR' | 'CONTRACTOR' | 'LABOURER';
  phone?: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface Contractor {
  id: number;
  user: number;
  user_detail: User;
  supervisor: number;
  supervisor_detail: User;
  company_name: string;
  contract_number: string;
  is_active: boolean;
  labourer_count: number;
}

export interface Labourer {
  id: number;
  user: number;
  user_detail: User;
  contractor: number;
  contractor_detail?: Contractor;
  daily_wage: string;
  overtime_rate: string;
  skill: string;
  id_number: string;
  is_active: boolean;
  full_name?: string;
  username?: string;
  contractor_name?: string;
}

export interface Attendance {
  id: number;
  labourer: number;
  labourer_detail: Labourer;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY' | 'LEAVE';
  overtime_hours: string;
  marked_by: number;
  marked_by_username: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by_username?: string;
  effective_days: number;
  notes: string;
}

export interface PayrollPeriod {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  payroll_count: number;
  created_at: string;
}

export interface Payroll {
  id: number;
  period: number;
  period_detail: PayrollPeriod;
  labourer: number;
  labourer_detail: Labourer;
  present_days: string;
  total_overtime_hours: string;
  daily_wage_snapshot: string;
  overtime_rate_snapshot: string;
  basic_salary: string;
  overtime_pay: string;
  total_salary: string;
  payment_status: 'PENDING' | 'APPROVED' | 'PAID' | 'DISPUTED';
  approved_by_username?: string;
  approved_at?: string;
  paid_at?: string;
}

export interface DashboardStats {
  total_labourers: number;
  total_periods: number;
  pending_payrolls: number;
  approved_payrolls: number;
  paid_payrolls: number;
  pending_attendance_approvals: number;
  total_approved_wage_payable: number;
}