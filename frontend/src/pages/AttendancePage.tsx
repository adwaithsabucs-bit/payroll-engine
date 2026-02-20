import React, { useEffect, useState } from 'react';
import { getAttendance, markAttendance, approveAttendance } from '../api/attendance';
import { getLabourers } from '../api/workforce';
import { Attendance, Labourer } from '../types';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, Clock, Plus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PRESENT: '#10b981',
  ABSENT: '#ef4444',
  HALF_DAY: '#f59e0b',
  HOLIDAY: '#6366f1',
  LEAVE: '#8b5cf6',
};

const APPROVAL_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
};

const AttendancePage = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [labourers, setLabourers] = useState<Labourer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    labourer: '',
    date: new Date().toISOString().split('T')[0],
    status: 'PRESENT',
    overtime_hours: '0',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, labRes] = await Promise.all([
        getAttendance(),
        user?.role !== 'LABOURER' ? getLabourers() : Promise.resolve({ data: { results: [], count: 0 } }),
      ]);
      setRecords(attRes.data.results || attRes.data);
      setLabourers(labRes.data.results || labRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleMark = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await markAttendance({
        ...form,
        overtime_hours: parseFloat(form.overtime_hours),
      });
      setMessage('Attendance marked successfully!');
      setShowForm(false);
      setForm({ labourer: '', date: new Date().toISOString().split('T')[0], status: 'PRESENT', overtime_hours: '0', notes: '' });
      fetchData();
    } catch (err: any) {
      const errData = err.response?.data;
      setMessage(JSON.stringify(errData) || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    try {
      await approveAttendance(id, { approval_status: status });
      fetchData();
    } catch {}
  };

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading attendance...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Attendance</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>{records.length} records</p>
        </div>
        {(user?.role === 'SUPERVISOR' || user?.role === 'HR') && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#f59e0b', color: 'white',
              border: 'none', borderRadius: 8,
              padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Mark Attendance
          </button>
        )}
      </div>

      {message && (
        <div style={{
          background: message.includes('success') ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.includes('success') ? '#bbf7d0' : '#fecaca'}`,
          color: message.includes('success') ? '#166534' : '#dc2626',
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
        }}>
          {message}
        </div>
      )}

      {/* Mark Attendance Form */}
      {showForm && (
        <div style={{
          background: 'white', borderRadius: 12, padding: 24,
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          border: '1px solid #e2e8f0', marginBottom: 24,
        }}>
          <h2 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 20 }}>Mark Attendance</h2>
          <form onSubmit={handleMark}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Labourer *</label>
                <select
                  value={form.labourer}
                  onChange={e => setForm({ ...form, labourer: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                >
                  <option value="">Select labourer...</option>
                  {labourers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.full_name || l.username}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Status *</label>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="LEAVE">Leave</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Overtime Hours</label>
                <input
                  type="number"
                  min="0"
                  max="12"
                  step="0.5"
                  value={form.overtime_hours}
                  onChange={e => setForm({ ...form, overtime_hours: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 24px', background: '#f59e0b', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: '10px 24px', background: 'white', color: '#64748b',
                  border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Records Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Labourer', 'Date', 'Status', 'Overtime Hrs', 'Marked By', 'Approval', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  No attendance records found
                </td>
              </tr>
            ) : records.map((rec, i) => (
              <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>
                  {rec.labourer_detail?.full_name || rec.labourer_detail?.username || `#${rec.labourer}`}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{rec.date}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: STATUS_COLORS[rec.status] + '20',
                    color: STATUS_COLORS[rec.status],
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    {rec.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{rec.overtime_hours}h</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{rec.marked_by_username || '-'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: APPROVAL_COLORS[rec.approval_status] + '20',
                    color: APPROVAL_COLORS[rec.approval_status],
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>
                    {rec.approval_status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {user?.role === 'HR' && rec.approval_status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleApprove(rec.id, 'APPROVED')}
                        style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleApprove(rec.id, 'REJECTED')}
                        style={{ padding: '4px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                      >
                        ✕ Reject
                      </button>
                    </div>
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

export default AttendancePage;