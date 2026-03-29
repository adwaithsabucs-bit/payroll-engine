// frontend/src/pages/UsersPage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState, useCallback } from 'react';
import { getUsers, createUser } from '../api/auth';
import { getContractors } from '../api/workforce';
import { User } from '../types';
import { extractResults } from '../utils/pagination';
import {
  Plus, Pencil, X, Search, Users, Briefcase, HardHat,
  Shield, ChevronDown, Crown, KeyRound, Eye, EyeOff, Lock,
} from 'lucide-react';
import apiClient from '../api/client';

type RoleFilter = 'ALL' | 'HR' | 'SUPERVISOR' | 'CONTRACTOR' | 'LABOURER';
type PageTab    = 'users' | 'passwords';

const ROLE_META: Record<string, { color: string; icon: any }> = {
  HR:         { color: '#a78bfa', icon: Shield    },
  SUPERVISOR: { color: '#60a5fa', icon: Users     },
  CONTRACTOR: { color: '#facc15', icon: Briefcase },
  LABOURER:   { color: '#4ade80', icon: HardHat   },
};

const defaultForm = {
  username: '', email: '', first_name: '', last_name: '',
  password: '', password2: '', role: 'LABOURER', phone: '',
  daily_wage: '0', overtime_rate: '0', skill: '',
  contractor_id: '', supervisor_id: '',
};
const defaultEditForm = {
  username: '', email: '', first_name: '', last_name: '',
  role: 'LABOURER', phone: '',
  daily_wage: '0', overtime_rate: '0', skill: '',
  contractor_id: '', supervisor_id: '',
};

const S = {
  label:    { display: 'block', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a1a1aa', fontWeight: 700, marginBottom: 8 },
  input:    { width: '100%', background: '#141414', border: '1px solid #1e1e1e', borderBottom: '2px solid #222', color: 'white', padding: '12px 14px', fontFamily: "'Inter',sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s', borderRadius: 4 },
  btn:      { display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dc2626', color: 'white', border: 'none', padding: '11px 22px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer', borderRadius: 6 },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#d4d4d8', border: '1px solid #3f3f46', padding: '10px 20px', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, cursor: 'pointer', borderRadius: 6 },
  profSec:  { background: '#141414', border: '1px solid #1e1e1e', borderLeft: '2px solid #dc2626', padding: 20, marginBottom: 18, borderRadius: 4 } as React.CSSProperties,
  profTitle:{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#dc2626', marginBottom: 16 },
  overlay:  { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 },
  modal:    { background: '#0d0d0d', border: '1px solid #1e1e1e', borderTop: '3px solid #dc2626', width: '100%', maxWidth: 660, maxHeight: '90vh', overflowY: 'auto' as const, padding: 32, borderRadius: 8 },
  errorBox: { background: 'rgba(220,38,38,0.07)', borderLeft: '3px solid #dc2626', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5', borderRadius: 4 } as React.CSSProperties,
};

const getContractorName = (c: any): string => {
  const n = c.user_detail || c.user || {};
  return [n.first_name, n.last_name || n.username].filter(Boolean).join(' ').trim()
    || c.username || `Contractor #${c.id}`;
};

// ── Shared form field components ────────────────────────────────

interface CreateFieldsProps {
  f: typeof defaultForm; setF: (v: typeof defaultForm) => void;
  contractors: any[]; supervisors: User[];
}
const CreateFormFields = ({ f, setF, contractors, supervisors }: CreateFieldsProps) => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div><label style={S.label}>Username *</label><input className="pe-input" style={S.input} type="text" required value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></div>
      <div><label style={S.label}>Email *</label><input className="pe-input" style={S.input} type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
      <div><label style={S.label}>First Name</label><input className="pe-input" style={S.input} type="text" value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} /></div>
      <div><label style={S.label}>Last Name</label><input className="pe-input" style={S.input} type="text" value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} /></div>
      <div><label style={S.label}>Password *</label><input className="pe-input" style={S.input} type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
      <div><label style={S.label}>Confirm Password *</label><input className="pe-input" style={S.input} type="password" required value={f.password2} onChange={e => setF({ ...f, password2: e.target.value })} /></div>
      <div><label style={S.label}>Phone</label><input className="pe-input" style={S.input} type="text" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
      <div>
        <label style={S.label}>Role *</label>
        <select className="pe-input" style={S.input} value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
          <option value="HR">HR Manager</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="LABOURER">Labourer</option>
        </select>
      </div>
    </div>

    {f.role !== 'HR' && (
      <div style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 4, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#a1a1aa' }}>
        🏢 Company name will be automatically inherited from the Primary HR Admin.
      </div>
    )}

    {f.role === 'LABOURER' && (
      <div style={S.profSec}>
        <div style={S.profTitle}>⬡ Labourer Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={S.label}>Daily Wage (₹)</label><input className="pe-input" style={S.input} type="number" min="0" step="0.01" value={f.daily_wage} onChange={e => setF({ ...f, daily_wage: e.target.value })} /></div>
          <div><label style={S.label}>OT Rate (₹/hr)</label><input className="pe-input" style={S.input} type="number" min="0" step="0.01" value={f.overtime_rate} onChange={e => setF({ ...f, overtime_rate: e.target.value })} /></div>
          <div><label style={S.label}>Skill</label><input className="pe-input" style={S.input} type="text" placeholder="e.g. Mason" value={f.skill} onChange={e => setF({ ...f, skill: e.target.value })} /></div>
        </div>
        <div>
          <label style={S.label}>Assign to Contractor</label>
          <select className="pe-input" style={S.input} value={f.contractor_id} onChange={e => setF({ ...f, contractor_id: e.target.value })}>
            <option value="">— No contractor yet —</option>
            {contractors.map((c: any) => (
              <option key={c.id} value={c.id}>{getContractorName(c)}{c.company_name ? ` — ${c.company_name}` : ''}</option>
            ))}
          </select>
        </div>
      </div>
    )}

    {f.role === 'CONTRACTOR' && (
      <div style={S.profSec}>
        <div style={S.profTitle}>⬡ Contractor Profile</div>
        <div>
          <label style={S.label}>Assign Supervisor</label>
          <select className="pe-input" style={S.input} value={f.supervisor_id} onChange={e => setF({ ...f, supervisor_id: e.target.value })}>
            <option value="">— No supervisor yet —</option>
            {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.first_name} {sv.last_name || sv.username}</option>)}
          </select>
        </div>
      </div>
    )}
  </>
);

interface EditFieldsProps {
  f: typeof defaultEditForm; setF: (v: typeof defaultEditForm) => void;
  isPrimaryAdmin: boolean; contractors: any[]; supervisors: User[];
  companyName: string; onCompanyChange: (v: string) => void;
}
const EditFormFields = ({ f, setF, isPrimaryAdmin, contractors, supervisors, companyName, onCompanyChange }: EditFieldsProps) => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <div><label style={S.label}>Username *</label><input className="pe-input" style={S.input} type="text" required value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></div>
      <div><label style={S.label}>Email *</label><input className="pe-input" style={S.input} type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
      <div><label style={S.label}>First Name</label><input className="pe-input" style={S.input} type="text" value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} /></div>
      <div><label style={S.label}>Last Name</label><input className="pe-input" style={S.input} type="text" value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} /></div>
      <div><label style={S.label}>Phone</label><input className="pe-input" style={S.input} type="text" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
      <div>
        <label style={S.label}>Role *</label>
        <select className="pe-input" style={S.input} value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>
          <option value="HR">HR Manager</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="CONTRACTOR">Contractor</option>
          <option value="LABOURER">Labourer</option>
        </select>
      </div>
    </div>

    {isPrimaryAdmin ? (
      <div style={{ ...S.profSec, borderLeft: '2px solid #dc2626' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Crown size={14} color="#dc2626" />
          <span style={{ ...S.profTitle, margin: 0 }}>Primary Admin — Company Settings</span>
        </div>
        <div>
          <label style={S.label}>Company Name <span style={{ color: '#dc2626' }}>(applies to ALL users)</span></label>
          <input className="pe-input" style={S.input} type="text" placeholder="e.g. ABC Construction Ltd" value={companyName} onChange={e => onCompanyChange(e.target.value)} />
          <div style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6 }}>⚡ Saving this will update the company name for every user in the system.</div>
        </div>
      </div>
    ) : (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1e1e1e', borderRadius: 4, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#71717a' }}>
        🏢 Company: <span style={{ color: 'white', fontWeight: 600 }}>{companyName || 'Not set by admin'}</span>
        <span style={{ color: '#71717a', marginLeft: 8 }}>(Only Primary Admin can change this)</span>
      </div>
    )}

    {f.role === 'LABOURER' && (
      <div style={S.profSec}>
        <div style={S.profTitle}>⬡ Labourer Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label style={S.label}>Daily Wage (₹)</label><input className="pe-input" style={S.input} type="number" min="0" step="0.01" value={f.daily_wage} onChange={e => setF({ ...f, daily_wage: e.target.value })} /></div>
          <div><label style={S.label}>OT Rate (₹/hr)</label><input className="pe-input" style={S.input} type="number" min="0" step="0.01" value={f.overtime_rate} onChange={e => setF({ ...f, overtime_rate: e.target.value })} /></div>
          <div><label style={S.label}>Skill</label><input className="pe-input" style={S.input} type="text" value={f.skill} onChange={e => setF({ ...f, skill: e.target.value })} /></div>
        </div>
        <div>
          <label style={S.label}>Assign to Contractor</label>
          <select className="pe-input" style={S.input} value={f.contractor_id} onChange={e => setF({ ...f, contractor_id: e.target.value })}>
            <option value="">— No contractor yet —</option>
            {contractors.map((c: any) => (
              <option key={c.id} value={c.id}>{getContractorName(c)}{c.company_name ? ` — ${c.company_name}` : ''}</option>
            ))}
          </select>
        </div>
      </div>
    )}

    {f.role === 'CONTRACTOR' && (
      <div style={S.profSec}>
        <div style={S.profTitle}>⬡ Contractor Profile</div>
        <div>
          <label style={S.label}>Assign Supervisor</label>
          <select className="pe-input" style={S.input} value={f.supervisor_id} onChange={e => setF({ ...f, supervisor_id: e.target.value })}>
            <option value="">— No supervisor yet —</option>
            {supervisors.map(sv => <option key={sv.id} value={sv.id}>{sv.first_name} {sv.last_name || sv.username}</option>)}
          </select>
        </div>
      </div>
    )}
  </>
);

// ── Role section (collapsible table) ────────────────────────────

const RoleSection = ({ title, users, color, icon: Icon, onEdit, primaryAdminId }: {
  title: string; users: User[]; color: string; icon: any;
  onEdit: (u: User) => void; primaryAdminId: number | null;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  if (users.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div onClick={() => setCollapsed(!collapsed)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: `${color}08`, border: `1px solid ${color}20`, borderLeft: `3px solid ${color}`, borderRadius: collapsed ? 8 : '8px 8px 0 0', cursor: 'pointer', userSelect: 'none' as const }}>
        <Icon size={15} color={color} />
        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' as const, color }}>{title}</span>
        <span style={{ fontSize: 13, color, background: `${color}15`, padding: '2px 9px', borderRadius: 10, fontWeight: 700 }}>{users.length}</span>
        <ChevronDown size={14} color={color} style={{ marginLeft: 'auto', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      {!collapsed && (
        <div style={{ border: '1px solid #1a1a1a', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1.4fr 1.2fr 1.5fr 120px 110px', gap: 8, padding: '8px 16px', background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
            {['#', 'Name', 'Company', 'Email', 'Phone', ''].map(h => (
              <span key={h} style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#a1a1aa', fontWeight: 700 }}>{h}</span>
            ))}
          </div>
          {users.map((u, i) => {
            const isPrimary = u.id === primaryAdminId;
            return (
              <div key={u.id} className="pe-row" style={{ display: 'grid', gridTemplateColumns: '40px 1.4fr 1.2fr 1.5fr 120px 110px', alignItems: 'center', padding: '13px 16px', background: i % 2 === 0 ? '#0d0d0d' : '#0a0a0a', borderBottom: i < users.length - 1 ? '1px solid #111' : 'none', gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#71717a', fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>
                      {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                    </span>
                    {isPrimary && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', padding: '1px 6px', borderRadius: 10 }}>
                        <Crown size={8} /> Primary
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>@{u.username}</div>
                </div>
                <div style={{ fontSize: 12, color: '#d4d4d8' }}>{(u as any).company_name || <span style={{ color: '#27272a' }}>—</span>}</div>
                <div style={{ fontSize: 12, color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>
                <div style={{ fontSize: 12, color: '#a1a1aa' }}>{u.phone || <span style={{ color: '#27272a' }}>—</span>}</div>
                <button onClick={() => onEdit(u)} className="pe-edit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#141414', color: '#d4d4d8', border: '1px solid #3f3f46', borderRadius: 5, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <Pencil size={10} /> Edit
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── HR Change Password Modal ─────────────────────────────────────

function ChangePasswordModal({ target, onClose, onSuccess }: {
  target: any; onClose: () => void; onSuccess: (username: string) => void;
}) {
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return; }
    if (newPw.length < 8)    { setError('Password must be at least 8 characters.'); return; }
    setSaving(true); setError('');
    try {
      await apiClient.post(`/auth/users/${target.id}/set-password/`, {
        new_password: newPw, confirm_password: confirmPw,
      });
      onSuccess(target.username);
      onClose();
    } catch (err: any) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' | ') : 'Failed to update password.');
    } finally { setSaving(false); }
  };

  const roleColor = ROLE_META[target.role]?.color || '#a1a1aa';

  return (
    <div style={S.overlay}>
      <div style={{ ...S.modal, maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #1a1a1a' }}>
          <div>
            <div style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>HR Administration</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 900, color: 'white', textTransform: 'uppercase', lineHeight: 1 }}>Change Password</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{target.username}</span>
              <span style={{ fontSize: 13, color: roleColor, background: `${roleColor}15`, padding: '2px 8px', borderRadius: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{target.role}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#1a1a1a', border: '1px solid #222', color: '#a1a1aa', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6 }}><X size={16} /></button>
        </div>

        {error && <div style={S.errorBox}>⚠ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>New Password *</label>
            <div style={{ position: 'relative' }}>
              <input className="pe-input" style={S.input} type={showPw ? 'text' : 'password'} required value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters" />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 0 }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={S.label}>Confirm Password *</label>
            <input className="pe-input" style={S.input} type={showPw ? 'text' : 'password'} required value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="submit" disabled={saving} style={{ ...S.btn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Set Password →'}</button>
            <button type="button" style={S.btnGhost} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Passwords Tab ────────────────────────────────────────────────

function PasswordsTab({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [pwData, setPwData]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [revealAll, setRevealAll]     = useState(false);
  const [revealed, setRevealed]       = useState<Record<number, boolean>>({});
  const [changingUser, setChangingUser] = useState<any>(null);
  const [successMsg, setSuccessMsg]   = useState('');

  const loadPasswords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/auth/passwords/');
      setPwData(extractResults<any>(res.data));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPasswords(); }, [loadPasswords]);

  const filtered = pwData.filter(u => {
    const q = search.toLowerCase();
    return !q
      || u.username.toLowerCase().includes(q)
      || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      || u.role.toLowerCase().includes(q);
  });

  const toggleReveal = (id: number) =>
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));

  const isVisible = (id: number) => revealAll || !!revealed[id];

  const handleSuccess = (username: string) => {
    setSuccessMsg(`Password updated for ${username}.`);
    loadPasswords();
    onPasswordChanged();
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '60px 0', color: '#71717a' }}>
      <div style={{ width: 40, height: 2, background: '#161616', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#dc2626', animation: 'loadBar 1s ease infinite' }} />
      </div>
      Loading passwords...
    </div>
  );

  return (
    <div>
      {/* Warning banner */}
      <div style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderLeft: '3px solid #dc2626', borderRadius: 6, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Lock size={15} color="#dc2626" />
        <span style={{ fontSize: 12, color: '#fca5a5' }}>
          Sensitive area — passwords are visible only to HR administrators. Handle with care.
        </span>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(22,163,74,0.07)', borderLeft: '3px solid #16a34a', padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#4ade80', borderRadius: 4 }}>{successMsg}</div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
          <input className="pe-input" style={{ ...S.input, paddingLeft: 36, borderRadius: 6 }} type="text" placeholder="Search user..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          className="pe-filter"
          onClick={() => setRevealAll(!revealAll)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: revealAll ? 'rgba(220,38,38,0.1)' : '#0d0d0d', border: `1px solid ${revealAll ? '#dc2626' : '#1e1e1e'}`, borderRadius: 6, color: revealAll ? '#fca5a5' : '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
          {revealAll ? <EyeOff size={13} /> : <Eye size={13} />}
          {revealAll ? 'Hide All' : 'Reveal All'}
        </button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #1a1a1a', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1.8fr 1fr 1.8fr 60px', gap: 8, padding: '10px 16px', background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
          {['#', 'User', 'Role', 'Password', ''].map(h => (
            <span key={h} style={{ fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 700 }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#71717a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>No users found</div>
        ) : filtered.map((u, i) => {
          const roleColor = ROLE_META[u.role]?.color || '#a1a1aa';
          const visible   = isVisible(u.id);
          const hasPlain  = !!u.plain_password;
          return (
            <div key={u.id} className="pe-row" style={{ display: 'grid', gridTemplateColumns: '40px 1.8fr 1fr 1.8fr 60px', alignItems: 'center', padding: '13px 16px', background: i % 2 === 0 ? '#0d0d0d' : '#0a0a0a', borderBottom: i < filtered.length - 1 ? '1px solid #111' : 'none', gap: 8 }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, color: '#71717a', fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>

              <div>
                <div style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>
                  {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                </div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 1 }}>@{u.username}</div>
              </div>

              <span style={{ fontSize: 12, color: roleColor, background: `${roleColor}15`, padding: '3px 10px', borderRadius: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', width: 'fit-content' }}>{u.role}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {hasPlain ? (
                  <>
                    <span style={{ fontFamily: "'Courier New',monospace", fontSize: 13, color: visible ? 'white' : '#3f3f46', background: '#111', border: '1px solid #1e1e1e', padding: '5px 10px', borderRadius: 4, letterSpacing: visible ? 2 : 1, userSelect: visible ? 'text' : 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {visible ? u.plain_password : '••••••••'}
                    </span>
                    <button onClick={() => toggleReveal(u.id)} style={{ background: '#141414', border: '1px solid #1e1e1e', color: '#a1a1aa', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 4, flexShrink: 0 }}>
                      {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: '#71717a', fontStyle: 'italic' }}>— not recorded —</span>
                )}
              </div>

              <button
                onClick={() => setChangingUser(u)}
                className="pe-edit-btn"
                title="Change password"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '6px 10px', background: '#141414', color: '#d4d4d8', border: '1px solid #3f3f46', borderRadius: 5, cursor: 'pointer', transition: 'all 0.15s' }}>
                <KeyRound size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 13, color: '#71717a' }}>
        "Not recorded" = user was created before password tracking was enabled. Use the 🔑 button to set a known password for them.
      </div>

      {changingUser && (
        <ChangePasswordModal
          target={changingUser}
          onClose={() => setChangingUser(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function UsersPage() {
  const [activeTab, setActiveTab]           = useState<PageTab>('users');
  const [users, setUsers]                   = useState<User[]>([]);
  const [contractors, setContractors]       = useState<any[]>([]);
  const [supervisors, setSupervisors]       = useState<User[]>([]);
  const [primaryAdminId, setPrimaryAdminId] = useState<number | null>(null);
  const [globalCompany, setGlobalCompany]   = useState('');
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState(defaultForm);
  const [submitting, setSubmitting]         = useState(false);
  const [message, setMessage]               = useState('');
  const [isError, setIsError]               = useState(false);
  const [createError, setCreateError]       = useState('');
  const [search, setSearch]                 = useState('');
  const [roleFilter, setRoleFilter]         = useState<RoleFilter>('ALL');
  const [editUser, setEditUser]             = useState<any>(null);
  const [editForm, setEditForm]             = useState<typeof defaultEditForm>(defaultEditForm);
  const [editCompany, setEditCompany]       = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage]       = useState('');
  const [editIsError, setEditIsError]       = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, supRes, conRes] = await Promise.all([
        getUsers(), getUsers('SUPERVISOR'), getContractors(),
      ]);
      const allUsers = extractResults<User>(uRes.data);
      setUsers(allUsers);
      setSupervisors(extractResults<User>(supRes.data));
      setContractors(extractResults<any>(conRes.data));
      const hrUsers = allUsers.filter(u => u.role === 'HR').sort((a, b) => a.id - b.id);
      if (hrUsers.length > 0) {
        setPrimaryAdminId(hrUsers[0].id);
        setGlobalCompany((hrUsers[0] as any).company_name || '');
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'ALL' || u.role === roleFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q
      || u.username.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || `${u.first_name} ${u.last_name}`.toLowerCase().includes(q)
      || ((u as any).company_name || '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const byRole    = (r: string) => filtered.filter(u => u.role === r);
  const countRole = (r: string) => users.filter(u => u.role === r).length;

  const openCreateModal = () => { setForm(defaultForm); setCreateError(''); setShowForm(true); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setCreateError('');
    try {
      const payload: any = {
        username: form.username, email: form.email,
        first_name: form.first_name, last_name: form.last_name,
        password: form.password, password2: form.password2,
        role: form.role, phone: form.phone,
      };
      if (form.role === 'LABOURER') {
        payload.daily_wage    = parseFloat(form.daily_wage) || 0;
        payload.overtime_rate = parseFloat(form.overtime_rate) || 0;
        payload.skill         = form.skill;
        if (form.contractor_id) payload.contractor_id = parseInt(form.contractor_id);
      }
      if (form.role === 'CONTRACTOR' && form.supervisor_id)
        payload.supervisor_id = parseInt(form.supervisor_id);
      await createUser(payload);
      setMessage('User created successfully.'); setIsError(false);
      setShowForm(false); setForm(defaultForm); fetchData();
    } catch (err: any) {
      const d = err.response?.data;
      setCreateError(d
        ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        : 'Failed to create user.'
      );
    } finally { setSubmitting(false); }
  };

  const openEdit = async (user: User) => {
    setEditMessage(''); setEditIsError(false);
    const base: typeof defaultEditForm = {
      ...defaultEditForm,
      username: user.username, email: user.email,
      first_name: user.first_name || '', last_name: user.last_name || '',
      phone: user.phone || '', role: user.role,
    };
    setEditCompany((user as any).company_name || globalCompany);
    try {
      if (user.role === 'LABOURER') {
        const res = await apiClient.get(`/workforce/labourers/?user=${user.id}`);
        const r   = extractResults<any>(res.data);
        if (r.length > 0) {
          base.daily_wage    = r[0].daily_wage    || '0';
          base.overtime_rate = r[0].overtime_rate || '0';
          base.skill         = r[0].skill         || '';
          base.contractor_id = r[0].contractor ? String(r[0].contractor) : '';
        }
      } else if (user.role === 'CONTRACTOR') {
        const res = await apiClient.get(`/workforce/contractors/?user=${user.id}`);
        const r   = extractResults<any>(res.data);
        if (r.length > 0) base.supervisor_id = r[0].supervisor ? String(r[0].supervisor) : '';
      }
    } catch {}
    setEditUser(user); setEditForm(base);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault(); setEditSubmitting(true); setEditMessage('');
    try {
      const isPrimary = editUser.id === primaryAdminId;
      const payload: any = {
        username: editForm.username,
        first_name: editForm.first_name, last_name: editForm.last_name,
        email: editForm.email, phone: editForm.phone, role: editForm.role,
      };
      if (isPrimary) payload.company_name = editCompany;
      if (editForm.role === 'LABOURER') {
        payload.daily_wage    = parseFloat(editForm.daily_wage)    || 0;
        payload.overtime_rate = parseFloat(editForm.overtime_rate) || 0;
        payload.skill         = editForm.skill;
        if (editForm.contractor_id) payload.contractor_id = parseInt(editForm.contractor_id);
      }
      if (editForm.role === 'CONTRACTOR' && editForm.supervisor_id)
        payload.supervisor_id = parseInt(editForm.supervisor_id);
      await apiClient.patch(`/auth/users/${editUser.id}/`, payload);
      setEditMessage('User updated successfully.'); setEditIsError(false);
      fetchData(); setTimeout(() => setEditUser(null), 800);
    } catch (err: any) {
      const d = err.response?.data;
      setEditMessage(d
        ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        : 'Failed.'
      );
      setEditIsError(true);
    } finally { setEditSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '60px 0', color: '#71717a' }}>
      <div style={{ width: 40, height: 2, background: '#161616', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: '#dc2626', animation: 'loadBar 1s ease infinite' }} />
      </div>
      Loading users...
      <style>{`@keyframes loadBar{from{transform:translateX(-100%)}to{transform:translateX(100%)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&display=swap');
        @keyframes pageIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes loadBar { from{transform:translateX(-100%)} to{transform:translateX(100%)} }
        .pe-input:focus { border-bottom-color:#dc2626!important; background:#181818!important; }
        select.pe-input option { background:#141414; color:white; }
        .pe-row:hover { background:#111!important; }
        .pe-edit-btn:hover { background:#1e1e1e!important; color:white!important; border-color:#dc2626!important; }
        .pe-filter:hover { border-color:#dc2626!important; color:white!important; }
      `}</style>

      <div style={{ animation: 'pageIn 0.4s cubic-bezier(0.16,1,0.3,1)', color: 'white' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #161616', position: 'relative' }}>
          <div style={{ position: 'absolute', bottom: -1, left: 0, width: 64, height: 3, background: '#dc2626', borderRadius: 2 }} />
          <div>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a', marginBottom: 6, fontWeight: 600 }}>Administration</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 44, fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: -1, lineHeight: 1 }}>User Management</div>
            {globalCompany && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <span style={{ fontSize: 13, color: '#a1a1aa' }}>Company:</span>
                <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{globalCompany}</span>
              </div>
            )}
          </div>
          <button style={S.btn} onClick={openCreateModal}><Plus size={14} /> New User</button>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 28, background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          {([
            { key: 'users',     label: 'Users',     Icon: Users     },
            { key: 'passwords', label: 'Passwords', Icon: KeyRound  },
          ] as { key: PageTab; label: string; Icon: any }[]).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', background: activeTab === key ? '#dc2626' : 'transparent', color: activeTab === key ? 'white' : '#52525b', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Page-level messages */}
        {message && (
          <div style={{ background: isError ? 'rgba(220,38,38,0.07)' : 'rgba(22,163,74,0.07)', borderLeft: `3px solid ${isError ? '#dc2626' : '#16a34a'}`, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: isError ? '#fca5a5' : '#4ade80', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === 'users' && (
          <>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 2, marginBottom: 28 }}>
              {[
                { label: 'Total Users',      val: users.length,                             color: '#dc2626' },
                { label: 'HR & Supervisors', val: countRole('HR') + countRole('SUPERVISOR'), color: '#a78bfa' },
                { label: 'Contractors',      val: countRole('CONTRACTOR'),                  color: '#facc15' },
                { label: 'Labourers',        val: countRole('LABOURER'),                    color: '#4ade80' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0d0d0d', border: '1px solid #161616', padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: s.color }} />
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#71717a', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: -2, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* HR & Supervisor spotlight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
              {[
                { role: 'HR',         title: 'HR Administrators', color: '#a78bfa', Icon: Shield },
                { role: 'SUPERVISOR', title: 'Supervisors',       color: '#60a5fa', Icon: Users  },
              ].map(({ role, title, color, Icon }) => (
                <div key={role} style={{ background: '#0d0d0d', border: '1px solid #1a1a1a', borderTop: `2px solid ${color}`, borderRadius: 8, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Icon size={15} color={color} />
                    <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color }}>{title}</span>
                    <span style={{ fontSize: 13, background: `${color}15`, color, padding: '2px 9px', borderRadius: 10, fontWeight: 700, marginLeft: 'auto' }}>{countRole(role)}</span>
                  </div>
                  {users.filter(u => u.role === role).length === 0 ? (
                    <div style={{ color: '#71717a', fontSize: 12, fontStyle: 'italic' }}>None yet</div>
                  ) : users.filter(u => u.role === role).map(u => {
                    const isPrimary = u.id === primaryAdminId;
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#111', borderRadius: 6, marginBottom: 6, border: `1px solid ${isPrimary ? 'rgba(220,38,38,0.25)' : '#1a1a1a'}` }}>
                        <div style={{ width: 32, height: 32, background: isPrimary ? 'rgba(220,38,38,0.15)' : `${color}15`, border: `1px solid ${isPrimary ? 'rgba(220,38,38,0.3)' : `${color}25`}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isPrimary ? <Crown size={14} color="#dc2626" /> : <Icon size={14} color={color} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: 'white', fontSize: 13 }}>{u.first_name} {u.last_name || u.username}</span>
                            {isPrimary && <span style={{ fontSize: 11, color: '#dc2626', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', padding: '1px 6px', borderRadius: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Primary</span>}
                          </div>
                          <div style={{ fontSize: 13, color: '#71717a', marginTop: 1 }}>{(u as any).company_name || u.email}</div>
                        </div>
                        <button onClick={() => openEdit(u)} className="pe-edit-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#141414', color: '#d4d4d8', border: '1px solid #3f3f46', borderRadius: 5, fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
                          <Pencil size={10} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Search + filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
                <input className="pe-input" style={{ ...S.input, paddingLeft: 36, borderRadius: 6 }} type="text" placeholder="Search name, email, company..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['ALL', 'HR', 'SUPERVISOR', 'CONTRACTOR', 'LABOURER'] as RoleFilter[]).map(r => {
                  const active = roleFilter === r;
                  const color  = r === 'ALL' ? '#dc2626' : ROLE_META[r]?.color || '#dc2626';
                  return (
                    <button key={r} className="pe-filter" onClick={() => setRoleFilter(r)} style={{ padding: '8px 14px', background: active ? `${color}15` : '#0d0d0d', border: `1px solid ${active ? color : '#1e1e1e'}`, borderRadius: 6, color: active ? color : '#a1a1aa', fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {r === 'ALL' ? `All (${users.length})` : `${r} (${countRole(r)})`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 24, height: 2, background: '#dc2626' }} />
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: '#71717a' }}>
                {filtered.length === users.length ? `All Users — ${users.length}` : `Showing ${filtered.length} of ${users.length}`}
              </span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#71717a', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 2, textTransform: 'uppercase', fontSize: 14, border: '1px solid #1a1a1a', borderRadius: 8 }}>No users match your filter</div>
            ) : (
              <>
                <RoleSection title="HR Administrators" users={byRole('HR')}         color={ROLE_META.HR.color}         icon={ROLE_META.HR.icon}         onEdit={openEdit} primaryAdminId={primaryAdminId} />
                <RoleSection title="Supervisors"       users={byRole('SUPERVISOR')} color={ROLE_META.SUPERVISOR.color} icon={ROLE_META.SUPERVISOR.icon} onEdit={openEdit} primaryAdminId={primaryAdminId} />
                <RoleSection title="Contractors"       users={byRole('CONTRACTOR')} color={ROLE_META.CONTRACTOR.color} icon={ROLE_META.CONTRACTOR.icon} onEdit={openEdit} primaryAdminId={primaryAdminId} />
                <RoleSection title="Labourers"         users={byRole('LABOURER')}   color={ROLE_META.LABOURER.color}   icon={ROLE_META.LABOURER.icon}   onEdit={openEdit} primaryAdminId={primaryAdminId} />
              </>
            )}
          </>
        )}

        {/* ── PASSWORDS TAB ── */}
        {activeTab === 'passwords' && (
          <PasswordsTab onPasswordChanged={fetchData} />
        )}

        {/* ── Create Modal ── */}
        {showForm && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>HR Administration</div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'white', textTransform: 'uppercase' }}>Create New User</div>
                </div>
                <button onClick={() => { setShowForm(false); setForm(defaultForm); setCreateError(''); }} style={{ background: '#1a1a1a', border: '1px solid #222', color: '#a1a1aa', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6 }}><X size={16} /></button>
              </div>
              {createError && <div style={S.errorBox}>⚠ {createError}</div>}
              <form onSubmit={handleCreate}>
                <CreateFormFields f={form} setF={setForm} contractors={contractors} supervisors={supervisors} />
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button type="submit" disabled={submitting} style={{ ...S.btn, opacity: submitting ? 0.6 : 1 }}>{submitting ? 'Creating...' : 'Create User →'}</button>
                  <button type="button" style={S.btnGhost} onClick={() => { setShowForm(false); setForm(defaultForm); setCreateError(''); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Modal ── */}
        {editUser && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, letterSpacing: 5, textTransform: 'uppercase', color: '#dc2626', fontWeight: 700 }}>Editing</span>
                    {editUser.id === primaryAdminId && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#dc2626', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', padding: '2px 8px', borderRadius: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                        <Crown size={8} /> Primary Admin
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 900, color: 'white', textTransform: 'uppercase', lineHeight: 1 }}>{editUser.username}</div>
                  <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{editUser.email}</div>
                </div>
                <button onClick={() => setEditUser(null)} style={{ background: '#1a1a1a', border: '1px solid #222', color: '#a1a1aa', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: 6, flexShrink: 0 }}><X size={16} /></button>
              </div>
              {editMessage && (
                <div style={{ background: editIsError ? 'rgba(220,38,38,0.07)' : 'rgba(22,163,74,0.07)', borderLeft: `3px solid ${editIsError ? '#dc2626' : '#16a34a'}`, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: editIsError ? '#fca5a5' : '#4ade80', borderRadius: 4 }}>{editMessage}</div>
              )}
              <form onSubmit={handleEditSave}>
                <EditFormFields f={editForm} setF={setEditForm} isPrimaryAdmin={editUser.id === primaryAdminId} contractors={contractors} supervisors={supervisors} companyName={editCompany} onCompanyChange={setEditCompany} />
                <div style={{ display: 'flex', gap: 12, marginTop: 16, paddingTop: 20, borderTop: '1px solid #1a1a1a' }}>
                  <button type="submit" disabled={editSubmitting} style={{ ...S.btn, opacity: editSubmitting ? 0.6 : 1 }}>{editSubmitting ? 'Saving...' : 'Save Changes →'}</button>
                  <button type="button" style={S.btnGhost} onClick={() => setEditUser(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
