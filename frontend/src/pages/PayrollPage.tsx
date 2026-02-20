import React, { useEffect, useState } from 'react';
import { getPayrolls, getPeriods, createPeriod, generatePayroll, approvePayroll } from '../api/payroll';
import { Payroll, PayrollPeriod } from '../types';
import { useAuth } from '../context/AuthContext';
import { Plus, RefreshCw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  PAID: '#10b981',
  DISPUTED: '#ef4444',
};

const PayrollPage = () => {
  const { user } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [periodForm, setPeriodForm] = useState({ name: '', start_date: '', end_date: '' });
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, perRes] = await Promise.all([
        getPayrolls(selectedPeriod ? { period: selectedPeriod } : {}),
        user?.role === 'HR' ? getPeriods() : Promise.resolve({ data: { results: [] } }),
      ]);
      setPayrolls(payRes.data.results || payRes.data);
      setPeriods(perRes.data.results || perRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedPeriod]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPeriod(periodForm);
      setMessage('Period created!');
      setShowPeriodForm(false);
      fetchData();
    } catch (err: any) {
      setMessage('Failed: ' + JSON.stringify(err.response?.data));
    }
  };

  const handleGenerate = async (periodId: number) => {
    try {
      const res = await generatePayroll(periodId);
      setMessage(res.data.message);
      fetchData();
    } catch {}
  };

  const handleApprove = async (id: number, status: string) => {
    try {
      await approvePayroll(id, { payment_status: status });
      fetchData();
    } catch {}
  };

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading payroll...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Payroll</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{payrolls.length} records</p>
        </div>
        {user?.role === 'HR' && (
          <button
            onClick={() => setShowPeriodForm(!showPeriodForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f59e0b', color: 'white',
              border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> New Period
          </button>
        )}
      </div>

      {message && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
        }}>
          {message} <button onClick={() => setMessage('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Period Form */}
      {showPeriodForm && user?.role === 'HR' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h2 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Create Payroll Period</h2>
          <form onSubmit={handleCreatePeriod}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Period Name *</label>
                <input
                  type="text"
                  placeholder="e.g. January 2025"
                  value={periodForm.name}
                  onChange={e => setPeriodForm({ ...periodForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Start Date *</label>
                <input
                  type="date"
                  value={periodForm.start_date}
                  onChange={e => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>End Date *</label>
                <input
                  type="date"
                  value={periodForm.end_date}
                  onChange={e => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" style={{ padding: '10px 24px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Create
              </button>
              <button type="button" onClick={() => setShowPeriodForm(false)} style={{ padding: '10px 24px', background: 'white', color: '#64748b', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Periods List (HR) */}
      {user?.role === 'HR' && periods.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Payroll Periods</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {periods.map(period => (
              <div key={period.id} style={{
                background: 'white', borderRadius: 12, padding: 20,
                border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{period.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                  {period.start_date} → {period.end_date}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  {period.payroll_count} payroll records
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleGenerate(period.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '6px 12px', background: '#3b82f6', color: 'white',
                      border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={12} /> Generate
                  </button>
                  <button
                    onClick={() => setSelectedPeriod(period.id.toString())}
                    style={{
                      padding: '6px 12px', background: '#f8fafc', color: '#374151',
                      border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    View Records
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payroll Records Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, color: '#1e293b', margin: 0 }}>Payroll Records</h2>
          {selectedPeriod && (
            <button onClick={() => setSelectedPeriod('')} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer' }}>
              Clear filter
            </button>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Labourer', 'Period', 'Days', 'OT Hrs', 'Basic', 'OT Pay', 'Total Salary', 'Status', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payrolls.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  No payroll records. Generate payroll from a period above.
                </td>
              </tr>
            ) : payrolls.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                  {p.labourer_detail?.full_name || p.labourer_detail?.username || `#${p.labourer}`}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>
                  {p.period_detail?.name || `#${p.period}`}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>{p.present_days}</td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>{p.total_overtime_hours}h</td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>₹{parseFloat(p.basic_salary).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14 }}>₹{parseFloat(p.overtime_pay).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                  ₹{parseFloat(p.total_salary).toFixed(2)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: STATUS_COLORS[p.payment_status] + '20',
                    color: STATUS_COLORS[p.payment_status],
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    {p.payment_status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {user?.role === 'HR' && p.payment_status === 'PENDING' && (
                    <button
                      onClick={() => handleApprove(p.id, 'APPROVED')}
                      style={{ padding: '4px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                    >
                      Approve
                    </button>
                  )}
                  {user?.role === 'HR' && p.payment_status === 'APPROVED' && (
                    <button
                      onClick={() => handleApprove(p.id, 'PAID')}
                      style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollPage;