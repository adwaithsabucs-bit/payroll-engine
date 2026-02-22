// frontend/src/pages/UsersPage.tsx — REPLACE ENTIRE FILE

import React, { useEffect, useState } from 'react';
import { getUsers, createUser } from '../api/auth';
import { getContractors } from '../api/workforce';
import { User } from '../types';
import { extractResults } from '../utils/pagination';
import { Plus, Pencil, X } from 'lucide-react';
import apiClient from '../api/client';

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  HR:         { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa' },
  SUPERVISOR: { bg: 'rgba(37,99,235,0.12)',  color: '#60a5fa' },
  CONTRACTOR: { bg: 'rgba(202,138,4,0.12)',  color: '#facc15' },
  LABOURER:   { bg: 'rgba(22,163,74,0.12)',  color: '#4ade80' },
};

const defaultForm = {
  username: '', email: '', first_name: '', last_name: '',
  password: '', password2: '', role: 'LABOURER', phone: '',
  daily_wage: '0', overtime_rate: '0', skill: '',
  contractor_id: '', supervisor_id: '', company_name: '',
};

const S = {
  page:  { animation: 'pageIn 0.4s cubic-bezier(0.16,1,0.3,1)' } as React.CSSProperties,
  hdr:   { display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:32, paddingBottom:24, borderBottom:'1px solid #161616', position:'relative' } as React.CSSProperties,
  hdrLine: { position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626' } as React.CSSProperties,
  title: { fontFamily:"'Barlow Condensed',sans-serif", fontSize:48, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1, lineHeight:1 } as React.CSSProperties,
  sub:   { fontSize:11, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46', marginBottom:8, fontWeight:600 } as React.CSSProperties,
  // stats
  statsRow: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:2, marginBottom:24 } as React.CSSProperties,
  statBox:  { background:'#0d0d0d', border:'1px solid #161616', padding:'20px 22px', position:'relative', overflow:'hidden', transition:'all 0.2s' } as React.CSSProperties,
  statLabel:{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:9, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#3f3f46', marginBottom:8 } as React.CSSProperties,
  statVal:  { fontFamily:"'Barlow Condensed',sans-serif", fontSize:40, fontWeight:900, lineHeight:1, letterSpacing:-2 } as React.CSSProperties,
  statBar:  { position:'absolute', top:0, left:0, right:0, height:2 } as React.CSSProperties,
  // table
  tableWrap:{ background:'#0d0d0d', border:'1px solid #161616', overflow:'hidden' } as React.CSSProperties,
  th: { padding:'12px 18px', textAlign:'left' as const, fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, color:'#3f3f46', textTransform:'uppercase' as const, letterSpacing:3 },
  td: { padding:'13px 18px', fontSize:13, color:'#a1a1aa', borderBottom:'1px solid #111' },
  // form panel
  formPanel:{ background:'#0d0d0d', border:'1px solid #1e1e1e', borderTop:'3px solid #dc2626', padding:28, marginBottom:24 } as React.CSSProperties,
  // modal overlay
  overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:   { background:'#0d0d0d', border:'1px solid #1e1e1e', borderTop:'3px solid #dc2626', width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto' as const, padding:32 },
  // shared input/label
  label: { display:'block', fontSize:9, letterSpacing:4, textTransform:'uppercase' as const, color:'#3f3f46', fontWeight:600, marginBottom:8 },
  input: { width:'100%', background:'#141414', border:'1px solid #1e1e1e', borderBottom:'2px solid #222', color:'white', padding:'12px 14px', fontFamily:"'Barlow',sans-serif", fontSize:14, outline:'none', boxSizing:'border-box' as const, transition:'all 0.2s' },
  // buttons
  btn:     { display:'inline-flex', alignItems:'center', gap:8, background:'#dc2626', color:'white', border:'none', padding:'11px 22px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer', clipPath:'polygon(0 0,92% 0,100% 25%,100% 100%,8% 100%,0 75%)' },
  btnGhost:{ display:'inline-flex', alignItems:'center', gap:8, background:'transparent', color:'#52525b', border:'1px solid #1e1e1e', padding:'10px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer' },
  btnEdit: { display:'inline-flex', alignItems:'center', gap:4, padding:'5px 12px', background:'#141414', color:'#71717a', border:'1px solid #1e1e1e', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' as const, cursor:'pointer', transition:'all 0.15s' },
  // profile section inside form
  profileSection: { background:'#141414', border:'1px solid #1e1e1e', borderLeft:'2px solid #dc2626', padding:20, marginBottom:18 } as React.CSSProperties,
  profileTitle:   { fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:4, textTransform:'uppercase' as const, color:'#dc2626', marginBottom:16 },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const [editIsError, setEditIsError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, supRes, conRes] = await Promise.all([
        getUsers(), getUsers('SUPERVISOR'), getContractors(),
      ]);
      setUsers(extractResults<User>(uRes.data));
      setSupervisors(extractResults<User>(supRes.data));
      setContractors(extractResults<any>(conRes.data));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── CREATE ──────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMessage('');
    try {
      const payload: any = {
        username: form.username, email: form.email,
        first_name: form.first_name, last_name: form.last_name,
        password: form.password, password2: form.password2,
        role: form.role, phone: form.phone,
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
      setMessage('User created successfully.'); setIsError(false);
      setShowForm(false); setForm(defaultForm); fetchData();
    } catch (err: any) {
      const d = err.response?.data;
      setMessage(d ? Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v[0]:v}`).join(' | ') : 'Failed to create user.');
      setIsError(true);
    } finally { setSubmitting(false); }
  };

  // ── OPEN EDIT ────────────────────────────────────────────────
  const openEdit = async (user: User) => {
    setEditMessage(''); setEditIsError(false);
    const base: any = {
      first_name: user.first_name||'', last_name: user.last_name||'',
      email: user.email, phone: user.phone||'', role: user.role,
      daily_wage:'0', overtime_rate:'0', skill:'', contractor_id:'', supervisor_id:'', company_name:'',
    };
    try {
      if (user.role === 'LABOURER') {
        const res = await apiClient.get(`/workforce/labourers/?user=${user.id}`);
        const results = extractResults<any>(res.data);
        if (results.length > 0) {
          const p = results[0];
          base.daily_wage = p.daily_wage||'0'; base.overtime_rate = p.overtime_rate||'0';
          base.skill = p.skill||''; base.contractor_id = p.contractor ? String(p.contractor) : '';
        }
      } else if (user.role === 'CONTRACTOR') {
        const res = await apiClient.get(`/workforce/contractors/?user=${user.id}`);
        const results = extractResults<any>(res.data);
        if (results.length > 0) {
          const p = results[0];
          base.company_name = p.company_name||''; base.supervisor_id = p.supervisor ? String(p.supervisor) : '';
        }
      }
    } catch {}
    setEditUser(user); setEditForm(base);
  };

  // ── SAVE EDIT ────────────────────────────────────────────────
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSubmitting(true); setEditMessage('');
    try {
      const payload: any = {
        first_name: editForm.first_name, last_name: editForm.last_name,
        email: editForm.email, phone: editForm.phone, role: editForm.role,
      };
      if (editForm.role === 'LABOURER') {
        payload.daily_wage = parseFloat(editForm.daily_wage)||0;
        payload.overtime_rate = parseFloat(editForm.overtime_rate)||0;
        payload.skill = editForm.skill;
        if (editForm.contractor_id) payload.contractor_id = parseInt(editForm.contractor_id);
      }
      if (editForm.role === 'CONTRACTOR') {
        payload.company_name = editForm.company_name;
        if (editForm.supervisor_id) payload.supervisor_id = parseInt(editForm.supervisor_id);
      }
      await apiClient.patch(`/auth/users/${editUser.id}/`, payload);
      setEditMessage('User updated successfully.'); setEditIsError(false);
      fetchData(); setTimeout(() => setEditUser(null), 900);
    } catch (err: any) {
      const d = err.response?.data;
      setEditMessage(d ? Object.entries(d).map(([k,v])=>`${k}: ${Array.isArray(v)?v[0]:v}`).join(' | ') : 'Failed to update user.');
      setEditIsError(true);
    } finally { setEditSubmitting(false); }
  };

  // Role counts for stat cards
  const countRole = (r: string) => users.filter(u => u.role === r).length;

  const FormFields = ({ f, setF, isEdit = false }: { f: any; setF: any; isEdit?: boolean }) => (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {!isEdit && (
          <div>
            <label style={S.label}>Username *</label>
            <input className="usr-input" style={S.input} type="text" required value={f.username} onChange={e=>setF({...f,username:e.target.value})}/>
          </div>
        )}
        <div>
          <label style={S.label}>Email *</label>
          <input className="usr-input" style={S.input} type="email" required={!isEdit} value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
        </div>
        <div>
          <label style={S.label}>First Name</label>
          <input className="usr-input" style={S.input} type="text" value={f.first_name} onChange={e=>setF({...f,first_name:e.target.value})}/>
        </div>
        <div>
          <label style={S.label}>Last Name</label>
          <input className="usr-input" style={S.input} type="text" value={f.last_name} onChange={e=>setF({...f,last_name:e.target.value})}/>
        </div>
        {!isEdit && (
          <>
            <div>
              <label style={S.label}>Password *</label>
              <input className="usr-input" style={S.input} type="password" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>
            </div>
            <div>
              <label style={S.label}>Confirm Password *</label>
              <input className="usr-input" style={S.input} type="password" required value={f.password2} onChange={e=>setF({...f,password2:e.target.value})}/>
            </div>
          </>
        )}
        <div>
          <label style={S.label}>Phone</label>
          <input className="usr-input" style={S.input} type="text" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
        </div>
        <div>
          <label style={S.label}>Role *</label>
          <select className="usr-input" style={S.input} value={f.role} onChange={e=>setF({...f,role:e.target.value})}>
            <option value="HR">HR Manager</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="CONTRACTOR">Contractor</option>
            <option value="LABOURER">Labourer</option>
          </select>
        </div>
      </div>

      {f.role === 'LABOURER' && (
        <div style={S.profileSection}>
          <div style={S.profileTitle}>⬡ Labourer Profile</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={S.label}>Daily Wage (₹)</label>
              <input className="usr-input" style={S.input} type="number" min="0" step="0.01" value={f.daily_wage} onChange={e=>setF({...f,daily_wage:e.target.value})}/>
            </div>
            <div>
              <label style={S.label}>Overtime Rate (₹/hr)</label>
              <input className="usr-input" style={S.input} type="number" min="0" step="0.01" value={f.overtime_rate} onChange={e=>setF({...f,overtime_rate:e.target.value})}/>
            </div>
            <div>
              <label style={S.label}>Skill</label>
              <input className="usr-input" style={S.input} type="text" placeholder="e.g. Mason" value={f.skill} onChange={e=>setF({...f,skill:e.target.value})}/>
            </div>
          </div>
          <div>
            <label style={S.label}>Assign to Contractor</label>
            <select className="usr-input" style={S.input} value={f.contractor_id} onChange={e=>setF({...f,contractor_id:e.target.value})}>
              <option value="">-- No contractor yet --</option>
              {contractors.map((c:any) => (
                <option key={c.id} value={c.id}>
                  {c.user_detail?.first_name} {c.user_detail?.last_name||c.user_detail?.username}
                  {c.company_name ? ` — ${c.company_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {f.role === 'CONTRACTOR' && (
        <div style={S.profileSection}>
          <div style={S.profileTitle}>⬡ Contractor Profile</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={S.label}>Company Name</label>
              <input className="usr-input" style={S.input} type="text" value={f.company_name} onChange={e=>setF({...f,company_name:e.target.value})}/>
            </div>
            <div>
              <label style={S.label}>Assign Supervisor</label>
              <select className="usr-input" style={S.input} value={f.supervisor_id} onChange={e=>setF({...f,supervisor_id:e.target.value})}>
                <option value="">-- No supervisor yet --</option>
                {supervisors.map(sv => (
                  <option key={sv.id} value={sv.id}>{sv.first_name} {sv.last_name||sv.username}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:14, padding:'60px 0', color:'#3f3f46', fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, letterSpacing:4, textTransform:'uppercase' }}>
      <div style={{ width:40, height:2, background:'#161616', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'#dc2626', animation:'loadBar 1s ease infinite' }}/>
      </div>
      Loading users...
      <style>{`@keyframes loadBar{from{transform:translateX(-100%)}to{transform:translateX(100%)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes pageIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .usr-input:focus { border-bottom-color:#dc2626!important; background:#181818!important; }
        select.usr-input option { background:#141414; color:white; }
        .usr-stat:hover { background:#111!important; transform:translateY(-2px); }
        .usr-row:hover td { background:#111; }
        .usr-edit-btn:hover { background:#1e1e1e!important; color:white!important; border-color:#dc2626!important; }
      `}</style>

      <div style={S.page}>
        {/* ── Header ── */}
        <div style={S.hdr}>
          <div style={S.hdrLine}/>
          <div>
            <div style={S.sub}>Administration</div>
            <div style={S.title}>User Management</div>
          </div>
          <button style={S.btn} onClick={() => setShowForm(!showForm)}>
            <Plus size={14}/> New User
          </button>
        </div>

        {/* ── Message ── */}
        {message && (
          <div style={{ background: isError?'rgba(220,38,38,0.07)':'rgba(22,163,74,0.07)', borderLeft:`3px solid ${isError?'#dc2626':'#16a34a'}`, padding:'12px 16px', marginBottom:20, fontSize:13, color: isError?'#fca5a5':'#4ade80' }}>
            {message}
          </div>
        )}

        {/* ── Stats ── */}
        <div style={S.statsRow}>
          {[
            { label:'Total Users',   val: users.length,         color:'#dc2626' },
            { label:'HR & Supervisors', val: countRole('HR')+countRole('SUPERVISOR'), color:'#a78bfa' },
            { label:'Contractors',   val: countRole('CONTRACTOR'), color:'#facc15' },
            { label:'Labourers',     val: countRole('LABOURER'),   color:'#4ade80' },
          ].map(s => (
            <div key={s.label} className="usr-stat" style={S.statBox}>
              <div style={{...S.statBar, background:s.color}}/>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{...S.statVal, color:s.color}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* ── Create Form ── */}
        {showForm && (
          <div style={S.formPanel}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize:9, letterSpacing:5, textTransform:'uppercase', color:'#dc2626', fontWeight:600, marginBottom:4 }}>HR Administration</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:26, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-0.5 }}>Create New User</div>
              </div>
              <button onClick={()=>{setShowForm(false);setForm(defaultForm);}} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#52525b', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <FormFields f={form} setF={setForm}/>
              <div style={{ display:'flex', gap:12, marginTop:8 }}>
                <button type="submit" disabled={submitting} style={{...S.btn, background: submitting?'#27272a':'#dc2626', clipPath: submitting?'none':undefined}}>
                  {submitting ? 'Creating...' : 'Create User →'}
                </button>
                <button type="button" style={S.btnGhost} onClick={()=>{setShowForm(false);setForm(defaultForm);}}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Users Table ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{ width:28, height:2, background:'#dc2626' }}/>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:4, textTransform:'uppercase', color:'#52525b' }}>
            All Users — {users.length} total
          </div>
        </div>

        <div style={S.tableWrap}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#0a0a0a', borderBottom:'1px solid #1a1a1a' }}>
                {['#','Username','Full Name','Email','Role','Phone','Edit'].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding:60, textAlign:'center', color:'#27272a', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:4, textTransform:'uppercase', fontSize:14 }}>
                    No Users Found
                  </td>
                </tr>
              ) : users.map((u, i) => {
                const rc = ROLE_COLORS[u.role] || { bg:'rgba(82,82,91,0.2)', color:'#a1a1aa' };
                return (
                  <tr key={u.id} className="usr-row">
                    <td style={{...S.td, color:'#27272a', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700 }}>
                      {String(i+1).padStart(2,'0')}
                    </td>
                    <td style={{...S.td, color:'white', fontWeight:600, fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, letterSpacing:1 }}>
                      {u.username}
                    </td>
                    <td style={{...S.td, color:'#a1a1aa'}}>
                      {u.first_name} {u.last_name}
                    </td>
                    <td style={{...S.td, color:'#52525b', fontSize:12}}>
                      {u.email}
                    </td>
                    <td style={S.td}>
                      <span style={{ background:rc.bg, color:rc.color, padding:'3px 10px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{...S.td, color:'#52525b', fontSize:12}}>
                      {u.phone || '—'}
                    </td>
                    <td style={S.td}>
                      <button
                        className="usr-edit-btn"
                        onClick={() => openEdit(u)}
                        style={S.btnEdit}
                      >
                        <Pencil size={11}/> Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Edit Modal ── */}
        {editUser && (
          <div style={S.overlay}>
            <div style={S.modal}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, paddingBottom:20, borderBottom:'1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize:9, letterSpacing:5, textTransform:'uppercase', color:'#dc2626', fontWeight:600, marginBottom:4 }}>Editing</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1, lineHeight:1 }}>
                    {editUser.username}
                  </div>
                  <div style={{ fontSize:11, color:'#3f3f46', marginTop:4, letterSpacing:1 }}>{editUser.email}</div>
                </div>
                <button onClick={() => setEditUser(null)} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#52525b', width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                  <X size={16}/>
                </button>
              </div>

              {editMessage && (
                <div style={{ background: editIsError?'rgba(220,38,38,0.07)':'rgba(22,163,74,0.07)', borderLeft:`3px solid ${editIsError?'#dc2626':'#16a34a'}`, padding:'10px 16px', marginBottom:20, fontSize:13, color: editIsError?'#fca5a5':'#4ade80' }}>
                  {editMessage}
                </div>
              )}

              <form onSubmit={handleEditSave}>
                <FormFields f={editForm} setF={setEditForm} isEdit/>
                <div style={{ display:'flex', gap:12, marginTop:8, paddingTop:20, borderTop:'1px solid #1a1a1a' }}>
                  <button type="submit" disabled={editSubmitting}
                    style={{...S.btn, background: editSubmitting?'#27272a':'#dc2626', clipPath: editSubmitting?'none':undefined}}>
                    {editSubmitting ? 'Saving...' : 'Save Changes →'}
                  </button>
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
