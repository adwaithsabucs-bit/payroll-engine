// frontend/src/pages/PayrollPage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import { RefreshCw, CheckCircle, X } from 'lucide-react';

// ─── Shared styles ────────────────────────────────────────────────────
const S = {
  card:     { background: '#0d0d0d', border: '1px solid #1a1a1a' } as React.CSSProperties,
  label:    { display: 'block', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a1a1aa', fontWeight: 700, marginBottom: 8 },
  input:    { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Barlow',sans-serif", transition: 'border-color 0.2s' },
  select:   { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '11px 13px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const, fontFamily: "'Barlow',sans-serif" },
  btn:      { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#d4d4d8', border: '1px solid #3f3f46', padding: '9px 18px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer' },
  overlay:  { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:    { background: '#0d0d0d', border: '1px solid #1e1e1e', borderTop: '3px solid #dc2626', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' as const, padding: 28 },
  th:       { fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a1a1aa', fontWeight: 700, padding: '10px 16px', textAlign: 'left' as const },
  td:       { padding: '13px 16px', fontSize: 13, color: '#a1a1aa', borderBottom: '1px solid #111' },
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:  '#facc15',
  APPROVED: '#60a5fa',
  PAID:     '#4ade80',
  VOID:     '#3f3f46',
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] || '#71717a';
  return (
    <span style={{ fontSize: 12, color: c, background: `${c}18`, padding: '3px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function PageHeader({ sub, title }: { sub: string; title: string }) {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #161616', position: 'relative' }}>
      <div style={{ position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626' }} />
      <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a', marginBottom: 4, fontWeight: 600 }}>{sub}</div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: -1 }}>{title}</div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div style={{ ...S.card, padding: '18px 20px', borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 30, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div style={{ width: 28, height: 2, background: '#dc2626' }} />
      <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: '#a1a1aa' }}>{children}</div>
    </div>
  );
}

function Loader() {
  return <div style={{ ...S.card, padding: '40px 0', textAlign: 'center', color: '#71717a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 4, textTransform: 'uppercase', fontSize: 12 }}>Loading...</div>;
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ ...S.card, padding: '40px 20px', textAlign: 'center', color: '#71717a', fontSize: 13 }}>{msg}</div>;
}

// ─── Root router ──────────────────────────────────────────────────────
export default function PayrollPage() {
  const { user } = useAuth();
  const role = user?.role;
  if (role === 'HR')         return <HRView />;
  if (role === 'SUPERVISOR') return <SupervisorView />;
  if (role === 'CONTRACTOR') return <ContractorView />;
  return <div style={{ color: '#a1a1aa', padding: 40 }}>Payroll not available for your role.</div>;
}

// ═══════════════════════════════════════════════════════════════════
// HR VIEW
// ═══════════════════════════════════════════════════════════════════
function HRView() {
  const [tab, setTab]       = useState<'supervisor' | 'contractor' | 'labourer'>('supervisor');
  const [dash, setDash]     = useState<any>({});
  const [monthFilter, setMonth] = useState('');

  const load = useCallback(() => {
    apiClient.get('/payroll/dashboard/').then(r => setDash(r.data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const sup = dash.supervisor || {};
  const con = dash.contractor || {};
  const lab = dash.labourer   || {};

  return (
    <div style={{ animation: 'pageIn 0.4s ease' }}>
      <style>{`@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .pr-row:hover td{background:#111!important} select option{background:#141414;color:white} .pr-input:focus{border-bottom-color:#dc2626!important}`}</style>

      <PageHeader sub="HR Administration" title="Payroll Overview" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, marginBottom: 28 }}>
        <div style={{ ...S.card, padding: '18px 20px', borderTop: '2px solid #a78bfa' }}>
          <div style={{ fontSize: 13, letterSpacing: 4, color: '#71717a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Supervisor Monthly Pay</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
            {([['Pending', sup.pending, '#facc15'], ['Approved', sup.approved, '#60a5fa'], ['Paid', sup.paid, '#4ade80']] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: c }}>{v ?? 0}</div>
                <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#71717a' }}>Total: <span style={{ color: '#a78bfa', fontWeight: 700 }}>₹{Number(sup.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>⚡ Auto-generated on the 5th of each month</div>
        </div>

        <div style={{ ...S.card, padding: '18px 20px', borderTop: '2px solid #facc15' }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: '#71717a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Contractor Project Pay</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
            {([['Pending', con.pending, '#facc15'], ['Paid', con.paid, '#4ade80']] as [string, number, string][]).map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: c }}>{v ?? 0}</div>
                <div style={{ fontSize: 13, color: '#71717a', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: '#71717a' }}>All-time paid: <span style={{ color: '#facc15', fontWeight: 700 }}>₹{Number(con.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>⚡ Fixed amount per project · Supervisor approves</div>
        </div>

        <div style={{ ...S.card, padding: '18px 20px', borderTop: '2px solid #4ade80' }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: '#71717a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>Labourer Daily Pay</div>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: '#4ade80', marginBottom: 6 }}>
            {lab.total_records ?? 0} <span style={{ fontSize: 13, color: '#a1a1aa' }}>records</span>
          </div>
          <div style={{ fontSize: 13, color: '#71717a' }}>All-time: <span style={{ color: '#4ade80', fontWeight: 700 }}>₹{Number(lab.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>Today: <span style={{ color: '#4ade80', fontWeight: 700 }}>₹{Number(lab.today || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
          <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>⚡ Auto-paid when attendance is marked</div>
        </div>
      </div>

      {/* Month filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={S.label}>Month (Supervisor payroll)</label>
          <input type="month" className="pr-input" style={S.input} value={monthFilter} onChange={e => setMonth(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#0a0a0a', border: '1px solid #1a1a1a', padding: 4 }}>
        {([['supervisor', 'Supervisor Monthly'], ['contractor', 'Contractor Projects'], ['labourer', 'Labourer Daily']] as [string, string][]).map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            flex: 1, padding: '9px 0',
            background: tab === key ? '#dc2626' : 'transparent',
            color: tab === key ? 'white' : '#52525b', border: 'none',
            fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s',
          }}>{lbl}</button>
        ))}
      </div>

      {tab === 'supervisor' && <SupervisorPayrollTable canApprove monthFilter={monthFilter} onRefreshDash={load} />}
      {tab === 'contractor' && <ContractorPayrollTable />}
      {tab === 'labourer'   && <LabourerPayrollTable />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUPERVISOR VIEW
// ═══════════════════════════════════════════════════════════════════
function SupervisorView() {
  const [dash, setDash] = useState<any>({});
  useEffect(() => { apiClient.get('/payroll/dashboard/').then(r => setDash(r.data)).catch(() => {}); }, []);
  const my = dash.my_salary || {};
  const cp = dash.contractor_payouts || {};

  return (
    <div style={{ animation: 'pageIn 0.4s ease' }}>
      <style>{`@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .pr-row:hover td{background:#111!important} select option{background:#141414;color:white} .pr-input:focus{border-bottom-color:#dc2626!important}`}</style>
      <PageHeader sub="Supervisor Portal" title="Payroll" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginBottom: 28 }}>
        <StatCard label="Total Earned"     value={`₹${Number(my.total_earned || 0).toLocaleString('en-IN')}`} color="#4ade80" />
        <StatCard label="Next Payment"     value={`₹${Number(my.next_pending || 0).toLocaleString('en-IN')}`} color="#facc15" />
        <StatCard label="Contractor Pending Payouts" value={cp.pending ?? 0} color="#facc15" sub="Awaiting your approval" />
        <StatCard label="Contractor Paid"  value={cp.paid ?? 0}  color="#4ade80" />
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading>My Monthly Salary</SectionHeading>
        <SupervisorPayrollTable canApprove={false} />
      </div>

      <SectionHeading>Contractor Project Payouts</SectionHeading>
      <ContractorPayrollTable />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONTRACTOR VIEW
// ═══════════════════════════════════════════════════════════════════
function ContractorView() {
  const [dash, setDash] = useState<any>({});
  useEffect(() => { apiClient.get('/payroll/dashboard/').then(r => setDash(r.data)).catch(() => {}); }, []);
  const my = dash.my_projects || {};

  return (
    <div style={{ animation: 'pageIn 0.4s ease' }}>
      <style>{`@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} .pr-row:hover td{background:#111!important} select option{background:#141414;color:white}`}</style>
      <PageHeader sub="Contractor Portal" title="Payroll" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginBottom: 28 }}>
        <StatCard label="Total Earned"      value={`₹${Number(my.total_earned || 0).toLocaleString('en-IN')}`} color="#4ade80" />
        <StatCard label="Pending Amount"    value={`₹${Number(my.pending_amount || 0).toLocaleString('en-IN')}`} color="#facc15" />
        <StatCard label="Labourers Today"   value={`₹${Number(dash.labourer_today || 0).toLocaleString('en-IN')}`} color="#60a5fa" />
        <StatCard label="Labourers This Month" value={`₹${Number(dash.labourer_month || 0).toLocaleString('en-IN')}`} color="#a78bfa" />
      </div>

      <div style={{ marginBottom: 32 }}>
        <SectionHeading>My Project Payments</SectionHeading>
        <ContractorPayrollTable />
      </div>

      <SectionHeading>My Labourers' Daily Pay</SectionHeading>
      <LabourerPayrollTable />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUPERVISOR PAYROLL TABLE (HR can approve / mark paid)
// ═══════════════════════════════════════════════════════════════════
function SupervisorPayrollTable({ canApprove = false, monthFilter = '', onRefreshDash }: { canApprove?: boolean; monthFilter?: string; onRefreshDash?: () => void }) {
  const [records, setRecords]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm]   = useState<any>({});
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/payroll/supervisor/?';
      if (monthFilter) url += `month=${monthFilter}&`;
      const res = await apiClient.get(url);
      setRecords(extractResults(res.data));
    } catch {}
    finally { setLoading(false); }
  }, [monthFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number, newStatus: 'APPROVED' | 'PAID') => {
    try {
      await apiClient.patch(`/payroll/supervisor/${id}/`, { status: newStatus });
      load(); onRefreshDash?.();
    } catch { alert('Failed to update.'); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiClient.patch(`/payroll/supervisor/${editingId}/`, editForm);
      setEditingId(null); load();
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
    finally { setSaving(false); }
  };

  const total = records.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase' }}>
          {records.length} records · ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        <button style={S.btnGhost} onClick={load}><RefreshCw size={11} />Refresh</button>
      </div>

      {loading ? <Loader /> : records.length === 0 ? (
        <Empty msg="No supervisor payroll records. Run: python manage.py generate_supervisor_payroll" />
      ) : (
        <div style={{ ...S.card, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                {['Supervisor', 'Month', 'Salary', 'Bonus', 'Deductions', 'Total', 'Status', ...(canApprove ? ['Actions'] : [])].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const bg = i % 2 === 0 ? '#0d0d0d' : '#0a0a0a';
                return (
                  <tr key={r.id} className="pr-row">
                    <td style={{ ...S.td, background: bg }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{r.supervisor_name}</div>
                      {r.approved_by_name && <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>✓ {r.approved_by_name}</div>}
                    </td>
                    <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", color: 'white', fontWeight: 700 }}>{r.month_display}</td>
                    <td style={{ ...S.td, background: bg }}>₹{Number(r.monthly_salary).toLocaleString('en-IN')}</td>
                    <td style={{ ...S.td, background: bg, color: '#4ade80' }}>+₹{Number(r.bonus || 0).toLocaleString('en-IN')}</td>
                    <td style={{ ...S.td, background: bg, color: '#f87171' }}>-₹{Number(r.deductions || 0).toLocaleString('en-IN')}</td>
                    <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 900, color: '#4ade80' }}>
                      ₹{Number(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...S.td, background: bg }}><StatusBadge status={r.status} /></td>
                    {canApprove && (
                      <td style={{ ...S.td, background: bg }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {r.status === 'PENDING' && (
                            <button onClick={() => { setEditingId(r.id); setEditForm({ monthly_salary: r.monthly_salary, bonus: r.bonus || 0, deductions: r.deductions || 0, notes: r.notes || '' }); }}
                              style={{ padding: '4px 9px', background: '#141414', border: '1px solid #1e1e1e', color: '#a1a1aa', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
                              EDIT
                            </button>
                          )}
                          {r.status === 'PENDING' && (
                            <button onClick={() => approve(r.id, 'APPROVED')}
                              style={{ padding: '4px 9px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle size={9} /> APPROVE
                            </button>
                          )}
                          {r.status === 'APPROVED' && (
                            <button onClick={() => approve(r.id, 'PAID')}
                              style={{ padding: '4px 9px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1 }}>
                              MARK PAID
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editingId !== null && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 900, color: 'white', textTransform: 'uppercase' }}>Adjust Payroll</div>
              <button onClick={() => setEditingId(null)} style={{ background: '#1a1a1a', border: 'none', color: '#a1a1aa', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={13} /></button>
            </div>
            <form onSubmit={saveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={S.label}>Monthly Salary (₹)</label>
                  <input className="pr-input" type="number" min="0" step="0.01" style={S.input} value={editForm.monthly_salary} onChange={e => setEditForm({ ...editForm, monthly_salary: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Bonus (₹)</label>
                  <input className="pr-input" type="number" min="0" step="0.01" style={S.input} value={editForm.bonus} onChange={e => setEditForm({ ...editForm, bonus: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Deductions (₹)</label>
                  <input className="pr-input" type="number" min="0" step="0.01" style={S.input} value={editForm.deductions} onChange={e => setEditForm({ ...editForm, deductions: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={S.label}>Notes</label>
                  <input className="pr-input" style={S.input} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={saving} style={{ ...S.btn, background: saving ? '#27272a' : '#dc2626' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" style={S.btnGhost} onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CONTRACTOR PROJECT PAYROLL TABLE
// ═══════════════════════════════════════════════════════════════════
function ContractorPayrollTable() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/payroll/contractor/');
      setRecords(extractResults(res.data));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approvePayout = async (id: number) => {
    if (!window.confirm('Mark this project payment as PAID?')) return;
    try {
      await apiClient.patch(`/payroll/contractor/${id}/`, { status: 'PAID' });
      load();
    } catch { alert('Failed to approve.'); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase' }}>
          {records.length} project payroll records
        </span>
        <button style={S.btnGhost} onClick={load}><RefreshCw size={11} />Refresh</button>
      </div>

      {loading ? <Loader /> : records.length === 0 ? (
        <Empty msg="No contractor payroll records yet. Assign contractors to projects via the Projects tab." />
      ) : (
        <div style={{ ...S.card, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                {['Contractor', 'Project', 'Supervisor', 'Contract Amt', 'Advance', 'Deductions', 'Total', 'Status', ...(user?.role !== 'CONTRACTOR' ? ['Actions'] : [])].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const bg = i % 2 === 0 ? '#0d0d0d' : '#0a0a0a';
                return (
                  <tr key={r.id} className="pr-row">
                    <td style={{ ...S.td, background: bg }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{r.contractor_name}</div>
                      {r.contractor_company && <div style={{ fontSize: 12, color: '#a1a1aa', marginTop: 2 }}>{r.contractor_company}</div>}
                    </td>
                    <td style={{ ...S.td, background: bg, color: 'white', fontWeight: 600 }}>{r.project_name}</td>
                    <td style={{ ...S.td, background: bg }}>{r.supervisor_name || '—'}</td>
                    <td style={{ ...S.td, background: bg }}>₹{Number(r.contract_amount).toLocaleString('en-IN')}</td>
                    <td style={{ ...S.td, background: bg, color: '#f87171' }}>
                      {Number(r.advance_paid) > 0 ? `-₹${Number(r.advance_paid).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ ...S.td, background: bg, color: '#f87171' }}>
                      {Number(r.deductions) > 0 ? `-₹${Number(r.deductions).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 18, fontWeight: 900, color: '#4ade80' }}>
                      ₹{Number(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...S.td, background: bg }}><StatusBadge status={r.status} /></td>
                    {user?.role !== 'CONTRACTOR' && (
                      <td style={{ ...S.td, background: bg }}>
                        {r.status === 'PENDING' && (
                          <button onClick={() => approvePayout(r.id)}
                            style={{ padding: '4px 10px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', color: '#4ade80', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'Barlow Condensed',sans-serif" }}>
                            <CheckCircle size={9} /> PAY NOW
                          </button>
                        )}
                        {r.status === 'PAID' && r.approved_by_name && (
                          <div style={{ fontSize: 12, color: '#71717a' }}>✓ {r.approved_by_name}</div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LABOURER DAILY PAYROLL TABLE — read-only
// ═══════════════════════════════════════════════════════════════════
function LabourerPayrollTable() {
  const [records, setRecords]       = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [dateFilter, setDate]       = useState('');
  const [projectFilter, setProject] = useState('');
  const [projects, setProjects]     = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/attendance/projects/').then(r => setProjects(extractResults(r.data))).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/payroll/labourer/?';
      if (dateFilter)    url += `date=${dateFilter}&`;
      if (projectFilter) url += `project=${projectFilter}&`;
      const res = await apiClient.get(url);
      setRecords(extractResults(res.data));
    } catch {}
    finally { setLoading(false); }
  }, [dateFilter, projectFilter]);

  useEffect(() => { load(); }, [load]);

  const total = records.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={S.label}>Filter by Date</label>
          <input type="date" style={S.input} value={dateFilter} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label style={S.label}>Filter by Project</label>
          <select style={S.select} value={projectFilter} onChange={e => setProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase' }}>
          {records.length} records · ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
        <button style={S.btnGhost} onClick={load}><RefreshCw size={11} />Refresh</button>
      </div>

      {loading ? <Loader /> : records.length === 0 ? (
        <Empty msg="No labourer payroll records yet. Mark attendance to auto-generate." />
      ) : (
        <div style={{ ...S.card, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
                {['Date', 'Worker', 'Contractor', 'Project', 'Daily Wage', 'OT Hrs', 'Total', 'Attendance', 'Status'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const bg    = i % 2 === 0 ? '#0d0d0d' : '#0a0a0a';
                const otPay = parseFloat(r.overtime_hours || 0) * parseFloat(r.overtime_rate || 0);
                return (
                  <tr key={r.id} className="pr-row">
                    <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", color: 'white', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.date}</td>
                    <td style={{ ...S.td, background: bg }}>
                      <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{r.labourer_name}</div>
                      {r.is_temp && <span style={{ fontSize: 13, color: '#facc15', display: 'block', marginTop: 2 }}>TEMP</span>}
                    </td>
                    <td style={{ ...S.td, background: bg }}>{r.contractor_name || '—'}</td>
                    <td style={{ ...S.td, background: bg }}>{r.project_name}</td>
                    <td style={{ ...S.td, background: bg }}>₹{Number(r.daily_wage).toLocaleString('en-IN')}</td>
                    <td style={{ ...S.td, background: bg }}>{parseFloat(r.overtime_hours || 0).toFixed(1)}h</td>
                    <td style={{ ...S.td, background: bg, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 17, fontWeight: 900, color: '#4ade80', whiteSpace: 'nowrap' }}>
                      ₹{Number(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ ...S.td, background: bg }}>
                      <span style={{ fontSize: 12, color: '#a1a1aa', background: '#111', padding: '2px 8px', letterSpacing: 1 }}>{r.attendance_status}</span>
                    </td>
                    <td style={{ ...S.td, background: bg }}><StatusBadge status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
