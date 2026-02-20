import React, { useEffect, useState } from 'react';
import { getDashboard } from '../api/payroll';
import { DashboardStats } from '../types';
import { Users, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div style={{
    background: 'white',
    borderRadius: 12,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  }}>
    <div style={{
      background: color + '20',
      borderRadius: 10,
      padding: 12,
      display: 'flex',
    }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((res: any) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading dashboard...</div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        HR Dashboard
      </h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        Overview of payroll and workforce status
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 20,
        marginBottom: 40,
      }}>
        <StatCard label="Active Labourers" value={stats?.total_labourers} icon={Users} color="#3b82f6" />
        <StatCard label="Pending Attendance Approvals" value={stats?.pending_attendance_approvals} icon={Clock} color="#f59e0b" />
        <StatCard label="Pending Payrolls" value={stats?.pending_payrolls} icon={AlertCircle} color="#ef4444" />
        <StatCard label="Approved Payrolls" value={stats?.approved_payrolls} icon={CheckCircle} color="#10b981" />
        <StatCard label="Paid Payrolls" value={stats?.paid_payrolls} icon={DollarSign} color="#8b5cf6" />
      </div>

      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid #f1f5f9',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>
          Approved Wages Payable
        </h2>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#10b981' }}>
          ₹{stats?.total_approved_wage_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          Total salary amount approved and awaiting payment
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;