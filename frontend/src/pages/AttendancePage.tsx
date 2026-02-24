// frontend/src/pages/AttendancePage.tsx — REPLACE ENTIRE FILE
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { extractResults } from '../utils/pagination';
import { CheckCircle, XCircle, Clock, Eye, Plus, X, AlertCircle, UserPlus } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

const STATUS_OPTS = ['PRESENT','ABSENT','HALF_DAY','LEAVE'];
const STATUS_COLOR: Record<string,string> = {
  PRESENT:'#4ade80', ABSENT:'#f87171', HALF_DAY:'#facc15', LEAVE:'#60a5fa'
};
const STATUS_ICON: Record<string,any> = {
  PRESENT: CheckCircle, ABSENT: XCircle, HALF_DAY: Clock, LEAVE: Eye
};

const S = {
  card:   { background:'#0d0d0d', border:'1px solid #1a1a1a', borderRadius:8, padding:20 } as React.CSSProperties,
  label:  { display:'block', fontSize:9, letterSpacing:4, textTransform:'uppercase' as const, color:'#71717a', fontWeight:700, marginBottom:8 },
  input:  { width:'100%', background:'#141414', border:'1px solid #1e1e1e', color:'white', padding:'10px 12px', fontSize:13, outline:'none', boxSizing:'border-box' as const, borderRadius:4 },
  select: { width:'100%', background:'#141414', border:'1px solid #1e1e1e', color:'white', padding:'10px 12px', fontSize:13, outline:'none', boxSizing:'border-box' as const, borderRadius:4 },
  btn:    { display:'inline-flex', alignItems:'center', gap:8, background:'#dc2626', color:'white', border:'none', padding:'10px 20px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase' as const, cursor:'pointer', borderRadius:6 },
  btnSm:  { display:'inline-flex', alignItems:'center', gap:6, background:'#141414', color:'#a1a1aa', border:'1px solid #1e1e1e', padding:'6px 12px', fontFamily:"'Barlow Condensed',sans-serif", fontSize:10, fontWeight:700, letterSpacing:2, textTransform:'uppercase' as const, cursor:'pointer', borderRadius:5, transition:'all 0.15s' },
  overlay:{ position:'fixed' as const, inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:  { background:'#0d0d0d', border:'1px solid #1e1e1e', borderTop:'3px solid #dc2626', width:'100%', maxWidth:540, maxHeight:'90vh', overflowY:'auto' as const, padding:28, borderRadius:8 },
};

export default function AttendancePage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'HR')         return <HRMonitorView />;
  if (role === 'SUPERVISOR') return <SupervisorAttendanceView />;
  if (role === 'CONTRACTOR') return <ContractorAttendanceView />;
  return <div style={{ color:'#52525b', padding:40 }}>Attendance not available for your role.</div>;
}

// ── HR — Monitoring only ────────────────────────────────────────
function HRMonitorView() {
  const [date, setDate]   = useState(today);
  const [data, setData]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/attendance/monitor/?date=${date}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ animation:'pageIn 0.4s ease' }}>
      <style>{`@keyframes pageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:28, paddingBottom:20, borderBottom:'1px solid #161616', position:'relative' }}>
        <div style={{ position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626', borderRadius:2 }}/>
        <div style={{ fontSize:10, letterSpacing:4, textTransform:'uppercase', color:'#71717a', marginBottom:4, fontWeight:600 }}>Monitoring</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:40, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1 }}>Attendance Overview</div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div>
          <label style={S.label}>Date</label>
          <input type="date" style={{ ...S.input, width:180 }} value={date} onChange={e => setDate(e.target.value)}/>
        </div>
        <button style={{ ...S.btn, marginTop:20 }} onClick={load}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ color:'#52525b', padding:40 }}>Loading...</div>
      ) : data.length === 0 ? (
        <div style={{ ...S.card, color:'#3f3f46', textAlign:'center', padding:60 }}>No active projects found.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {data.map((d: any) => (
            <div key={d.project_id} style={{ ...S.card, borderLeft:'3px solid #dc2626' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:20, fontWeight:800, color:'white', textTransform:'uppercase' }}>{d.project_name}</div>
                  <div style={{ fontSize:12, color:'#71717a', marginTop:2 }}>Supervisor: <span style={{ color:'#a1a1aa' }}>{d.supervisor_name}</span></div>
                </div>
                <div style={{ fontSize:11, color:'#52525b' }}>{d.date}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <MonitorCard label="Contractor Attendance" marked={d.contractors_marked} total={d.contractors_total} color="#facc15"/>
                <MonitorCard label="Labourer Attendance"   marked={d.labourers_marked}  total={d.labourers_total}  color="#4ade80"/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonitorCard({ label, marked, total, color }: any) {
  const pct = total > 0 ? Math.round((marked / total) * 100) : 0;
  const ok  = marked >= total && total > 0;
  return (
    <div style={{ background:'#111', border:`1px solid ${ok ? color + '30' : '#1a1a1a'}`, borderRadius:6, padding:16 }}>
      <div style={{ fontSize:10, letterSpacing:3, textTransform:'uppercase', color:'#52525b', fontWeight:700, marginBottom:8 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:8 }}>
        <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:28, fontWeight:900, color }}>{marked}</span>
        <span style={{ fontSize:13, color:'#3f3f46' }}>/ {total}</span>
        <span style={{ fontSize:11, color: ok ? '#4ade80' : '#f87171', marginLeft:'auto', fontWeight:700 }}>{pct}%</span>
      </div>
      <div style={{ height:4, background:'#1a1a1a', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: ok ? '#4ade80' : color, borderRadius:2, transition:'width 0.5s ease' }}/>
      </div>
    </div>
  );
}

// ── SUPERVISOR — marks Contractor attendance ────────────────────
function SupervisorAttendanceView() {
  const [projects, setProjects]     = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate]             = useState(today);
  const [contractors, setContractors] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<number, string>>({});
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');

  useEffect(() => {
    apiClient.get('/attendance/projects/').then(r => {
      const p = extractResults<any>(r.data);
      setProjects(p);
      if (p.length > 0) setSelectedProject(String(p[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    // Load contractors for this project's supervisor
    apiClient.get(`/workforce/contractors/?supervisor_project=${selectedProject}`).then(r => {
      const list = extractResults<any>(r.data);
      setContractors(list);
      // Initialise attendance map
      const init: Record<number,string> = {};
      list.forEach((c: any) => { init[c.id] = 'PRESENT'; });
      setAttendance(init);
    }).catch(() => {
      // fallback: load all contractors
      apiClient.get('/workforce/contractors/').then(r => {
        const list = extractResults<any>(r.data);
        setContractors(list);
        const init: Record<number,string> = {};
        list.forEach((c: any) => { init[c.id] = 'PRESENT'; });
        setAttendance(init);
      });
    });
    // Pre-fill existing records
    apiClient.get(`/attendance/contractor-attendance/?project=${selectedProject}&date=${date}`).then(r => {
      const records = extractResults<any>(r.data);
      const map: Record<number,string> = {};
      records.forEach((rec: any) => { map[rec.contractor] = rec.status; });
      setAttendance(prev => ({ ...prev, ...map }));
    });
  }, [selectedProject, date]);

  const handleSave = async () => {
    if (!selectedProject) return;
    setSaving(true); setMsg('');
    try {
      const records = contractors.map(c => ({
        contractor: c.id,
        project:    parseInt(selectedProject),
        date,
        status:     attendance[c.id] || 'PRESENT',
      }));
      await apiClient.post('/attendance/contractor-attendance/bulk/', { records });
      setMsg('Attendance saved successfully!');
    } catch (e) {
      setMsg('Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ animation:'pageIn 0.4s ease' }}>
      <div style={{ marginBottom:28, paddingBottom:20, borderBottom:'1px solid #161616', position:'relative' }}>
        <div style={{ position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626', borderRadius:2 }}/>
        <div style={{ fontSize:10, letterSpacing:4, textTransform:'uppercase', color:'#71717a', marginBottom:4, fontWeight:600 }}>Supervisor Portal</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:40, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1 }}>Contractor Attendance</div>
      </div>

      {/* Filters */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:12, marginBottom:24, alignItems:'end' }}>
        <div>
          <label style={S.label}>Project</label>
          <select style={S.select} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Date</label>
          <input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)}/>
        </div>
        <button style={S.btn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.includes('success') ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)', borderLeft:`3px solid ${msg.includes('success') ? '#16a34a' : '#dc2626'}`, padding:'10px 16px', marginBottom:20, fontSize:13, color: msg.includes('success') ? '#4ade80' : '#fca5a5', borderRadius:4 }}>
          {msg}
        </div>
      )}

      {/* Attendance table */}
      {contractors.length === 0 ? (
        <div style={{ ...S.card, color:'#3f3f46', textAlign:'center', padding:60 }}>No contractors assigned to your projects.</div>
      ) : (
        <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'40px 1fr repeat(4,1fr)', padding:'10px 16px', background:'#0a0a0a', borderBottom:'1px solid #1a1a1a', gap:8 }}>
            {['#','Contractor',...STATUS_OPTS].map(h => (
              <span key={h} style={{ fontSize:9, letterSpacing:3, textTransform:'uppercase', color:'#3f3f46', fontWeight:700 }}>{h}</span>
            ))}
          </div>
          {contractors.map((c, i) => (
            <div key={c.id} style={{ display:'grid', gridTemplateColumns:'40px 1fr repeat(4,1fr)', padding:'14px 16px', background: i%2===0 ? '#0d0d0d':'#0a0a0a', borderBottom:'1px solid #111', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'#3f3f46', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700 }}>{String(i+1).padStart(2,'0')}</span>
              <div>
                <div style={{ fontWeight:600, color:'white', fontSize:13 }}>{c.user_detail?.first_name} {c.user_detail?.last_name || c.user_detail?.username}</div>
                <div style={{ fontSize:11, color:'#52525b' }}>{c.company_name || ''}</div>
              </div>
              {STATUS_OPTS.map(s => {
                const active = attendance[c.id] === s;
                return (
                  <button key={s} onClick={() => setAttendance(prev => ({ ...prev, [c.id]: s }))}
                    style={{ padding:'7px 0', background: active ? `${STATUS_COLOR[s]}15` : '#141414', border:`1px solid ${active ? STATUS_COLOR[s] : '#1e1e1e'}`, borderRadius:5, color: active ? STATUS_COLOR[s] : '#52525b', fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', cursor:'pointer', transition:'all 0.15s' }}>
                    {s.replace('_',' ')}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── CONTRACTOR — marks Labourer attendance (fixed + temp) ───────
function ContractorAttendanceView() {
  const [projects, setProjects]     = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate]             = useState(today);
  const [labourers, setLabourers]   = useState<any[]>([]);
  const [tempLabourers, setTempLabourers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, {status:string; ot:string}>>({});
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');
  const [showTempForm, setShowTempForm] = useState(false);
  const [tempForm, setTempForm]     = useState({ name:'', phone:'', skill:'', daily_wage:'0' });
  const [myContractorId, setMyContractorId] = useState<number|null>(null);

  useEffect(() => {
    apiClient.get('/attendance/projects/').then(r => {
      const p = extractResults<any>(r.data);
      setProjects(p);
      if (p.length > 0) setSelectedProject(String(p[0].id));
    });
    apiClient.get('/workforce/contractors/?me=true').then(r => {
      const list = extractResults<any>(r.data);
      if (list.length > 0) setMyContractorId(list[0].id);
    }).catch(() => {
      apiClient.get('/workforce/contractors/').then(r => {
        const list = extractResults<any>(r.data);
        if (list.length > 0) setMyContractorId(list[0].id);
      });
    });
  }, []);

  const loadLabourers = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const [labRes, tempRes, attRes] = await Promise.all([
        apiClient.get('/workforce/labourers/'),
        apiClient.get('/attendance/temp-labourers/'),
        apiClient.get(`/attendance/labourer-attendance/?project=${selectedProject}&date=${date}`),
      ]);
      const labs = extractResults<any>(labRes.data);
      const temps = extractResults<any>(tempRes.data);
      const atts  = extractResults<any>(attRes.data);

      setLabourers(labs);
      setTempLabourers(temps);

      const init: Record<string,{status:string;ot:string}> = {};
      labs.forEach((l: any)  => { init[`l-${l.id}`]  = { status:'PRESENT', ot:'0' }; });
      temps.forEach((t: any) => { init[`t-${t.id}`]  = { status:'PRESENT', ot:'0' }; });
      // Override with existing
      atts.forEach((a: any) => {
        const key = a.labourer ? `l-${a.labourer}` : `t-${a.temp_labourer}`;
        init[key] = { status: a.status, ot: String(a.overtime_hours) };
      });
      setAttendance(init);
    } catch (e) { console.error(e); }
  }, [selectedProject, date]);

  useEffect(() => { loadLabourers(); }, [loadLabourers]);

  const setAtt = (key: string, field: 'status'|'ot', value: string) => {
    setAttendance(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const handleSave = async () => {
    if (!selectedProject) return;
    setSaving(true); setMsg('');
    try {
      const records: any[] = [
        ...labourers.map(l => ({
          labourer: l.id,
          project: parseInt(selectedProject),
          date,
          status: attendance[`l-${l.id}`]?.status || 'PRESENT',
          overtime_hours: parseFloat(attendance[`l-${l.id}`]?.ot || '0'),
        })),
        ...tempLabourers.map(t => ({
          temp_labourer: t.id,
          project: parseInt(selectedProject),
          date,
          status: attendance[`t-${t.id}`]?.status || 'PRESENT',
          overtime_hours: parseFloat(attendance[`t-${t.id}`]?.ot || '0'),
        })),
      ];
      await apiClient.post('/attendance/labourer-attendance/bulk/', { records });
      setMsg('Attendance saved!');
    } catch (e) { setMsg('Save failed.'); }
    finally { setSaving(false); }
  };

  const handleAddTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myContractorId) return;
    try {
      await apiClient.post('/attendance/temp-labourers/', { ...tempForm, contractor: myContractorId, daily_wage: parseFloat(tempForm.daily_wage) });
      setShowTempForm(false);
      setTempForm({ name:'', phone:'', skill:'', daily_wage:'0' });
      loadLabourers();
    } catch (e) { alert('Failed to add temp labourer.'); }
  };

  const AttRow = ({ label, keyPrefix, id, isTemp }: any) => (
    <div style={{ display:'grid', gridTemplateColumns:'40px 1.5fr repeat(4,1fr) 80px', padding:'13px 16px', background:'#0d0d0d', borderBottom:'1px solid #111', alignItems:'center', gap:8 }}>
      <span style={{ fontSize:10, color:'#3f3f46', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700 }}>{isTemp ? 'T' : 'F'}</span>
      <div>
        <div style={{ fontWeight:600, color:'white', fontSize:13 }}>{label}</div>
        {isTemp && <span style={{ fontSize:9, color:'#facc15', background:'rgba(202,138,4,0.1)', padding:'1px 6px', borderRadius:8, letterSpacing:1, fontWeight:700 }}>TEMP</span>}
      </div>
      {STATUS_OPTS.map(s => {
        const k = `${keyPrefix}-${id}`;
        const active = attendance[k]?.status === s;
        return (
          <button key={s} onClick={() => setAtt(k,'status',s)}
            style={{ padding:'6px 0', background: active ? `${STATUS_COLOR[s]}15` : '#141414', border:`1px solid ${active ? STATUS_COLOR[s] : '#1e1e1e'}`, borderRadius:5, color: active ? STATUS_COLOR[s] : '#52525b', fontSize:9, fontWeight:700, letterSpacing:1, textTransform:'uppercase', cursor:'pointer', transition:'all 0.15s' }}>
            {s.replace('_',' ')}
          </button>
        );
      })}
      <input type="number" min="0" step="0.5" placeholder="OT hrs"
        style={{ ...S.input, padding:'6px 8px', fontSize:12 }}
        value={attendance[`${keyPrefix}-${id}`]?.ot || '0'}
        onChange={e => setAtt(`${keyPrefix}-${id}`,'ot',e.target.value)}/>
    </div>
  );

  return (
    <div style={{ animation:'pageIn 0.4s ease' }}>
      <div style={{ marginBottom:28, paddingBottom:20, borderBottom:'1px solid #161616', position:'relative' }}>
        <div style={{ position:'absolute', bottom:-1, left:0, width:64, height:3, background:'#dc2626', borderRadius:2 }}/>
        <div style={{ fontSize:10, letterSpacing:4, textTransform:'uppercase', color:'#71717a', marginBottom:4, fontWeight:600 }}>Contractor Portal</div>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:40, fontWeight:900, color:'white', textTransform:'uppercase', letterSpacing:-1 }}>Labourer Attendance</div>
      </div>

      {/* Filters + actions */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto auto', gap:12, marginBottom:24, alignItems:'end' }}>
        <div>
          <label style={S.label}>Project</label>
          <select style={S.select} value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>Date</label>
          <input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)}/>
        </div>
        <button style={{ ...S.btn, background:'#1e3a1e', border:'1px solid #16a34a', color:'#4ade80' }} onClick={() => setShowTempForm(true)}>
          <UserPlus size={13}/> Add Temp
        </button>
        <button style={S.btn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {msg && (
        <div style={{ background: msg.includes('success') || msg === 'Attendance saved!' ? 'rgba(22,163,74,0.07)' : 'rgba(220,38,38,0.07)', borderLeft:`3px solid ${msg.includes('saved') ? '#16a34a' : '#dc2626'}`, padding:'10px 16px', marginBottom:20, fontSize:13, color: msg.includes('saved') ? '#4ade80' : '#fca5a5', borderRadius:4 }}>
          {msg}
        </div>
      )}

      {/* Table */}
      <div style={{ ...S.card, padding:0, overflow:'hidden' }}>
        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'40px 1.5fr repeat(4,1fr) 80px', padding:'10px 16px', background:'#0a0a0a', borderBottom:'1px solid #1a1a1a', gap:8 }}>
          <span style={{ fontSize:9, letterSpacing:3, color:'#3f3f46', fontWeight:700 }}>TYPE</span>
          <span style={{ fontSize:9, letterSpacing:3, color:'#3f3f46', fontWeight:700 }}>NAME</span>
          {STATUS_OPTS.map(s => <span key={s} style={{ fontSize:9, letterSpacing:2, color:`${STATUS_COLOR[s]}80`, fontWeight:700, textTransform:'uppercase' }}>{s.replace('_',' ')}</span>)}
          <span style={{ fontSize:9, letterSpacing:3, color:'#3f3f46', fontWeight:700 }}>OT HRS</span>
        </div>

        {/* Fixed labourers */}
        {labourers.length > 0 && (
          <>
            <div style={{ padding:'8px 16px', background:'rgba(74,222,128,0.04)', borderBottom:'1px solid #111' }}>
              <span style={{ fontSize:9, color:'#4ade80', letterSpacing:3, fontWeight:700, textTransform:'uppercase' }}>Fixed Labourers ({labourers.length})</span>
            </div>
            {labourers.map((l: any) => (
              <AttRow key={l.id} label={`${l.user_detail?.first_name||''} ${l.user_detail?.last_name||l.user_detail?.username}`} keyPrefix="l" id={l.id} isTemp={false}/>
            ))}
          </>
        )}

        {/* Temp labourers */}
        {tempLabourers.length > 0 && (
          <>
            <div style={{ padding:'8px 16px', background:'rgba(202,138,4,0.04)', borderBottom:'1px solid #111' }}>
              <span style={{ fontSize:9, color:'#facc15', letterSpacing:3, fontWeight:700, textTransform:'uppercase' }}>Temporary Labourers ({tempLabourers.length})</span>
            </div>
            {tempLabourers.map((t: any) => (
              <AttRow key={t.id} label={t.name} keyPrefix="t" id={t.id} isTemp={true}/>
            ))}
          </>
        )}

        {labourers.length === 0 && tempLabourers.length === 0 && (
          <div style={{ padding:60, textAlign:'center', color:'#3f3f46' }}>No labourers found. Add temporary labourers using the button above.</div>
        )}
      </div>

      {/* Add Temp Modal */}
      {showTempForm && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, paddingBottom:16, borderBottom:'1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize:9, color:'#facc15', letterSpacing:4, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Temporary Labour</div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:24, fontWeight:900, color:'white', textTransform:'uppercase' }}>Add Temp Labourer</div>
              </div>
              <button onClick={() => setShowTempForm(false)} style={{ background:'#1a1a1a', border:'1px solid #222', color:'#a1a1aa', width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', borderRadius:5 }}>
                <X size={14}/>
              </button>
            </div>
            <form onSubmit={handleAddTemp}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div>
                  <label style={S.label}>Full Name *</label>
                  <input style={S.input} type="text" required value={tempForm.name} onChange={e => setTempForm({...tempForm, name:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Phone</label>
                  <input style={S.input} type="text" value={tempForm.phone} onChange={e => setTempForm({...tempForm, phone:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Skill</label>
                  <input style={S.input} type="text" placeholder="e.g. Mason" value={tempForm.skill} onChange={e => setTempForm({...tempForm, skill:e.target.value})}/>
                </div>
                <div>
                  <label style={S.label}>Daily Wage (₹)</label>
                  <input style={S.input} type="number" min="0" step="0.01" value={tempForm.daily_wage} onChange={e => setTempForm({...tempForm, daily_wage:e.target.value})}/>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" style={S.btn}>Add Labourer</button>
                <button type="button" onClick={() => setShowTempForm(false)} style={{ ...S.btn, background:'transparent', border:'1px solid #1e1e1e', color:'#a1a1aa' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
