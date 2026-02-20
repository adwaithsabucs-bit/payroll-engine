import React, { useEffect, useState } from 'react';
import { getUsers, createUser } from '../api/auth';
import { getContractors } from '../api/workforce';
import { User } from '../types';
import { extractResults } from '../utils/pagination';
import { Plus, Pencil, X } from 'lucide-react';
import apiClient from '../api/client';

const ROLE_COLORS: Record<string, string> = {
  HR: '#7c3aed',
  SUPERVISOR: '#2563eb',
  CONTRACTOR: '#d97706',
  LABOURER: '#059669',
};

const defaultForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  password: '',
  password2: '',
  role: 'LABOURER',
  phone: '',
  daily_wage: '0',
  overtime_rate: '0',
  skill: '',
  contractor_id: '',
  supervisor_id: '',
  company_name: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  display: 'block',
  marginBottom: 5,
};

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Edit modal state
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editIsError, setEditIsError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, supRes, conRes] = await Promise.all([
        getUsers(),
        getUsers('SUPERVISOR'),
        getContractors(),
      ]);
      setUsers(extractResults<User>(uRes.data));
      setSupervisors(extractResults<User>(supRes.data));
      setContractors(extractResults<any>(conRes.data));
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── CREATE ──────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const payload: any = {
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        password2: form.password2,
        role: form.role,
        phone: form.phone,
      };
      if (form.role === 'LABOURER') {
        payload.daily_wage = parseFloat(form.daily_wage) || 0;
        payload.overtime_rate = parseFloat(form.overtime_rate) || 0;
        payload.skill = form.skill;
        if (form.contractor_id) payload.contractor_id = parseInt(form.contractor_id);
      }
      if (form.role === 'CONTRACTOR') {
        payload.company_name = form.company_name;
        if (form.supervisor_id) payload.supervisor_id = parseInt(form.supervisor_id);
      }
      await createUser(payload);
      setMessage('User created successfully!');
      setIsError(false);
      setShowForm(false);
      setForm(defaultForm);
      fetchData();
    } catch (err: any) {
      const d = err.response?.data;
      const msg = d
        ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        : 'Failed to create user.';
      setMessage(msg);
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // ── OPEN EDIT MODAL ──────────────────────────────────────
  const openEdit = async (user: User) => {
    setEditMessage('');
    setEditIsError(false);

    // Base fields
    const base: any = {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      // profile fields with defaults
      daily_wage: '0',
      overtime_rate: '0',
      skill: '',
      contractor_id: '',
      supervisor_id: '',
      company_name: '',
    };

    // Fetch current profile data
    try {
      if (user.role === 'LABOURER') {
        const res = await apiClient.get(`/workforce/labourers/?user=${user.id}`);
        const results = extractResults<any>(res.data);
        if (results.length > 0) {
          const p = results[0];
          base.daily_wage = p.daily_wage || '0';
          base.overtime_rate = p.overtime_rate || '0';
          base.skill = p.skill || '';
          base.contractor_id = p.contractor ? String(p.contractor) : '';
        }
      } else if (user.role === 'CONTRACTOR') {
        const res = await apiClient.get(`/workforce/contractors/?user=${user.id}`);
        const results = extractResults<any>(res.data);
        if (results.length > 0) {
          const p = results[0];
          base.company_name = p.company_name || '';
          base.supervisor_id = p.supervisor ? String(p.supervisor) : '';
        }
      }
    } catch {}

    setEditUser(user);
    setEditForm(base);
  };

  // ── SAVE EDIT ────────────────────────────────────────────
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditMessage('');
    try {
      const payload: any = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        role: editForm.role,
      };

      if (editForm.role === 'LABOURER') {
        payload.daily_wage = parseFloat(editForm.daily_wage) || 0;
        payload.overtime_rate = parseFloat(editForm.overtime_rate) || 0;
        payload.skill = editForm.skill;
        if (editForm.contractor_id) payload.contractor_id = parseInt(editForm.contractor_id);
      }
      if (editForm.role === 'CONTRACTOR') {
        payload.company_name = editForm.company_name;
        if (editForm.supervisor_id) payload.supervisor_id = parseInt(editForm.supervisor_id);
      }

      await apiClient.patch(`/auth/users/${editUser.id}/`, payload);
      setEditMessage('User updated successfully!');
      setEditIsError(false);
      fetchData();
      setTimeout(() => setEditUser(null), 1000);
    } catch (err: any) {
      const d = err.response?.data;
      const msg = d
        ? Object.entries(d).map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`).join(' | ')
        : 'Failed to update user.';
      setEditMessage(msg);
      setEditIsError(true);
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading users...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>User Management</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{users.length} users — HR only</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#f59e0b', color: 'white', border: 'none',
          borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={16} /> New User
        </button>
      </div>

      {/* Create message */}
      {message && (
        <div style={{
          background: isError ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`,
          color: isError ? '#dc2626' : '#166534',
          padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13,
        }}>
          {message}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div style={{
          background: 'white', borderRadius: 12, padding: 24,
          border: '1px solid #e2e8f0', marginBottom: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontWeight: 700, color: '#1e293b', marginBottom: 20, fontSize: 18 }}>Create New User</h2>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {[
                ['Username *', 'username', 'text'],
                ['Email *', 'email', 'email'],
                ['First Name', 'first_name', 'text'],
                ['Last Name', 'last_name', 'text'],
                ['Password *', 'password', 'password'],
                ['Confirm Password *', 'password2', 'password'],
                ['Phone', 'phone', 'text'],
              ].map(([label, field, type]) => (
                <div key={field}>
                  <label style={labelStyle}>{label}</label>
                  <input type={type} required={label.includes('*')}
                    value={(form as any)[field]}
                    onChange={e => setForm({ ...form, [field]: e.target.value })}
                    style={inputStyle} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Role *</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                  <option value="HR">HR Manager</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="LABOURER">Labourer</option>
                </select>
              </div>
            </div>

            {form.role === 'LABOURER' && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginTop: 0, marginBottom: 12 }}>Labourer Profile</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Daily Wage (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.daily_wage}
                      onChange={e => setForm({ ...form, daily_wage: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Overtime Rate (₹/hr)</label>
                    <input type="number" min="0" step="0.01" value={form.overtime_rate}
                      onChange={e => setForm({ ...form, overtime_rate: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Skill</label>
                    <input type="text" placeholder="e.g. Mason" value={form.skill}
                      onChange={e => setForm({ ...form, skill: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Assign to Contractor</label>
                    <select value={form.contractor_id} onChange={e => setForm({ ...form, contractor_id: e.target.value })} style={inputStyle}>
                      <option value="">-- No contractor yet --</option>
                      {contractors.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.user_detail?.first_name} {c.user_detail?.last_name || c.user_detail?.username}
                          {c.company_name ? ` — ${c.company_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {form.role === 'CONTRACTOR' && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginTop: 0, marginBottom: 12 }}>Contractor Profile</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Company Name</label>
                    <input type="text" value={form.company_name}
                      onChange={e => setForm({ ...form, company_name: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Assign Supervisor</label>
                    <select value={form.supervisor_id} onChange={e => setForm({ ...form, supervisor_id: e.target.value })} style={inputStyle}>
                      <option value="">-- No supervisor yet --</option>
                      {supervisors.map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name || s.username}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={submitting} style={{
                padding: '10px 24px', background: submitting ? '#9ca3af' : '#f59e0b',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              }}>
                {submitting ? 'Creating...' : 'Create User'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm); }} style={{
                padding: '10px 24px', background: 'white', color: '#64748b',
                border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div style={{
        background: 'white', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Username', 'Full Name', 'Email', 'Role', 'Phone', 'Edit'].map(h => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left', fontSize: 12,
                  fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No users found</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 500, color: '#1e293b' }}>{u.username}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, color: '#374151' }}>{u.first_name} {u.last_name}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    background: ROLE_COLORS[u.role] + '20', color: ROLE_COLORS[u.role],
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748b' }}>{u.phone || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => openEdit(u)} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', background: '#f1f5f9', color: '#374151',
                    border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12,
                    cursor: 'pointer', fontWeight: 600,
                  }}>
                    <Pencil size={12} /> Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── EDIT MODAL ── */}
      {editUser && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 32,
            width: '100%', maxWidth: 600, maxHeight: '90vh',
            overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Edit User
                </h2>
                <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>@{editUser.username}</p>
              </div>
              <button onClick={() => setEditUser(null)} style={{
                background: '#f1f5f9', border: 'none', borderRadius: 8,
                padding: 8, cursor: 'pointer', display: 'flex',
              }}>
                <X size={18} color="#64748b" />
              </button>
            </div>

            {editMessage && (
              <div style={{
                background: editIsError ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${editIsError ? '#fecaca' : '#bbf7d0'}`,
                color: editIsError ? '#dc2626' : '#166534',
                padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13,
              }}>
                {editMessage}
              </div>
            )}

            <form onSubmit={handleEditSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input type="text" value={editForm.first_name}
                    onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input type="text" value={editForm.last_name}
                    onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="text" value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Role</label>
                  <select value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                    style={inputStyle}>
                    <option value="HR">HR Manager</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="CONTRACTOR">Contractor</option>
                    <option value="LABOURER">Labourer</option>
                  </select>
                </div>
              </div>

              {/* Labourer profile edit fields */}
              {editForm.role === 'LABOURER' && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                  <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginTop: 0, marginBottom: 12 }}>Labourer Profile</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Daily Wage (₹)</label>
                      <input type="number" min="0" step="0.01" value={editForm.daily_wage}
                        onChange={e => setEditForm({ ...editForm, daily_wage: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Overtime Rate (₹/hr)</label>
                      <input type="number" min="0" step="0.01" value={editForm.overtime_rate}
                        onChange={e => setEditForm({ ...editForm, overtime_rate: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Skill</label>
                      <input type="text" value={editForm.skill}
                        onChange={e => setEditForm({ ...editForm, skill: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Contractor</label>
                      <select value={editForm.contractor_id}
                        onChange={e => setEditForm({ ...editForm, contractor_id: e.target.value })}
                        style={inputStyle}>
                        <option value="">-- No contractor --</option>
                        {contractors.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.user_detail?.first_name} {c.user_detail?.last_name || c.user_detail?.username}
                            {c.company_name ? ` — ${c.company_name}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Contractor profile edit fields */}
              {editForm.role === 'CONTRACTOR' && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 14, border: '1px solid #e2e8f0' }}>
                  <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, marginTop: 0, marginBottom: 12 }}>Contractor Profile</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Company Name</label>
                      <input type="text" value={editForm.company_name}
                        onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                        style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Supervisor</label>
                      <select value={editForm.supervisor_id}
                        onChange={e => setEditForm({ ...editForm, supervisor_id: e.target.value })}
                        style={inputStyle}>
                        <option value="">-- No supervisor --</option>
                        {supervisors.map(s => (
                          <option key={s.id} value={s.id}>{s.first_name} {s.last_name || s.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" disabled={editSubmitting} style={{
                  padding: '10px 24px', background: editSubmitting ? '#9ca3af' : '#f59e0b',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600, cursor: editSubmitting ? 'not-allowed' : 'pointer',
                }}>
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} style={{
                  padding: '10px 24px', background: 'white', color: '#64748b',
                  border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;