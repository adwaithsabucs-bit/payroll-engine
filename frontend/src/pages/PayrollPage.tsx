// frontend/src/pages/PayrollPage.tsx — REPLACE ENTIRE FILE
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import { Plus, X, CheckCircle, Clock, DollarSign, ChevronRight, RefreshCw } from 'lucide-react';

const S = {
  card:    { background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:8, padding:20 } as React.CSSProperties,
  label:   { display:'block', fontSize:9, letterSpacing:4, textTransform:'uppercase' as const, color:'#71717a', fontWeight:700, marginBottom:8 },
  input:   { width:'100%', background:'#141414', border:'1px solid #1e1e1e', color:'white', padding:'10px 12px', fontSize:13, outline:'none', boxSizing:'border-box' as const, borderRadius:4 },
  select:  { width:'100%', background:'#141414', border:'1px solid #1e1e1e', color:'white', padding:'10px 12px', fontSize:13, outline:'none', boxSizing:'border-box' as const, borderRadius:4 },
  btn:     { display:'inline-flex', alignItems:'center', gap:8, background:'#dc2626', color:'white', border:'none', padding:'10px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer', borderRadius:6 },
  btnGhost:{ display:'inline-flex', alignItems:'center', gap:8, background:'transparent', color:'#a1a1aa', border:'1px solid #1e1e1e', padding:'9px 18px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer', borderRadius:6 },
  overlay: { position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.88)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:   { background:'#0d0d0d', border:'1px solid #1e1e1e', borderTop:'3px solid #dc2626', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' as const, padding:28, borderRadius:8 },
};

const STATUS_COLOR: Record<string,string> = { PENDING:'#facc15', APPROVED:'#60a5fa', PAID:'#4ade80' };

function PageHeader({ sub, title }: { sub: string; title: string }) {
  return (
    <div style={{ marginBottom:28, paddingBottom:20, borderBottom:'1px solid #161616', position:'relative' }}>
      <div style={{ position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626', borderRadius:2 }}/>
      <div style={{ fontSize:10, letterSpacing:4, textTransform:'uppercase', color:'#71717a', marginBottom:4, fontWeight:600 }}>{sub}</div>
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:40, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1 }}>{title}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || '#71717a';
  return (
    <span style={{ fontSize:10, color, background:`${color}15`, padding:'3px 10px', borderRadius:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>
      {status}
    </span>
  );
}

export default function PayrollPage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'HR')         return <HRPayrollView />;
  if (role === 'SUPERVISOR') return <SupervisorPayrollView />;
  if (role === 'CONTRACTOR') return <ContractorPayrollView />;
  return <div style={{ color:'#52525b', padding:40 }}>Payroll not available for your role.</div>;
}

// ── HR PAYROLL — full control ───────────────────────────────────
function HRPayrollView() {
  const [tab, setTab]     = useState<'supervisor'|'contractor'|'labourer'>('supervisor');
  const [projects, setProjects] = useState<any[]>([]);
  const [periods, setPeriods]   = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPeriod,  setSelectedPeriod]  = useState('');
  const [dashboard, setDashboard] = useState<any>({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewPeriod,  setShowNewPeriod]  = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const [projectForm, setProjectForm] = useState({ name:'', supervisor:'', location:'', start_date:'', end_date:'', description:'' });
  const [periodForm,  setPeriodForm]  = useState({ project:'', name:'', start_date:'', end_date:'' });

  useEffect(() => {
    apiClient.get('/payroll/dashboard/').then(r => setDashboard(r.data));
    apiClient.get('/attendance/projects/').then(r => setProjects(extractResults<any>(r.data)));
    apiClient.get('/auth/users/?role=SUPERVISOR').then(r => setSupervisors(extractResults<any>(r.data)));
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    apiClient.get(`/attendance/periods/?project=${selectedProject}`).then(r => setPeriods(extractResults<any>(r.data)));
  }, [selectedProject]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/attendance/projects/', { ...projectForm, supervisor: projectForm.supervisor || null });
      setShowNewProject(false);
      setProjectForm({ name:'', supervisor:'', location:'', start_date:'', end_date:'', description:'' });
      apiClient.get('/attendance/projects/').then(r => setProjects(extractResults<any>(r.data)));
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/attendance/periods/', periodForm);
      setShowNewPeriod(false);
      setPeriodForm({ project:'', name:'', start_date:'', end_date:'' });
      if (selectedProject) apiClient.get(`/attendance/periods/?project=${selectedProject}`).then(r => setPeriods(extractResults<any>(r.data)));
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
  };

  return (
    <div style={{ animation:'pageIn 0.4s ease' }}>
      <style>{`@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <PageHeader sub="HR Administration" title="Payroll Management"/>

      {/* Dashboard stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {[
          { label:'Supervisor Payroll', data: dashboard.supervisor_payrolls, color:'#a78bfa' },
          { label:'Contractor Payroll', data: dashboard.contractor_payrolls, color:'#facc15' },
          { label:'Labourer Payroll',   data: dashboard.labourer_payrolls,   color:'#4ade80' },
        ].map(({ label, data, color }) => data && (
          <div key={label} style={{ ...S.card, borderTop:`2px solid ${color}` }}>
            <div style={{ fontSize:9, letterSpacing:4, textTransform:'uppercase', color:'#71717a', fontWeight:700, marginBottom:12 }}>{label}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
              {['pending','approved','paid'].map(k => (
                <div key={k} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:900, color: STATUS_COLOR[k.toUpperCase()] }}>{data[k]}</div>
                  <div style={{ fontSize:9, color:'#52525b', letterSpacing:2, textTransform:'uppercase', fontWeight:700 }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid #1a1a1a', paddingTop:10 }}>
              <span style={{ fontSize:11, color:'#71717a' }}>Total Payable: </span>
              <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:18, fontWeight:800, color }}>
                ₹{Number(data.total_amount||0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Projects & Periods */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:2 }}>Projects</div>
            <button style={{ ...S.btn, padding:'6px 12px', fontSize:10 }} onClick={() => setShowNewProject(true)}><Plus size={12}/> New</button>
          </div>
          <select style={S.select} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.status}</option>)}
          </select>
          {projects.filter(p => !selectedProject || String(p.id) === selectedProject).map(p => (
            <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #111' }}>
              <div>
                <div style={{ fontWeight:600, color:'white', fontSize:13 }}>{p.name}</div>
                <div style={{ fontSize:11, color:'#71717a' }}>{p.supervisor_name || '—'} · {p.start_date}</div>
              </div>
              <span style={{ fontSize:10, color: p.status==='ACTIVE'?'#4ade80':'#52525b', background: p.status==='ACTIVE'?'rgba(22,163,74,0.1)':'#111', padding:'2px 8px', borderRadius:8, fontWeight:700 }}>{p.status}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:2 }}>Periods</div>
            <button style={{ ...S.btn, padding:'6px 12px', fontSize:10 }} onClick={() => setShowNewPeriod(true)}><Plus size={12}/> New</button>
          </div>
          {periods.length === 0 ? (
            <div style={{ color:'#3f3f46', fontSize:12, padding:'20px 0' }}>Select a project to see its periods.</div>
          ) : periods.map(p => (
            <div key={p.id} style={{ padding:'10px 0', borderBottom:'1px solid #111' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontWeight:600, color:'white', fontSize:13 }}>{p.name}</div>
                <StatusBadge status={p.status}/>
              </div>
              <div style={{ fontSize:11, color:'#71717a', marginTop:2 }}>{p.start_date} → {p.end_date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', gap:2, marginBottom:20, background:'#0a0a0a', border:'1px solid #1a1a1a', borderRadius:8, padding:4 }}>
        {([['supervisor','Supervisor Payroll'],['contractor','Contractor Payroll'],['labourer','Labourer Payroll']] as [string,string][]).map(([key,label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{ flex:1, padding:'9px 0', background: tab===key ? '#dc2626' : 'transparent', color: tab===key ? 'white' : '#52525b', border:'none', borderRadius:6, fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:2, textTransform:'uppercase', cursor:'pointer', transition:'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'supervisor'  && <PayrollTable type="supervisor"  projectId={selectedProject} periodId={selectedPeriod}/>}
      {tab === 'contractor'  && <PayrollTable type="contractor"  projectId={selectedProject} periodId={selectedPeriod}/>}
      {tab === 'labourer'    && <PayrollTable type="labourer"    projectId={selectedProject} periodId={selectedPeriod}/>}

      {/* New Project Modal */}
      {showNewProject && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #1a1a1a' }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900, color:'white', textTransform:'uppercase' }}>New Project</div>
              <button onClick={() => setShowNewProject(false)} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#a1a1aa', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', borderRadius:5 }}><X size={13}/></button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S.label}>Project Name *</label>
                  <input style={S.input} required value={projectForm.name} onChange={e => setProjectForm({...projectForm, name:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Supervisor</label>
                  <select style={S.select} value={projectForm.supervisor} onChange={e => setProjectForm({...projectForm, supervisor:e.target.value})}>
                    <option value="">— Select Supervisor —</option>
                    {supervisors.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name||s.username}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Location</label>
                  <input style={S.input} value={projectForm.location} onChange={e => setProjectForm({...projectForm, location:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Start Date *</label>
                  <input type="date" style={S.input} required value={projectForm.start_date} onChange={e => setProjectForm({...projectForm, start_date:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>End Date</label>
                  <input type="date" style={S.input} value={projectForm.end_date} onChange={e => setProjectForm({...projectForm, end_date:e.target.value})}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" style={S.btn}>Create Project</button>
                <button type="button" style={S.btnGhost} onClick={() => setShowNewProject(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Period Modal */}
      {showNewPeriod && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #1a1a1a' }}>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900, color:'white', textTransform:'uppercase' }}>New Period</div>
              <button onClick={() => setShowNewPeriod(false)} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#a1a1aa', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', borderRadius:5 }}><X size={13}/></button>
            </div>
            <form onSubmit={handleCreatePeriod}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S.label}>Project *</label>
                  <select style={S.select} required value={periodForm.project} onChange={e => setPeriodForm({...periodForm, project:e.target.value})}>
                    <option value="">— Select Project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S.label}>Period Name * (e.g. "Week 1" or "Phase A")</label>
                  <input style={S.input} required value={periodForm.name} onChange={e => setPeriodForm({...periodForm, name:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Start Date *</label>
                  <input type="date" style={S.input} required value={periodForm.start_date} onChange={e => setPeriodForm({...periodForm, start_date:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>End Date *</label>
                  <input type="date" style={S.input} required value={periodForm.end_date} onChange={e => setPeriodForm({...periodForm, end_date:e.target.value})}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" style={S.btn}>Create Period</button>
                <button type="button" style={S.btnGhost} onClick={() => setShowNewPeriod(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SUPERVISOR PAYROLL VIEW ─────────────────────────────────────
function SupervisorPayrollView() {
  return (
    <div style={{ animation:'pageIn 0.4s ease' }}>
      <PageHeader sub="Supervisor Portal" title="My Payroll"/>
      <PayrollTable type="supervisor" projectId="" periodId=""/>
    </div>
  );
}

// ── CONTRACTOR PAYROLL VIEW ─────────────────────────────────────
function ContractorPayrollView() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    apiClient.get('/attendance/projects/').then(r => setProjects(extractResults<any>(r.data)));
  }, []);

  return (
    <div style={{ animation:'pageIn 0.4s ease' }}>
      <PageHeader sub="Contractor Portal" title="My Payroll"/>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:24 }}>
        <div>
          <label style={S.label}>Filter by Project</label>
          <select style={S.select} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>
      <PayrollTable type="contractor" projectId={selectedProject} periodId=""/>
      <div style={{ marginTop:28 }}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, color:'white', textTransform:'uppercase', letterSpacing:2, marginBottom:16 }}>My Labourers' Payroll</div>
        <PayrollTable type="labourer" projectId={selectedProject} periodId=""/>
      </div>
    </div>
  );
}

// ── SHARED PAYROLL TABLE ────────────────────────────────────────
function PayrollTable({ type, projectId, periodId }: { type:'supervisor'|'contractor'|'labourer'; projectId:string; periodId:string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/payroll/${type}/?`;
      if (projectId) url += `project=${projectId}&`;
      if (periodId)  url += `period=${periodId}&`;
      const res = await apiClient.get(url);
      setRecords(extractResults<any>(res.data));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [type, projectId, periodId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.patch(`/payroll/${type}/${id}/`, { status });
      load();
    } catch (e) { alert('Failed to update status.'); }
  };

  const autoCalc = async (id: number) => {
    try {
      await apiClient.post(`/payroll/labourer/${id}/calculate/`);
      load();
    } catch (e) { alert('Calculation failed.'); }
  };

  const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:20, height:2, background:'#dc2626' }}/>
          <span style={{ fontSize:11, color:'#71717a', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:3, textTransform:'uppercase', fontWeight:700 }}>
            {records.length} records · Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits:2 })}
          </span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={S.btnGhost} onClick={load}><RefreshCw size={12}/> Refresh</button>
          <button style={S.btn} onClick={() => setShowForm(true)}><Plus size={12}/> Add</button>
        </div>
      </div>

      {loading ? (
        <div style={{ ...S.card, color:'#52525b', textAlign:'center', padding:40 }}>Loading...</div>
      ) : records.length === 0 ? (
        <div style={{ ...S.card, color:'#3f3f46', textAlign:'center', padding:40 }}>No payroll records found.</div>
      ) : (
        <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns: type==='labourer' ? '1.5fr 1fr 1fr 1fr 1fr 120px 80px' : '1.5fr 1fr 1fr 1fr 120px 80px', padding:'10px 16px', background:'#0a0a0a', borderBottom:'1px solid #1a1a1a', gap:8 }}>
            {['Name','Project','Period/Month','Amount','Status','Actions', type==='labourer'?'Calc':''].filter(Boolean).map(h => (
              <span key={h} style={{ fontSize:9, letterSpacing:3, textTransform:'uppercase', color:'#3f3f46', fontWeight:700 }}>{h}</span>
            ))}
          </div>
          {records.map((r, i) => (
            <div key={r.id} style={{ display:'grid', gridTemplateColumns: type==='labourer' ? '1.5fr 1fr 1fr 1fr 1fr 120px 80px' : '1.5fr 1fr 1fr 1fr 120px 80px', padding:'13px 16px', background: i%2===0 ? '#0d0d0d':'#0a0a0a', borderBottom:'1px solid #111', alignItems:'center', gap:8 }}>
              <div style={{ fontWeight:600, color:'white', fontSize:13 }}>
                {r.supervisor_name || r.contractor_name || r.labourer_name}
                {r.is_temp && <span style={{ fontSize:9, color:'#facc15', marginLeft:6, background:'rgba(202,138,4,0.1)', padding:'1px 5px', borderRadius:6 }}>TEMP</span>}
              </div>
              <div style={{ fontSize:12, color:'#a1a1aa' }}>{r.project_name}</div>
              <div style={{ fontSize:12, color:'#a1a1aa' }}>{r.period_name || r.month || '—'}</div>
              {type === 'labourer' && <div style={{ fontSize:12, color:'#a1a1aa' }}>{r.days_present}d</div>}
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:800, color:'#4ade80' }}>
                ₹{Number(r.total_amount).toLocaleString('en-IN', { minimumFractionDigits:2 })}
              </div>
              <StatusBadge status={r.status}/>
              <div style={{ display:'flex', gap:4 }}>
                {r.status === 'PENDING' && (
                  <button onClick={() => updateStatus(r.id, 'APPROVED')} style={{ padding:'4px 8px', background:'rgba(37,99,235,0.1)', border:'1px solid rgba(37,99,235,0.3)', color:'#60a5fa', borderRadius:4, fontSize:9, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
                    APPROVE
                  </button>
                )}
                {r.status === 'APPROVED' && (
                  <button onClick={() => updateStatus(r.id, 'PAID')} style={{ padding:'4px 8px', background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.3)', color:'#4ade80', borderRadius:4, fontSize:9, fontWeight:700, cursor:'pointer', letterSpacing:1 }}>
                    MARK PAID
                  </button>
                )}
              </div>
              {type === 'labourer' && (
                <button onClick={() => autoCalc(r.id)} title="Auto-calculate from attendance" style={{ padding:'4px 8px', background:'#141414', border:'1px solid #1e1e1e', color:'#71717a', borderRadius:4, fontSize:9, cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                  <RefreshCw size={10}/> Calc
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddPayrollModal type={type} onClose={() => { setShowForm(false); load(); }}/>
      )}
    </div>
  );
}

// ── ADD PAYROLL MODAL ───────────────────────────────────────────
function AddPayrollModal({ type, onClose }: { type:string; onClose:()=>void }) {
  const [form, setForm] = useState<any>({});
  const [projects, setProjects]     = useState<any[]>([]);
  const [periods,  setPeriods]      = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [contractors, setContractors] = useState<any[]>([]);
  const [labourers,   setLabourers]   = useState<any[]>([]);
  const [tempLabs,    setTempLabs]    = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/attendance/projects/').then(r => setProjects(extractResults<any>(r.data)));
    if (type === 'supervisor') apiClient.get('/auth/users/?role=SUPERVISOR').then(r => setSupervisors(extractResults<any>(r.data)));
    if (type === 'contractor') apiClient.get('/workforce/contractors/').then(r => setContractors(extractResults<any>(r.data)));
    if (type === 'labourer') {
      apiClient.get('/workforce/labourers/').then(r => setLabourers(extractResults<any>(r.data)));
      apiClient.get('/attendance/temp-labourers/').then(r => setTempLabs(extractResults<any>(r.data)));
    }
  }, [type]);

  useEffect(() => {
    if (form.project) apiClient.get(`/attendance/periods/?project=${form.project}`).then(r => setPeriods(extractResults<any>(r.data)));
  }, [form.project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      await apiClient.post(`/payroll/${type}/`, payload);
      onClose();
    } catch (err: any) { alert(JSON.stringify(err.response?.data)); }
  };

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #1a1a1a' }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:900, color:'white', textTransform:'uppercase' }}>
            Add {type} Payroll
          </div>
          <button onClick={onClose} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#a1a1aa', width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', borderRadius:5 }}><X size={13}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            {/* Person selector */}
            {type === 'supervisor' && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={S.label}>Supervisor *</label>
                <select style={S.select} required value={form.supervisor||''} onChange={e => setForm({...form, supervisor:e.target.value})}>
                  <option value="">— Select —</option>
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name||s.username}</option>)}
                </select>
              </div>
            )}
            {type === 'contractor' && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={S.label}>Contractor *</label>
                <select style={S.select} required value={form.contractor||''} onChange={e => setForm({...form, contractor:e.target.value})}>
                  <option value="">— Select —</option>
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.user_detail?.first_name} {c.user_detail?.last_name||c.user_detail?.username}</option>)}
                </select>
              </div>
            )}
            {type === 'labourer' && (
              <>
                <div>
                  <label style={S.label}>Fixed Labourer</label>
                  <select style={S.select} value={form.labourer||''} onChange={e => setForm({...form, labourer:e.target.value, temp_labourer:''})}>
                    <option value="">— Select —</option>
                    {labourers.map(l => <option key={l.id} value={l.id}>{l.user_detail?.first_name} {l.user_detail?.last_name||l.user_detail?.username}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Or Temp Labourer</label>
                  <select style={S.select} value={form.temp_labourer||''} onChange={e => setForm({...form, temp_labourer:e.target.value, labourer:''})}>
                    <option value="">— Select —</option>
                    {tempLabs.map(t => <option key={t.id} value={t.id}>{t.name} (Temp)</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Project */}
            <div>
              <label style={S.label}>Project *</label>
              <select style={S.select} required value={form.project||''} onChange={e => setForm({...form, project:e.target.value})}>
                <option value="">— Select —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Period (not for supervisor monthly) */}
            {type !== 'supervisor' && (
              <div>
                <label style={S.label}>Period *</label>
                <select style={S.select} required value={form.period||''} onChange={e => setForm({...form, period:e.target.value})}>
                  <option value="">— Select —</option>
                  {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.start_date}→{p.end_date})</option>)}
                </select>
              </div>
            )}

            {/* Supervisor: monthly salary + month */}
            {type === 'supervisor' && (
              <>
                <div>
                  <label style={S.label}>Month *</label>
                  <input type="date" style={S.input} required value={form.month||''} onChange={e => setForm({...form, month:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Monthly Salary (₹) *</label>
                  <input type="number" style={S.input} required min="0" value={form.monthly_salary||''} onChange={e => setForm({...form, monthly_salary:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Bonus (₹)</label>
                  <input type="number" style={S.input} min="0" value={form.bonus||'0'} onChange={e => setForm({...form, bonus:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Deductions (₹)</label>
                  <input type="number" style={S.input} min="0" value={form.deductions||'0'} onChange={e => setForm({...form, deductions:e.target.value})}/>
                </div>
              </>
            )}

            {/* Contractor: project amount */}
            {type === 'contractor' && (
              <>
                <div>
                  <label style={S.label}>Project Amount (₹) *</label>
                  <input type="number" style={S.input} required min="0" value={form.project_amount||''} onChange={e => setForm({...form, project_amount:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Advance Paid (₹)</label>
                  <input type="number" style={S.input} min="0" value={form.advance_paid||'0'} onChange={e => setForm({...form, advance_paid:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Deductions (₹)</label>
                  <input type="number" style={S.input} min="0" value={form.deductions||'0'} onChange={e => setForm({...form, deductions:e.target.value})}/>
                </div>
              </>
            )}

            {/* Labourer: wage info (or auto-calc) */}
            {type === 'labourer' && (
              <>
                <div>
                  <label style={S.label}>Daily Wage (₹)</label>
                  <input type="number" style={S.input} min="0" value={form.daily_wage||'0'} onChange={e => setForm({...form, daily_wage:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>OT Rate (₹/hr)</label>
                  <input type="number" style={S.input} min="0" value={form.overtime_rate||'0'} onChange={e => setForm({...form, overtime_rate:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Deductions (₹)</label>
                  <input type="number" style={S.input} min="0" value={form.deductions||'0'} onChange={e => setForm({...form, deductions:e.target.value})}/>
                </div>
              </>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="submit" style={S.btn}>Save Payroll</button>
            <button type="button" style={S.btnGhost} onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
